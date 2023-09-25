import { v4 as uuid } from 'uuid';
import { AppServiceClient } from './clients/azure/appServiceClient';
import { OrganizationsClient } from './clients/devOps/organizationsClient';
import { AzureDevOpsHelper } from './helper/devOps/azureDevOpsHelper';
import { Messages } from '../messages';
import { ServiceConnectionHelper } from './helper/devOps/serviceConnectionHelper';
import { SourceOptions, RepositoryProvider, QuickPickItemWithData, GitRepositoryDetails, PipelineTemplate, AzureDevOpsDetails, ValidatedBuild, ValidatedProject, WebAppKind, TargetResourceType, ValidatedSite } from './model/models';
import * as constants from './resources/constants';
import { TracePoints } from './resources/tracePoints';
import { getAzureAccountExtensionApi, getGitExtensionApi } from '../extensionApis';
import { telemetryHelper } from '../helpers/telemetryHelper';
import { TelemetryKeys } from '../helpers/telemetryKeys';
import * as utils from 'util';
import * as vscode from 'vscode';
import { URI, Utils } from 'vscode-uri';
import * as templateHelper from './helper/templateHelper';
import { getAvailableFileName } from './helper/commonHelper';
import { showInputBox, showQuickPick } from './helper/controlProvider';
import { Build } from 'azure-devops-node-api/interfaces/BuildInterfaces';
import { AzureAccount, AzureSession } from '../typings/azure-account.api';
import { Repository } from '../typings/git';
import { AzureSiteDetails } from './model/models';
import { GraphHelper } from './helper/graphHelper';
import { TeamProject } from 'azure-devops-node-api/interfaces/CoreInterfaces';
import { WebApi, getBearerHandler } from 'azure-devops-node-api';
import { GitHubProvider } from './helper/gitHubHelper';
import { WebSiteManagementModels } from '@azure/arm-appservice';

const Layer: string = 'configure';

export async function configurePipeline(): Promise<void> {
    const azureAccount = await getAzureAccountExtensionApi();
    if (!(await azureAccount.waitForLogin())) {
        telemetryHelper.setTelemetry(TelemetryKeys.AzureLoginRequired, 'true');

        const signIn = await vscode.window.showInformationMessage(Messages.azureLoginRequired, Messages.signInLabel);
        if (signIn?.toLowerCase() === Messages.signInLabel.toLowerCase()) {
            await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: Messages.waitForAzureSignIn },
                async () => {
                    await vscode.commands.executeCommand("azure-account.login");
                });
        } else {
            throw new Error(Messages.azureLoginRequired);
        }
    }

    const gitExtension = await getGitExtensionApi();
    const workspaceUri = await getWorkspace();
    const repo = gitExtension.getRepository(workspaceUri);
    if (repo === null) {
        throw new Error(Messages.notAGitRepository);
    }

    // Refresh the repo status so that we have accurate info.
    await repo.status();

    const configurer = new PipelineConfigurer(workspaceUri, repo, azureAccount);
    await configurer.configure();
}

async function getWorkspace(): Promise<URI> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders !== undefined) {
        telemetryHelper.setTelemetry(TelemetryKeys.SourceRepoLocation, SourceOptions.CurrentWorkspace);

        if (workspaceFolders.length === 1) {
            telemetryHelper.setTelemetry(TelemetryKeys.MultipleWorkspaceFolders, 'false');
            return workspaceFolders[0].uri;
        } else {
            telemetryHelper.setTelemetry(TelemetryKeys.MultipleWorkspaceFolders, 'true');

            const workspaceFolderOptions: QuickPickItemWithData<vscode.WorkspaceFolder>[] =
                workspaceFolders.map(folder => ({ label: folder.name, data: folder }));
            const selectedWorkspaceFolder = await showQuickPick(
                constants.SelectFromMultipleWorkSpace,
                workspaceFolderOptions,
                { placeHolder: Messages.selectWorkspaceFolder });
            if (selectedWorkspaceFolder === undefined) {
                throw new Error(Messages.noWorkSpaceSelectedError);
            }

            return selectedWorkspaceFolder.data.uri;
        }
    } else {
        telemetryHelper.setTelemetry(TelemetryKeys.SourceRepoLocation, SourceOptions.BrowseLocalMachine);
        const selectedFolders = await vscode.window.showOpenDialog({
            openLabel: Messages.selectFolderLabel,
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
        });

        if (selectedFolders !== undefined) {
            return selectedFolders[0];
        } else {
            throw new Error(Messages.noWorkSpaceSelectedError);
        }
    }
}

class PipelineConfigurer {
    private azureDevOpsClient: WebApi | undefined;
    private uniqueResourceNameSuffix: string;

    public constructor(
        private workspaceUri: URI,
        private repo: Repository,
        private azureAccount: AzureAccount) {
        this.uniqueResourceNameSuffix = uuid().substring(0, 5);
    }

    public async configure(): Promise<void> {
        telemetryHelper.setCurrentStep('GetAllRequiredInputs');
        let repoDetails: GitRepositoryDetails;
        try {
            repoDetails = await this.getGitDetailsFromRepository();
        } catch (error) {
            telemetryHelper.logError(Layer, TracePoints.GetSourceRepositoryDetailsFailed, error as Error);
            return;
        }

        const template = await this.getSelectedPipeline();

        const adoDetails = await this.getAzureDevOpsDetails(repoDetails);
        if (adoDetails === undefined) {
            return;
        }

        let azureSiteDetails: AzureSiteDetails | undefined;
        if (template.target.type !== TargetResourceType.None) {
            azureSiteDetails = await this.getAzureResourceDetails(adoDetails.session, template.target.kind);
            if (azureSiteDetails === undefined) {
                return;
            }
        }

        telemetryHelper.setCurrentStep('CreatePreRequisites');
        const serviceConnectionHelper = new ServiceConnectionHelper(
            adoDetails.organizationName,
            adoDetails.project.name,
            adoDetails.adoClient);

        let repositoryProperties: { [key: string]: string } | undefined;
        if (repoDetails.repositoryProvider === RepositoryProvider.Github) {
            const gitHubServiceConnection = await this.createGitHubServiceConnection(
                serviceConnectionHelper,
                repoDetails,
                this.uniqueResourceNameSuffix);
            if (gitHubServiceConnection === undefined) {
                return;
            }

            repositoryProperties = {
                apiUrl: `https://api.github.com/repos/${repoDetails.ownerName}/${repoDetails.repositoryName}`,
                branchesUrl: `https://api.github.com/repos/${repoDetails.ownerName}/${repoDetails.repositoryName}/branches`,
                cloneUrl: repoDetails.remoteUrl,
                connectedServiceId: gitHubServiceConnection,
                defaultBranch: repoDetails.branch,
                fullName: repoDetails.repositoryName,
                refsUrl: `https://api.github.com/repos/${repoDetails.ownerName}/${repoDetails.repositoryName}/git/refs`
            };
        }

        let azureServiceConnection: string | undefined;
        if (azureSiteDetails !== undefined) {
            azureServiceConnection = await this.createAzureServiceConnection(
                serviceConnectionHelper,
                adoDetails,
                azureSiteDetails,
                this.uniqueResourceNameSuffix);
            if (azureServiceConnection === undefined) {
                return;
            }
        }

        telemetryHelper.setCurrentStep('CheckInPipeline');
        const pipelineFileName = await this.checkInPipelineFileToRepository(repoDetails, template, azureSiteDetails, azureServiceConnection);
        if (pipelineFileName === undefined) {
            return;
        }

        telemetryHelper.setCurrentStep('CreateAndRunPipeline');
        const queuedPipeline = await this.createAndRunPipeline(repoDetails, adoDetails, template, azureSiteDetails, repositoryProperties, pipelineFileName);
        if (queuedPipeline === undefined) {
            return;
        }

        telemetryHelper.setCurrentStep('PostPipelineCreation');
        if (azureSiteDetails !== undefined) {
            // This step should be determined by the resoruce target provider (azure app service, function app, aks) type and pipelineProvider(azure pipeline vs github)
            await this.updateScmType(queuedPipeline, adoDetails, azureSiteDetails);
        }

        telemetryHelper.setCurrentStep('DisplayCreatedPipeline');
        vscode.window.showInformationMessage(Messages.pipelineSetupSuccessfully, Messages.browsePipeline)
            .then(action => {
                if (action?.toLowerCase() === Messages.browsePipeline.toLowerCase()) {
                    telemetryHelper.setTelemetry(TelemetryKeys.BrowsePipelineClicked, 'true');
                    vscode.env.openExternal(URI.parse(queuedPipeline._links.web.href));
                }
            });
    }

    private async getGitDetailsFromRepository(): Promise<GitRepositoryDetails> {
        const { HEAD } = this.repo.state;
        if (!HEAD) {
            throw new Error(Messages.branchHeadMissing);
        }

        let { name, remote } = HEAD;

        if (!name) {
            throw new Error(Messages.branchNameMissing);
        }

        if (!remote) {
            // Remote tracking branch is not set, see if we have any remotes we can use.
            const remotes = this.repo.state.remotes;
            if (remotes.length === 0) {
                throw new Error(Messages.branchRemoteMissing);
            } else if (remotes.length === 1) {
                remote = remotes[0].name;
            } else {
                // Show an option to user to select remote to be configured
                const selectedRemote = await showQuickPick(
                    constants.SelectRemoteForRepo,
                    remotes.map(remote => ({ label: remote.name })),
                    { placeHolder: Messages.selectRemoteForBranch });

                if (selectedRemote === undefined) {
                    throw new Error(Messages.noBranchRemoteSelectedError);
                }
                remote = selectedRemote.label;
            }
        }

        let repoDetails: GitRepositoryDetails;
        let remoteUrl = this.repo.state.remotes.find(remoteObj => remoteObj.name === remote)?.fetchUrl;
        if (remoteUrl !== undefined) {
            if (AzureDevOpsHelper.isAzureReposUrl(remoteUrl)) {
                remoteUrl = AzureDevOpsHelper.getFormattedRemoteUrl(remoteUrl);
                const { organizationName, projectName, repositoryName } = AzureDevOpsHelper.getRepositoryDetailsFromRemoteUrl(remoteUrl);
                repoDetails = {
                    repositoryProvider: RepositoryProvider.AzureRepos,
                    organizationName,
                    projectName,
                    repositoryName,
                    remoteName: remote,
                    remoteUrl,
                    branch: name,
                    commitId: ""
                };
            } else if (GitHubProvider.isGitHubUrl(remoteUrl)) {
                remoteUrl = GitHubProvider.getFormattedRemoteUrl(remoteUrl);
                const { ownerName, repositoryName } = GitHubProvider.getRepositoryDetailsFromRemoteUrl(remoteUrl);
                repoDetails = {
                    repositoryProvider: RepositoryProvider.Github,
                    ownerName,
                    repositoryName,
                    remoteName: remote,
                    remoteUrl,
                    branch: name,
                    commitId: ""
                };
            } else {
                throw new Error(Messages.cannotIdentifyRespositoryDetails);
            }
        } else {
            throw new Error(Messages.remoteRepositoryNotConfigured);
        }

        telemetryHelper.setTelemetry(TelemetryKeys.RepoProvider, repoDetails.repositoryProvider);

        return repoDetails;
    }

    private async getSelectedPipeline(): Promise<PipelineTemplate> {
        const appropriateTemplates: PipelineTemplate[] = await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: Messages.analyzingRepo },
            () => templateHelper.analyzeRepoAndListAppropriatePipeline(this.workspaceUri)
        );

        // TODO: Get applicable pipelines for the repo type and azure target type if target already selected
        const template = await showQuickPick(
            constants.SelectPipelineTemplate,
            appropriateTemplates.map((template) => { return { label: template.label, data: template }; }),
            { placeHolder: Messages.selectPipelineTemplate },
            TelemetryKeys.PipelineTempateListCount);

        if (template === undefined) {
            throw new Error(Messages.noPipelineTemplateSelectedError);
        }

        telemetryHelper.setTelemetry(TelemetryKeys.ChosenTemplate, template.data.label);
        return template.data;
    }

    private async getAzureDevOpsDetails(repoDetails: GitRepositoryDetails): Promise<AzureDevOpsDetails | undefined> {
        if (repoDetails.repositoryProvider === RepositoryProvider.AzureRepos) {
            for (const session of this.azureAccount.sessions) {
                const organizationsClient = new OrganizationsClient(session.credentials2);
                const organizations = await organizationsClient.listOrganizations();
                if (organizations.find(org => org.accountName.toLowerCase() === repoDetails.organizationName.toLowerCase())) {
                    const adoClient = await this.getAzureDevOpsClient(repoDetails.organizationName, session);
                    const coreApi = await adoClient.getCoreApi();
                    const project = await coreApi.getProject(repoDetails.projectName);
                    if (this.isValidProject(project)) {
                        return {
                            session,
                            adoClient,
                            organizationName: repoDetails.organizationName,
                            project,
                        };
                    }
                }
            }

            vscode.window.showWarningMessage("You are not signed in to the Azure DevOps organization that contains this repository.");
            return undefined;
        } else {
            // Lazily construct list of organizations so that we can immediately show the quick pick,
            // then fill in the choices as they come in.
            const organizationAndSessionsPromise = new Promise<
                QuickPickItemWithData<AzureSession | undefined>[]
            >(async resolve => {
                const organizationAndSessions: QuickPickItemWithData<AzureSession | undefined>[] = [];

                for (const session of this.azureAccount.sessions) {
                    const organizationsClient = new OrganizationsClient(session.credentials2);
                    const organizations = await organizationsClient.listOrganizations();
                    organizationAndSessions.push(...organizations.map(organization => ({
                        label: organization.accountName,
                        data: session,
                    })));
                }

                organizationAndSessions.push({
                    // This is safe because ADO orgs can't have spaces in them.
                    label: "Create new Azure DevOps organization...",
                    data: undefined,
                })

                resolve(organizationAndSessions);
            });

            const result = await showQuickPick(
                'organization',
                organizationAndSessionsPromise, {
                    placeHolder: "Select the Azure DevOps organization to create this pipeline in",
            });
            if (result === undefined) {
                return undefined;
            }

            const { label: organizationName, data: session } = result;
            if (session === undefined) {
                // Special flag telling us to create a new organization.
                await vscode.env.openExternal(vscode.Uri.parse("https://dev.azure.com/"));
                return undefined;
            }

            const adoClient = await this.getAzureDevOpsClient(organizationName, session);

            // Ditto for the projects.
            const projectsPromise = new Promise<
                QuickPickItemWithData<ValidatedProject>[]
            >(async resolve => {
                const coreApi = await adoClient.getCoreApi();
                const projects = await coreApi.getProjects();
                const validatedProjects = projects.filter(this.isValidProject).map(project => { return { label: project.name, data: project }; });
                resolve(validatedProjects);
            });

            // FIXME: It _is_ possible for an organization to have no projects.
            // We need to guard against this and create a project for them.
            const selectedProject = await showQuickPick(
                constants.SelectProject,
                projectsPromise,
                { placeHolder: Messages.selectProject },
                TelemetryKeys.ProjectListCount);
            if (selectedProject === undefined) {
                return undefined;
            }

            const project = selectedProject.data;
            return {
                session,
                adoClient,
                organizationName,
                project,
            };
        }
    }

    private async getAzureResourceDetails(session: AzureSession, kind: WebAppKind): Promise<AzureSiteDetails | undefined> {
        // show available subscriptions and get the chosen one
        const azureAccountApi = await getAzureAccountExtensionApi();
        const subscriptionList = azureAccountApi.filters
            .filter(subscriptionObject => subscriptionObject.session === session)
            .map(subscriptionObject => {
                return {
                    label: subscriptionObject.subscription.displayName ?? "Unknown subscription",
                    data: subscriptionObject,
                    description: subscriptionObject.subscription.subscriptionId ?? "Unknown subscription"
                };
        });

        const selectedSubscription =
            await showQuickPick(constants.SelectSubscription, subscriptionList, { placeHolder: Messages.selectSubscription });
        if (selectedSubscription === undefined) {
            return undefined;
        }

        const { subscriptionId } = selectedSubscription.data.subscription;
        if (subscriptionId === undefined) {
            vscode.window.showErrorMessage("Unable to get ID for subscription, please file a bug at https://github.com/microsoft/azure-pipelines-vscode/issues/new");
            return undefined;
        }

        // show available resources and get the chosen one
        const appServiceClient = new AppServiceClient(session.credentials2, session.tenantId, session.environment.portalUrl, subscriptionId);


        const sites = await appServiceClient.getAppServices(kind);
        const items = sites
                .filter(this.isValidSite)
                .map(site => { return { label: site.name, data: site }; });
        const selectAppText = this.getSelectAppText(kind);
        const placeHolder = this.getPlaceholderText(kind);

        const selectedResource = await showQuickPick(
            selectAppText,
            items,
            { placeHolder },
            TelemetryKeys.WebAppListCount);
        if (selectedResource === undefined) {
            return undefined;
        }

        return {
            appServiceClient,
            site: selectedResource.data,
            subscriptionId,
        };
    }

    private async createGitHubServiceConnection(
        serviceConnectionHelper: ServiceConnectionHelper,
        repoDetails: GitRepositoryDetails,
        uniqueResourceNameSuffix: string,
    ): Promise<string | undefined> {
        return vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: Messages.creatingGitHubServiceConnection
            },
            async () => {
                const token = await telemetryHelper.executeFunctionWithTimeTelemetry(
                    async () => showInputBox(
                        constants.GitHubPat, {
                            placeHolder: Messages.enterGitHubPat,
                            prompt: Messages.githubPatHelpMessage,
                            validateInput: input => input.length === 0 ? Messages.gitHubPatErrorMessage : null
                        }
                    ), TelemetryKeys.GitHubPatDuration
                );

                if (token === undefined) {
                    return undefined;
                }

                const serviceConnectionName = `${repoDetails.repositoryName}-${uniqueResourceNameSuffix}`;
                try {
                    return serviceConnectionHelper.createGitHubServiceConnection(serviceConnectionName, token);
                } catch (error) {
                    telemetryHelper.logError(Layer, TracePoints.GitHubServiceConnectionError, error as Error);
                    throw error;
                }
            });
    }

    private async createAzureServiceConnection(
        serviceConnectionHelper: ServiceConnectionHelper,
        adoDetails: AzureDevOpsDetails,
        azureSiteDetails: AzureSiteDetails,
        uniqueResourceNameSuffix: string,
    ): Promise<string | undefined> {
        // TODO: show notification while setup is being done.
        // ?? should SPN created be scoped to resource group of target azure resource.
        return vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: utils.format(Messages.creatingAzureServiceConnection, azureSiteDetails.subscriptionId)
            },
            async () => {
                const scope = azureSiteDetails.site.id;
                try {
                    const aadAppName = GraphHelper.generateAadApplicationName(adoDetails.organizationName, adoDetails.project.name);
                    const aadApp = await GraphHelper.createSpnAndAssignRole(adoDetails.session, aadAppName, scope);
                    const serviceConnectionName = `${azureSiteDetails.site.name}-${uniqueResourceNameSuffix}`;
                    return serviceConnectionHelper.createAzureServiceConnection(
                        serviceConnectionName,
                        adoDetails.session.tenantId,
                        azureSiteDetails.subscriptionId,
                        scope,
                        aadApp);
                }
                catch (error) {
                    telemetryHelper.logError(Layer, TracePoints.AzureServiceConnectionCreateFailure, error as Error);
                    throw error;
                }
            });
    }

    private async updateScmType(
        queuedPipeline: ValidatedBuild,
        adoDetails: AzureDevOpsDetails,
        azureSiteDetails: AzureSiteDetails,
    ): Promise<void> {
        try {
            // update SCM type
            azureSiteDetails.appServiceClient.updateScmType(azureSiteDetails.site);

            const buildDefinitionUrl = AzureDevOpsHelper.getOldFormatBuildDefinitionUrl(adoDetails.organizationName, adoDetails.project.id, queuedPipeline.definition.id);
            const buildUrl = AzureDevOpsHelper.getOldFormatBuildUrl(adoDetails.organizationName, adoDetails.project.id, queuedPipeline.id);

            const locationsApi = await adoDetails.adoClient.getLocationsApi();
            const { instanceId } = await locationsApi.getConnectionData();
            if (instanceId === undefined) {
                vscode.window.showErrorMessage("Unable to determine the organization ID, please file a bug at https://github.com/microsoft/azure-pipelines-vscode/issues/new");
                return;
            }

            // update metadata of app service to store information about the pipeline deploying to web app.
            const metadata = await azureSiteDetails.appServiceClient.getAppServiceMetadata(azureSiteDetails.site);
            metadata.properties = {
                ...metadata.properties,
                VSTSRM_ProjectId: adoDetails.project.id,
                VSTSRM_AccountId: instanceId,
                VSTSRM_BuildDefinitionId: queuedPipeline.definition.id.toString(),
                VSTSRM_BuildDefinitionWebAccessUrl: buildDefinitionUrl,
                VSTSRM_ConfiguredCDEndPoint: '',
                VSTSRM_ReleaseDefinitionId: '',
            };

            azureSiteDetails.appServiceClient.updateAppServiceMetadata(azureSiteDetails.site, metadata);

            // send a deployment log with information about the setup pipeline and links.
            azureSiteDetails.appServiceClient.publishDeploymentToAppService(
                azureSiteDetails.site,
                buildDefinitionUrl,
                buildDefinitionUrl,
                buildUrl);
        } catch (error) {
            telemetryHelper.logError(Layer, TracePoints.PostDeploymentActionFailed, error as Error);
        }
    }

    private async checkInPipelineFileToRepository(
        repoDetails: GitRepositoryDetails,
        template: PipelineTemplate,
        azureSiteDetails: AzureSiteDetails | undefined,
        azureServiceConnection: string | undefined,
    ): Promise<string | undefined> {
        let pipelineFileName: string;
        try {
            pipelineFileName = await getAvailableFileName("azure-pipelines.yml", this.workspaceUri);
            const fileUri = Utils.joinPath(this.workspaceUri, pipelineFileName);
            const content = await templateHelper.renderContent(template.path, repoDetails.branch, azureSiteDetails?.site.name, azureServiceConnection);
            await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content));
            await vscode.window.showTextDocument(fileUri);
        } catch (error) {
            telemetryHelper.logError(Layer, TracePoints.AddingContentToPipelineFileFailed, error as Error);
            return undefined;
        }

        try {
            const commitOrDiscard = await vscode.window.showInformationMessage(utils.format(Messages.modifyAndCommitFile, Messages.commitAndPush, repoDetails.branch, repoDetails.remoteName), Messages.commitAndPush, Messages.discardPipeline);
            if (commitOrDiscard?.toLowerCase() === Messages.commitAndPush.toLowerCase()) {
                return vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: Messages.configuringPipelineAndDeployment }, async () => {
                    try {
                        const branch = this.repo.state.HEAD;
                        if (branch === undefined) {
                            vscode.window.showWarningMessage("Please checkout a branch to commit the pipeline file to.");
                            return undefined;
                        }

                        if (branch.behind !== undefined && branch.behind > 0) {
                            vscode.window.showWarningMessage("Please pull the latest changes before committing the pipeline file.");
                            return undefined;
                        }

                        await this.repo.add([Utils.joinPath(this.workspaceUri, pipelineFileName).fsPath]);
                        await this.repo.commit(Messages.addYmlFile); // TODO: Only commit the YAML file. Need to file a feature request on VS Code for this.
                        await this.repo.push(repoDetails.remoteName);

                        const { commit } = branch;
                        if (commit === undefined) {
                            vscode.window.showErrorMessage("Unable to get commit after pushing pipeline, please file a bug at https://github.com/microsoft/azure-pipelines-vscode/issues/new");
                            return undefined;
                        }

                        return commit;
                    } catch (error) {
                        telemetryHelper.logError(Layer, TracePoints.CheckInPipelineFailure, error as Error);
                        vscode.window.showErrorMessage(utils.format(Messages.commitFailedErrorMessage, (error as Error).message));
                        return undefined;
                    }
                });
            } else {
                telemetryHelper.setTelemetry(TelemetryKeys.PipelineDiscarded, 'true');
            }
        } catch (error) {
            telemetryHelper.logError(Layer, TracePoints.PipelineFileCheckInFailed, error as Error);
        }

        return undefined;
    }

    private async createAndRunPipeline(
        repoDetails: GitRepositoryDetails,
        adoDetails: AzureDevOpsDetails,
        template: PipelineTemplate,
        azureSiteDetails: AzureSiteDetails | undefined,
        repositoryProperties: { [key: string]: string } | undefined,
        pipelineFileName: string,
    ): Promise<ValidatedBuild | undefined> {
        return vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: Messages.configuringPipelineAndDeployment }, async () => {
            try {
                const taskAgentApi = await adoDetails.adoClient.getTaskAgentApi();
                const queues = await taskAgentApi.getAgentQueuesByNames([constants.HostedVS2017QueueName], adoDetails.project.name);
                if (queues.length === 0) {
                    throw new Error(utils.format(Messages.noAgentQueueFound, constants.HostedVS2017QueueName));
                }

                const pipelineName = `${(azureSiteDetails ? azureSiteDetails.site.name : template.label)}-${this.uniqueResourceNameSuffix}`;
                const definitionPayload = AzureDevOpsHelper.getBuildDefinitionPayload(
                    pipelineName,
                    queues[0],
                    repoDetails,
                    adoDetails,
                    repositoryProperties,
                    pipelineFileName
                );
                const buildApi = await adoDetails.adoClient.getBuildApi();
                const definition = await buildApi.createDefinition(definitionPayload, adoDetails.project.name);
                const build = await buildApi.queueBuild({
                    definition: definition,
                    project: adoDetails.project,
                    sourceBranch: repoDetails.branch,
                    sourceVersion: repoDetails.commitId
                }, adoDetails.project.name);

                if (!this.isValidBuild(build)) {
                    return undefined;
                }

                return build;
            }
            catch (error) {
                telemetryHelper.logError(Layer, TracePoints.CreateAndQueuePipelineFailed, error as Error);
                return undefined;
            }
        });
    }

    private getSelectAppText(appKind: WebAppKind) : string {
        switch(appKind) {
            case WebAppKind.FunctionApp:
            case WebAppKind.FunctionAppLinux:
                return constants.SelectFunctionApp;
            case WebAppKind.WindowsApp:
            case WebAppKind.LinuxApp:
            default:
                return constants.SelectWebApp;
        }
    }

    private getPlaceholderText(appKind: WebAppKind) : string {
        switch(appKind) {
            case WebAppKind.FunctionApp:
            case WebAppKind.FunctionAppLinux:
                return Messages.selectFunctionApp;
            case WebAppKind.WindowsApp:
            case WebAppKind.LinuxApp:
            default:
                return Messages.selectWebApp;
        }
    }

    private async getAzureDevOpsClient(organization: string, session: AzureSession): Promise<WebApi> {
        if (this.azureDevOpsClient) {
            return this.azureDevOpsClient;
        }

        const { accessToken } = await session.credentials2.getToken();
        const authHandler = getBearerHandler(accessToken);
        this.azureDevOpsClient = new WebApi(`https://dev.azure.com/${organization}`, authHandler);
        return this.azureDevOpsClient;
    }

    private isValidProject(project: TeamProject): project is ValidatedProject {
        if (project.name === undefined || project.id === undefined) {
            vscode.window.showErrorMessage("Unable to get name or ID for project, please file a bug at https://github.com/microsoft/azure-pipelines-vscode/issues/new");
            return false;
        }

        return true;
    }

    private isValidSite(resource: WebSiteManagementModels.Site): resource is ValidatedSite {
        if (resource.name === undefined || resource.id === undefined) {
            vscode.window.showErrorMessage("Unable to get name or ID for resource, please file a bug at https://github.com/microsoft/azure-pipelines-vscode/issues/new");
            return false;
        }

        return true;
    }

    private isValidBuild(build: Build): build is ValidatedBuild {
        if (build.definition === undefined || build.definition.id === undefined || build.id === undefined) {
            vscode.window.showErrorMessage("Unable to get definition or ID for build, please file a bug at https://github.com/microsoft/azure-pipelines-vscode/issues/new");
            return false;
        }

        return true;
    }
}
