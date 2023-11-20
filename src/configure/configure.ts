import { v4 as uuid } from 'uuid';
import { AppServiceClient } from './clients/azure/appServiceClient';
import { OrganizationsClient } from './clients/devOps/organizationsClient';
import * as AzureDevOpsHelper from './helper/devOps/azureDevOpsHelper';
import * as Messages from '../messages';
import { ServiceConnectionHelper } from './helper/devOps/serviceConnectionHelper';
import { SourceOptions, RepositoryProvider, QuickPickItemWithData, GitRepositoryDetails, PipelineTemplate, AzureDevOpsDetails, ValidatedBuild, ValidatedProject, WebAppKind, TargetResourceType, ValidatedSite } from './model/models';
import * as constants from './resources/constants';
import * as TracePoints from './resources/tracePoints';
import { getAzureAccountExtensionApi, getGitExtensionApi } from '../extensionApis';
import { telemetryHelper } from '../helpers/telemetryHelper';
import * as TelemetryKeys from '../helpers/telemetryKeys';
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
import * as GitHubHelper from './helper/gitHubHelper';
import { WebSiteManagementModels } from '@azure/arm-appservice';

const Layer: string = 'configure';

export async function configurePipeline(): Promise<void> {
    const azureAccount = await getAzureAccountExtensionApi();
    if (!(await azureAccount.waitForLogin())) {
        telemetryHelper.setTelemetry(TelemetryKeys.AzureLoginRequired, 'true');

        const signIn = await vscode.window.showInformationMessage(Messages.azureLoginRequired, Messages.signInLabel);
        if (signIn?.toLowerCase() === Messages.signInLabel.toLowerCase()) {
            await vscode.commands.executeCommand("azure-account.login");
        } else {
            void vscode.window.showWarningMessage(Messages.azureLoginRequired);
            return;
        }
    }

    const gitExtension = await getGitExtensionApi();
    const workspaceUri = await getWorkspace();
    if (workspaceUri === undefined) {
        return;
    }

    const repo = gitExtension.getRepository(workspaceUri);
    if (repo === null) {
        void vscode.window.showWarningMessage(Messages.notAGitRepository);
        return;
    }

    // Refresh the repo status so that we have accurate info.
    await repo.status();

    const configurer = new PipelineConfigurer(workspaceUri, repo, azureAccount);
    await configurer.configure();
}

async function getWorkspace(): Promise<URI | undefined> {
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
                return undefined;
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

        if (selectedFolders === undefined) {
            return undefined;
        }

        return selectedFolders[0];
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
        const repoDetails = await this.getGitDetailsFromRepository();
        if (repoDetails === undefined) {
            return;
        }

        const template = await this.getSelectedPipeline();
        if (template === undefined) {
            return;
        }

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
        const serviceConnectionHelper = new ServiceConnectionHelper(adoDetails.adoClient, adoDetails.project.name);

        let repositoryProperties: Record<string, string> | undefined;
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
                fullName: `${repoDetails.ownerName}/${repoDetails.repositoryName}`,
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
        const pipelineFileName = await this.createPipelineFile(
            template,
            repoDetails.branch,
            azureSiteDetails,
            azureServiceConnection);
        if (pipelineFileName === undefined) {
            return;
        }

        const commit = await this.checkInPipelineFileToRepository(pipelineFileName, repoDetails);
        if (commit === undefined) {
            return;
        }

        telemetryHelper.setCurrentStep('CreateAndRunPipeline');
        const queuedPipeline = await this.createAndRunPipeline(
            repoDetails,
            adoDetails,
            template,
            azureSiteDetails,
            repositoryProperties,
            pipelineFileName,
            commit);
        if (queuedPipeline === undefined) {
            return;
        }

        telemetryHelper.setCurrentStep('PostPipelineCreation');
        if (azureSiteDetails !== undefined) {
            // This step should be determined by the
            // - resource target provider type (azure app service, function app, aks)
            // - pipeline provider (azure pipeline vs github)
            await this.updateScmType(queuedPipeline, adoDetails, azureSiteDetails);
        }

        telemetryHelper.setCurrentStep('DisplayCreatedPipeline');
        void vscode.window.showInformationMessage(Messages.pipelineSetupSuccessfully, Messages.browsePipeline)
            .then(action => {
                if (action === Messages.browsePipeline) {
                    telemetryHelper.setTelemetry(TelemetryKeys.BrowsePipelineClicked, 'true');
                    // _links is weakly typed and it's not worth the effort to verify.
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
                    void vscode.env.openExternal(URI.parse(queuedPipeline._links.web.href));
                }
            });
    }

    private async getGitDetailsFromRepository(): Promise<GitRepositoryDetails | undefined> {
        const { HEAD } = this.repo.state;
        if (!HEAD) {
            void vscode.window.showWarningMessage(Messages.branchHeadMissing);
            return undefined;
        }

        const { name } = HEAD;
        let { remote } = HEAD;
        if (!name) {
            void vscode.window.showWarningMessage(Messages.branchNameMissing);
            return undefined;
        }

        if (!remote) {
            // Remote tracking branch is not set, see if we have any remotes we can use.
            const remotes = this.repo.state.remotes;
            if (remotes.length === 0) {
                void vscode.window.showWarningMessage(Messages.branchRemoteMissing);
                return undefined;
            } else if (remotes.length === 1) {
                remote = remotes[0].name;
            } else {
                // Show an option to user to select remote to be configured
                const selectedRemote = await showQuickPick(
                    constants.SelectRemoteForRepo,
                    remotes.map(remote => ({ label: remote.name })),
                    { placeHolder: Messages.selectRemoteForBranch });
                if (selectedRemote === undefined) {
                    return undefined;
                }

                remote = selectedRemote.label;
            }
        }

        let repoDetails: GitRepositoryDetails;
        let remoteUrl = this.repo.state.remotes.find(remoteObj => remoteObj.name === remote)?.fetchUrl;
        if (remoteUrl !== undefined) {
            if (AzureDevOpsHelper.isAzureReposUrl(remoteUrl)) {
                remoteUrl = AzureDevOpsHelper.getFormattedRemoteUrl(remoteUrl);
                const {
                    organizationName,
                    projectName,
                    repositoryName
                } = AzureDevOpsHelper.getRepositoryDetailsFromRemoteUrl(remoteUrl);
                repoDetails = {
                    repositoryProvider: RepositoryProvider.AzureRepos,
                    organizationName,
                    projectName,
                    repositoryName,
                    remoteName: remote,
                    remoteUrl,
                    branch: name,
                };
            } else if (GitHubHelper.isGitHubUrl(remoteUrl)) {
                remoteUrl = GitHubHelper.getFormattedRemoteUrl(remoteUrl);
                const { ownerName, repositoryName } = GitHubHelper.getRepositoryDetailsFromRemoteUrl(remoteUrl);
                repoDetails = {
                    repositoryProvider: RepositoryProvider.Github,
                    ownerName,
                    repositoryName,
                    remoteName: remote,
                    remoteUrl,
                    branch: name,
                };
            } else {
                void vscode.window.showWarningMessage(Messages.cannotIdentifyRepositoryDetails);
                return undefined;
            }
        } else {
            void vscode.window.showWarningMessage(Messages.remoteRepositoryNotConfigured);
            return undefined;
        }

        telemetryHelper.setTelemetry(TelemetryKeys.RepoProvider, repoDetails.repositoryProvider);

        return repoDetails;
    }

    private async getSelectedPipeline(): Promise<PipelineTemplate | undefined> {
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
            return undefined;
        }

        telemetryHelper.setTelemetry(TelemetryKeys.ChosenTemplate, template.data.label);
        return template.data;
    }

    private async getAzureDevOpsDetails(repoDetails: GitRepositoryDetails): Promise<AzureDevOpsDetails | undefined> {
        if (repoDetails.repositoryProvider === RepositoryProvider.AzureRepos) {
            for (const session of this.azureAccount.filters.map(({ session }) => session)) {
                const organizationsClient = new OrganizationsClient(session.credentials2);
                const organizations = await organizationsClient.listOrganizations();
                if (organizations.find(org =>
                    org.accountName.toLowerCase() === repoDetails.organizationName.toLowerCase())) {
                    const adoClient = await this.getAzureDevOpsClient(repoDetails.organizationName, session);
                    const coreApi = await adoClient.getCoreApi();
                    const project = await coreApi.getProject(repoDetails.projectName);
                    if (isValidProject(project)) {
                        return {
                            session,
                            adoClient,
                            organizationName: repoDetails.organizationName,
                            project,
                        };
                    }
                }
            }

            void vscode.window.showWarningMessage("You are not signed in to the Azure DevOps organization that contains this repository.");
            return undefined;
        } else {
            // Lazily construct list of organizations so that we can immediately show the quick pick,
            // then fill in the choices as they come in.
            const getOrganizationsAndSessions = async (): Promise<QuickPickItemWithData<AzureSession | undefined>[]> => {
                return [
                    ...(await Promise.all(this.azureAccount.filters.map(async ({ session }) => {
                        const organizationsClient = new OrganizationsClient(session.credentials2);
                        const organizations = await organizationsClient.listOrganizations();
                        return organizations.map(organization => ({
                            label: organization.accountName,
                            data: session,
                        }));
                    }))).flat(),
                    {
                        // This is safe because ADO orgs can't have spaces in them.
                        label: "Create new Azure DevOps organization...",
                        data: undefined,
                    }
                ];
            };

            const result = await showQuickPick(
                'organization',
                getOrganizationsAndSessions(), {
                    placeHolder: "Select the Azure DevOps organization to create this pipeline in",
            }, TelemetryKeys.OrganizationListCount);
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
            const getProjects = async (): Promise<QuickPickItemWithData<ValidatedProject | undefined>[]> => {
                const coreApi = await adoClient.getCoreApi();
                const projects = await coreApi.getProjects();
                return [
                    ...projects
                        .filter(isValidProject)
                        .map(project => { return { label: project.name, data: project }; }),
                    {
                        // This is safe because ADO projects can't end with periods.
                        label: "Create new project...",
                        data: undefined,
                    }
                ];
            };

            const selectedProject = await showQuickPick(
                constants.SelectProject,
                getProjects(),
                { placeHolder: Messages.selectProject },
                TelemetryKeys.ProjectListCount);
            if (selectedProject === undefined) {
                return undefined;
            }

            const project = selectedProject.data;
            if (project === undefined) {
                // Special flag telling us to create a new project.
                await vscode.env.openExternal(vscode.Uri.parse(`https://dev.azure.com/${organizationName}`));
                return undefined;
            }

            return {
                session,
                adoClient,
                organizationName,
                project,
            };
        }
    }

    private async getAzureResourceDetails(
        session: AzureSession,
        kind: WebAppKind): Promise<AzureSiteDetails | undefined> {
        // show available subscriptions and get the chosen one
        const subscriptionList = this.azureAccount.filters
            .filter(filter =>
                // session is actually an AzureSessionInternal which makes a naive === check fail.
                filter.session.environment === session.environment &&
                filter.session.tenantId === session.tenantId &&
                filter.session.userId === session.userId)
            .map(subscriptionObject => {
                return {
                    label: subscriptionObject.subscription.displayName ?? "Unknown subscription",
                    data: subscriptionObject,
                    description: subscriptionObject.subscription.subscriptionId ?? undefined
                };
        });

        const selectedSubscription = await showQuickPick(
            constants.SelectSubscription,
            subscriptionList,
            { placeHolder: Messages.selectSubscription });
        if (selectedSubscription === undefined) {
            return undefined;
        }

        const { subscriptionId } = selectedSubscription.data.subscription;
        if (subscriptionId === undefined) {
            void vscode.window.showErrorMessage("Unable to get ID for subscription, please file a bug at https://github.com/microsoft/azure-pipelines-vscode/issues/new");
            return undefined;
        }

        // show available resources and get the chosen one
        const appServiceClient = new AppServiceClient(session.credentials2, subscriptionId);

        // TODO: Refactor kind so we don't need three kind.includes

        const sites = await appServiceClient.getAppServices(kind);
        const items: QuickPickItemWithData<ValidatedSite | undefined>[] = sites
            .filter(isValidSite)
            .map(site => { return { label: site.name, data: site }; });
        const appType = kind.includes("functionapp") ? "Function App" : "Web App";

        items.push({
            // This is safe because apps can't have spaces in them.
            label: `Create new ${appType.toLowerCase()}...`,
            data: undefined,
        });

        const selectedResource = await showQuickPick(
            kind.includes("functionapp") ? "selectFunctionApp" : "selectWebApp",
            items,
            { placeHolder: `Select ${appType}` },
            TelemetryKeys.WebAppListCount);
        if (selectedResource === undefined) {
            return undefined;
        }

        const { data: site } = selectedResource;
        if (site === undefined) {
            // Special flag telling us to create a new app.
            // URL format is documented at
            // https://github.com/Azure/portaldocs/blob/main/portal-sdk/generated/portalfx-links.md#create-blades
            const packageId = kind.includes("functionapp") ? "Microsoft.FunctionApp" : "Microsoft.WebSite";
            await vscode.env.openExternal(vscode.Uri.parse(`https://portal.azure.com/#create/${packageId}`));
            return undefined;
        }

        return {
            appServiceClient,
            site,
            subscriptionId,
        };
    }

    private async createGitHubServiceConnection(
        serviceConnectionHelper: ServiceConnectionHelper,
        repoDetails: GitRepositoryDetails,
        uniqueResourceNameSuffix: string,
    ): Promise<string | undefined> {
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

        return vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: Messages.creatingGitHubServiceConnection
            },
            async () => {
                const serviceConnectionName = `${repoDetails.repositoryName}-github-${uniqueResourceNameSuffix}`;
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
        // TODO: should SPN created be scoped to resource group of target azure resource.
        return vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: utils.format(Messages.creatingAzureServiceConnection, azureSiteDetails.subscriptionId)
            },
            async () => {
                const scope = azureSiteDetails.site.id;
                try {
                    const aadAppName = GraphHelper.generateAadApplicationName(
                        adoDetails.organizationName,
                        adoDetails.project.name);
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

    private async createPipelineFile(
        template: PipelineTemplate,
        branch: string,
        azureSiteDetails: AzureSiteDetails | undefined,
        azureServiceConnection: string | undefined,
    ): Promise<string | undefined> {
        try {
            const pipelineFileName = await getAvailableFileName("azure-pipelines.yml", this.workspaceUri);
            const fileUri = Utils.joinPath(this.workspaceUri, pipelineFileName);
            const content = await templateHelper.renderContent(
                template.path,
                branch,
                azureSiteDetails?.site.name,
                azureServiceConnection);
            await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content));
            await vscode.window.showTextDocument(fileUri);
            return pipelineFileName;
        } catch (error) {
            telemetryHelper.logError(Layer, TracePoints.AddingContentToPipelineFileFailed, error as Error);
            throw error;
        }
    }

    private async checkInPipelineFileToRepository(
        pipelineFileName: string,
        repoDetails: GitRepositoryDetails,
    ): Promise<string | undefined> {
        try {
            const commitOrDiscard = await vscode.window.showInformationMessage(
                utils.format(
                    Messages.modifyAndCommitFile,
                    Messages.commitAndPush,
                    repoDetails.branch,
                    repoDetails.remoteName),
                Messages.commitAndPush,
                Messages.discardPipeline);
            if (commitOrDiscard?.toLowerCase() === Messages.commitAndPush.toLowerCase()) {
                return vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: Messages.pushingPipelineFile
                }, async () => {
                    try {
                        // TODO: Only commit the YAML file. Need to file a feature request on VS Code for this.
                        await this.repo.add([Utils.joinPath(this.workspaceUri, pipelineFileName).fsPath]);
                        await this.repo.commit(Messages.addYmlFile);
                        await this.repo.push(repoDetails.remoteName);

                        const commit = this.repo.state.HEAD?.commit;
                        if (commit === undefined) {
                            void vscode.window.showErrorMessage("Unable to get commit after pushing pipeline, please file a bug at https://github.com/microsoft/azure-pipelines-vscode/issues/new");
                            return undefined;
                        }

                        return commit;
                    } catch (error) {
                        telemetryHelper.logError(Layer, TracePoints.CheckInPipelineFailure, error as Error);
                        void vscode.window.showErrorMessage(
                            utils.format(Messages.commitFailedErrorMessage, (error as Error).message));
                        return undefined;
                    }
                });
            } else {
                telemetryHelper.setTelemetry(TelemetryKeys.PipelineDiscarded, 'true');
                return undefined;
            }
        } catch (error) {
            telemetryHelper.logError(Layer, TracePoints.PipelineFileCheckInFailed, error as Error);
            throw error;
        }
    }

    private async createAndRunPipeline(
        repoDetails: GitRepositoryDetails,
        adoDetails: AzureDevOpsDetails,
        template: PipelineTemplate,
        azureSiteDetails: AzureSiteDetails | undefined,
        repositoryProperties: Record<string, string> | undefined,
        pipelineFileName: string,
        commit: string,
    ): Promise<ValidatedBuild | undefined> {
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: Messages.configuringPipelineAndDeployment
        }, async () => {
            try {
                const taskAgentApi = await adoDetails.adoClient.getTaskAgentApi();
                const queues = await taskAgentApi.getAgentQueuesByNames(
                    [constants.HostedVS2017QueueName],
                    adoDetails.project.name);
                if (queues.length === 0) {
                    void vscode.window.showErrorMessage(
                        utils.format(Messages.noAgentQueueFound, constants.HostedVS2017QueueName));
                    return undefined;
                }

                const pipelineName = `${(azureSiteDetails?.site.name ?? template.label)}-${this.uniqueResourceNameSuffix}`;
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
                    definition,
                    project: adoDetails.project,
                    sourceBranch: repoDetails.branch,
                    sourceVersion: commit
                }, adoDetails.project.name);

                if (!isValidBuild(build)) {
                    return undefined;
                }

                return build;
            }
            catch (error) {
                telemetryHelper.logError(Layer, TracePoints.CreateAndQueuePipelineFailed, error as Error);
                throw error;
            }
        });
    }

    private async updateScmType(
        queuedPipeline: ValidatedBuild,
        adoDetails: AzureDevOpsDetails,
        azureSiteDetails: AzureSiteDetails,
    ): Promise<void> {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: Messages.runningPostDeploymentActions
        }, async () => {
            try {
                // update SCM type
                await azureSiteDetails.appServiceClient.updateScmType(azureSiteDetails.site);

                const buildDefinitionUrl = AzureDevOpsHelper.getOldFormatBuildDefinitionUrl(
                    adoDetails.organizationName,
                    adoDetails.project.id,
                    queuedPipeline.definition.id);
                const buildUrl = AzureDevOpsHelper.getOldFormatBuildUrl(
                    adoDetails.organizationName,
                    adoDetails.project.id,
                    queuedPipeline.id);

                const locationsApi = await adoDetails.adoClient.getLocationsApi();
                const { instanceId } = await locationsApi.getConnectionData();
                if (instanceId === undefined) {
                    void vscode.window.showErrorMessage("Unable to determine the organization ID, please file a bug at https://github.com/microsoft/azure-pipelines-vscode/issues/new");
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

                await azureSiteDetails.appServiceClient.updateAppServiceMetadata(azureSiteDetails.site, metadata);

                // send a deployment log with information about the setup pipeline and links.
                await azureSiteDetails.appServiceClient.publishDeploymentToAppService(
                    azureSiteDetails.site,
                    buildDefinitionUrl,
                    buildDefinitionUrl,
                    buildUrl);
            } catch (error) {
                telemetryHelper.logError(Layer, TracePoints.PostDeploymentActionFailed, error as Error);
                throw error;
            }
        });
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
}

function isValidProject(project: TeamProject): project is ValidatedProject {
    if (project.name === undefined || project.id === undefined) {
        void vscode.window.showErrorMessage("Unable to get name or ID for project, please file a bug at https://github.com/microsoft/azure-pipelines-vscode/issues/new");
        return false;
    }

    return true;
}

function isValidSite(resource: WebSiteManagementModels.Site): resource is ValidatedSite {
    if (resource.name === undefined || resource.id === undefined) {
        void vscode.window.showErrorMessage("Unable to get name or ID for resource, please file a bug at https://github.com/microsoft/azure-pipelines-vscode/issues/new");
        return false;
    }

    return true;
}

function isValidBuild(build: Build): build is ValidatedBuild {
    if (build.definition === undefined || build.definition.id === undefined || build.id === undefined) {
        void vscode.window.showErrorMessage("Unable to get definition or ID for build, please file a bug at https://github.com/microsoft/azure-pipelines-vscode/issues/new");
        return false;
    }

    return true;
}
