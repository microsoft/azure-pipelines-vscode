import { v4 as uuid } from 'uuid';
import { AppServiceClient } from './clients/azure/appServiceClient';
import { OrganizationsClient } from './clients/devOps/organizationsClient';
import { AzureDevOpsHelper } from './helper/devOps/azureDevOpsHelper';
import { OperationsClient } from './clients/devOps/operationsClient';
import { ResourceManagementModels } from '@azure/arm-resources';
import { GraphHelper } from './helper/graphHelper';
import { Messages } from '../messages';
import { ServiceConnectionHelper } from './helper/devOps/serviceConnectionHelper';
import { SourceOptions, RepositoryProvider, WizardInputs, WebAppKind, PipelineTemplate, QuickPickItemWithData, GitRepositoryParameters, TargetResourceType } from './model/models';
import * as constants from './resources/constants';
import { TracePoints } from './resources/tracePoints';
import { getAzureAccountExtensionApi, getGitExtensionApi } from '../extensionApis';
import { telemetryHelper } from '../helpers/telemetryHelper';
import { TelemetryKeys } from '../helpers/telemetryKeys';
import * as utils from 'util';
import * as vscode from 'vscode';
import { URI, Utils } from 'vscode-uri';
import * as azdev from 'azure-devops-node-api';
import * as templateHelper from './helper/templateHelper';
import { getAvailableFileName } from './helper/commonHelper';
import { showQuickPick, showInputBox } from './helper/controlProvider';
import { GitHubProvider } from './helper/gitHubHelper';
import { getSubscriptionSession } from './helper/azureSessionHelper';
import { UserCancelledError } from './helper/userCancelledError';
import { Build } from 'azure-devops-node-api/interfaces/BuildInterfaces';
import { ProjectVisibility } from 'azure-devops-node-api/interfaces/CoreInterfaces';
import { AzureAccount, AzureSubscription } from '../typings/azure-account.api';
import { Repository } from '../typings/git';

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
    const workspaceFolders = vscode.workspace?.workspaceFolders;
    if (workspaceFolders?.length > 0) {
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

        if (selectedFolders?.length > 0) {
            return selectedFolders[0];
        } else {
            throw new Error(Messages.noWorkSpaceSelectedError);
        }
    }
}

class PipelineConfigurer {
    private inputs = new WizardInputs();
    private azureDevOpsClient: azdev.WebApi;
    private organizationsClient: OrganizationsClient;
    private serviceConnectionHelper: ServiceConnectionHelper;
    private appServiceClient: AppServiceClient;
    private uniqueResourceNameSuffix: string;

    public constructor(
        private workspaceUri: URI,
        private repo: Repository,
        private azureAccount: AzureAccount) {
        this.uniqueResourceNameSuffix = uuid().substr(0, 5);
    }

    public async configure() {
        telemetryHelper.setCurrentStep('GetAllRequiredInputs');
        await this.getAllRequiredInputs();

        telemetryHelper.setCurrentStep('CreatePreRequisites');
        await this.createPreRequisites();

        telemetryHelper.setCurrentStep('CheckInPipeline');
        await this.checkInPipelineFileToRepository();

        telemetryHelper.setCurrentStep('CreateAndRunPipeline');
        const queuedPipeline = await this.createAndRunPipeline();

        telemetryHelper.setCurrentStep('PostPipelineCreation');
        // This step should be determined by the resoruce target provider (azure app service, function app, aks) type and pipelineProvider(azure pipeline vs github)
        this.updateScmType(queuedPipeline);

        telemetryHelper.setCurrentStep('DisplayCreatedPipeline');
        vscode.window.showInformationMessage(Messages.pipelineSetupSuccessfully, Messages.browsePipeline)
            .then((action: string) => {
                if (action && action.toLowerCase() === Messages.browsePipeline.toLowerCase()) {
                    telemetryHelper.setTelemetry(TelemetryKeys.BrowsePipelineClicked, 'true');
                    vscode.env.openExternal(URI.parse(queuedPipeline._links.web.href));
                }
            });
    }

    private async getAllRequiredInputs() {
        try {
            await this.getGitDetailsFromRepository();
        } catch (error) {
            telemetryHelper.logError(Layer, TracePoints.GetSourceRepositoryDetailsFailed, error);
            throw error;
        }

        await this.getSelectedPipeline();

        if (this.inputs.sourceRepository.repositoryProvider === RepositoryProvider.Github) {
            this.inputs.githubPatToken = await this.getGitHubPatToken();
        }

        if (!this.inputs.targetResource.resource) {
            await this.getAzureResourceDetails();
        }

        await this.getAzureDevOpsDetails();
    }

    private async createPreRequisites(): Promise<void> {
        if (this.inputs.isNewOrganization) {
            this.inputs.project = {
                id: "",
                name: AzureDevOpsHelper.generateDevOpsProjectName(this.inputs.sourceRepository.repositoryName)
            };
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: Messages.creatingAzureDevOpsOrganization
                },
                async () => {
                    try {
                        await this.organizationsClient.createOrganization(this.inputs.organizationName);
                        this.organizationsClient.listOrganizations(true);

                        const azureDevOpsClient = await this.getAzureDevOpsClient();
                        const coreApi = await azureDevOpsClient.getCoreApi();
                        const operation = await coreApi.queueCreateProject({
                            name: this.inputs.project.name,
                            visibility: ProjectVisibility.Private,
                            capabilities: {
                                versionControl: {
                                    sourceControlType: "Git"
                                },
                                processTemplate: {
                                    templateTypeId: "adcc42ab-9882-485e-a3ed-7678f01f66bc" // Agile
                                }
                            },
                        });

                        const operationsClient = new OperationsClient(this.inputs.organizationName, azureDevOpsClient);
                        await operationsClient.waitForOperationSuccess(operation.id);
                        this.inputs.project = await coreApi.getProject(this.inputs.project.name);
                    } catch (error) {
                        telemetryHelper.logError(Layer, TracePoints.CreateNewOrganizationAndProjectFailure, error);
                        throw error;
                    }
                });
        }

        if (this.inputs.sourceRepository.repositoryProvider === RepositoryProvider.Github) {
            await this.createGithubServiceConnection();
        }

        if(this.inputs.pipelineParameters.pipelineTemplate.targetType != TargetResourceType.None) {
            await this.createAzureRMServiceConnection();
        }
    }

    private async getGitDetailsFromRepository(): Promise<void> {
        let { name, remote } = this.repo.state.HEAD;

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
                remote = selectedRemote.label;
            }
        }

        this.inputs.sourceRepository = await this.getGitRepositoryParameters(name, remote);

        // set telemetry
        telemetryHelper.setTelemetry(TelemetryKeys.RepoProvider, this.inputs.sourceRepository.repositoryProvider);
    }

    private async getGitRepositoryParameters(branch: string, remoteName: string): Promise<GitRepositoryParameters> {
        let remoteUrl = this.repo.state.remotes.find(remote => remote.name === remoteName).fetchUrl;
        if (remoteUrl) {
            if (AzureDevOpsHelper.isAzureReposUrl(remoteUrl)) {
                remoteUrl = AzureDevOpsHelper.getFormattedRemoteUrl(remoteUrl);
                return <GitRepositoryParameters>{
                    repositoryProvider: RepositoryProvider.AzureRepos,
                    repositoryId: "",
                    repositoryName: AzureDevOpsHelper.getRepositoryDetailsFromRemoteUrl(remoteUrl).repositoryName,
                    remoteName: remoteName,
                    remoteUrl: remoteUrl,
                    branch: branch,
                    commitId: ""
                };
            }
            else if (GitHubProvider.isGitHubUrl(remoteUrl)) {
                remoteUrl = GitHubProvider.getFormattedRemoteUrl(remoteUrl);
                let repoId = GitHubProvider.getRepositoryIdFromUrl(remoteUrl);
                return <GitRepositoryParameters>{
                    repositoryProvider: RepositoryProvider.Github,
                    repositoryId: repoId,
                    repositoryName: repoId,
                    remoteName: remoteName,
                    remoteUrl: remoteUrl,
                    branch: branch,
                    commitId: ""
                };
            }
            else {
                throw new Error(Messages.cannotIdentifyRespositoryDetails);
            }
        }
        else {
            throw new Error(Messages.remoteRepositoryNotConfigured);
        }
    }

    private async getGitHubPatToken(): Promise<string> {
        return await telemetryHelper.executeFunctionWithTimeTelemetry(
            async () => {
                return await showInputBox(
                    constants.GitHubPat,
                    {
                        placeHolder: Messages.enterGitHubPat,
                        prompt: Messages.githubPatTokenHelpMessage,
                        validateInput: inputValue => {
                            return inputValue.length === 0 ? Messages.gitHubPatTokenErrorMessage : null;
                        }
                    });
            },
            TelemetryKeys.GitHubPatDuration);
    }

    private async getAzureDevOpsDetails(): Promise<void> {
        try {
            this.organizationsClient = new OrganizationsClient(this.inputs.azureSession.credentials2);
            if (this.inputs.sourceRepository.repositoryProvider === RepositoryProvider.AzureRepos) {
                const repoDetails = AzureDevOpsHelper.getRepositoryDetailsFromRemoteUrl(this.inputs.sourceRepository.remoteUrl);
                this.inputs.organizationName = repoDetails.organizationName;

                const azureDevOpsClient = await this.getAzureDevOpsClient();
                const gitApi = await azureDevOpsClient.getGitApi();
                const repository = await gitApi.getRepository(this.inputs.sourceRepository.repositoryName, repoDetails.projectName);
                this.inputs.sourceRepository.repositoryId = repository.id;
                this.inputs.project = {
                    id: repository.project.id,
                    name: repository.project.name
                };
            } else {
                this.inputs.isNewOrganization = false;
                let devOpsOrganizations = await this.organizationsClient.listOrganizations();

                if (devOpsOrganizations && devOpsOrganizations.length > 0) {
                    let selectedOrganization = await showQuickPick(
                        constants.SelectOrganization,
                        devOpsOrganizations.map(organization => { return { label: organization.accountName }; }),
                        { placeHolder: Messages.selectOrganization },
                        TelemetryKeys.OrganizationListCount);
                    this.inputs.organizationName = selectedOrganization.label;

                    const azureDevOpsClient = await this.getAzureDevOpsClient();
                    const coreApi = await azureDevOpsClient.getCoreApi();
                    const projects = await coreApi.getProjects();

                    // FIXME: It _is_ possible for an organization to have no projects.
                    // We need to guard against this and create a project for them.
                    const selectedProject = await showQuickPick(
                        constants.SelectProject,
                        projects.map(project => { return { label: project.name, data: project }; }),
                        { placeHolder: Messages.selectProject },
                        TelemetryKeys.ProjectListCount);
                    this.inputs.project = selectedProject.data;
                } else {
                    telemetryHelper.setTelemetry(TelemetryKeys.NewOrganization, 'true');

                    this.inputs.isNewOrganization = true;
                    let userName = this.inputs.azureSession.userId.substring(0, this.inputs.azureSession.userId.indexOf("@"));
                    let organizationName = AzureDevOpsHelper.generateDevOpsOrganizationName(userName, this.inputs.sourceRepository.repositoryName);

                    let validationErrorMessage = await this.organizationsClient.validateOrganizationName(organizationName);
                    if (validationErrorMessage) {
                        this.inputs.organizationName = await showInputBox(
                            constants.EnterOrganizationName,
                            {
                                placeHolder: Messages.enterAzureDevOpsOrganizationName,
                                validateInput: (organizationName) => this.organizationsClient.validateOrganizationName(organizationName)
                            });
                    }
                    else {
                        this.inputs.organizationName = organizationName;
                    }
                }
            }
        }
        catch (error) {
            telemetryHelper.logError(Layer, TracePoints.GetAzureDevOpsDetailsFailed, error);
            throw error;
        }
    }

    private async getSelectedPipeline(): Promise<void> {
        let appropriatePipelines: PipelineTemplate[] = await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: Messages.analyzingRepo },
            () => templateHelper.analyzeRepoAndListAppropriatePipeline(this.workspaceUri)
        );

        // TO:DO- Get applicable pipelines for the repo type and azure target type if target already selected
        let selectedOption = await showQuickPick(
            constants.SelectPipelineTemplate,
            appropriatePipelines.map((pipeline) => { return { label: pipeline.label }; }),
            { placeHolder: Messages.selectPipelineTemplate },
            TelemetryKeys.PipelineTempateListCount);
        this.inputs.pipelineParameters.pipelineTemplate = appropriatePipelines.find((pipeline) => {
            return pipeline.label === selectedOption.label;
        });
        telemetryHelper.setTelemetry(TelemetryKeys.ChosenTemplate, this.inputs.pipelineParameters.pipelineTemplate.label);
    }

    private async getAzureResourceDetails(): Promise<void> {
        // show available subscriptions and get the chosen one
        const azureAccountApi = await getAzureAccountExtensionApi();
        const subscriptionList = azureAccountApi.filters.map(subscriptionObject => {
            return <QuickPickItemWithData<AzureSubscription>>{
                label: `${<string>subscriptionObject.subscription.displayName}`,
                data: subscriptionObject,
                description: `${<string>subscriptionObject.subscription.subscriptionId}`
            };
        });

        if (this.inputs.pipelineParameters.pipelineTemplate.targetType != TargetResourceType.None) {
            const selectedSubscription: QuickPickItemWithData<AzureSubscription> =
                await showQuickPick(constants.SelectSubscription, subscriptionList, { placeHolder: Messages.selectSubscription });
            this.inputs.targetResource.subscriptionId = selectedSubscription.data.subscription.subscriptionId;
            this.inputs.azureSession = await getSubscriptionSession(this.azureAccount, this.inputs.targetResource.subscriptionId);

            // show available resources and get the chosen one
            this.appServiceClient = new AppServiceClient(this.inputs.azureSession.credentials2, this.inputs.azureSession.tenantId, this.inputs.azureSession.environment.portalUrl, this.inputs.targetResource.subscriptionId);

            let resourceArray: Promise<Array<{label: string, data: ResourceManagementModels.GenericResource}>> = null;
            let selectAppText: string = "";
            let placeHolderText: string = "";

            switch(this.inputs.pipelineParameters.pipelineTemplate.targetType) {
                case TargetResourceType.WebApp:
                default:
                    resourceArray = this.appServiceClient.GetAppServices(this.inputs.pipelineParameters.pipelineTemplate.targetKind)
                        .then((webApps) => webApps.map(x => { return { label: x.name, data: x }; }));
                    selectAppText = this.getSelectAppText(this.inputs.pipelineParameters.pipelineTemplate.targetKind);
                    placeHolderText = this.getPlaceholderText(this.inputs.pipelineParameters.pipelineTemplate.targetKind);
                    break;
            }

            const selectedResource: QuickPickItemWithData<ResourceManagementModels.GenericResource> = await showQuickPick(
                selectAppText,
                resourceArray,
                { placeHolder: placeHolderText },
                TelemetryKeys.WebAppListCount);

            this.inputs.targetResource.resource = selectedResource.data;
        } else if (subscriptionList.length > 0) {
            this.inputs.targetResource.subscriptionId = subscriptionList[0].data.subscription.subscriptionId;
            this.inputs.azureSession = await getSubscriptionSession(this.azureAccount, this.inputs.targetResource.subscriptionId);
        }
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

    private async updateScmType(queuedPipeline: Build): Promise<void> {
        try {
            if(!this.inputs.targetResource.resource) {
                return;
            }
            // update SCM type
            this.appServiceClient.updateScmType(this.inputs.targetResource.resource.id);

            let buildDefinitionUrl = AzureDevOpsHelper.getOldFormatBuildDefinitionUrl(this.inputs.organizationName, this.inputs.project.id, queuedPipeline.definition.id);
            let buildUrl = AzureDevOpsHelper.getOldFormatBuildUrl(this.inputs.organizationName, this.inputs.project.id, queuedPipeline.id);

            // update metadata of app service to store information about the pipeline deploying to web app.
            let metadata = await this.appServiceClient.getAppServiceMetadata(this.inputs.targetResource.resource.id);
            metadata["properties"] = metadata["properties"] ? metadata["properties"] : {};
            metadata["properties"]["VSTSRM_ProjectId"] = this.inputs.project.id;
            metadata["properties"]["VSTSRM_AccountId"] = await this.organizationsClient.getOrganizationIdFromName(this.inputs.organizationName);
            metadata["properties"]["VSTSRM_BuildDefinitionId"] = queuedPipeline.definition.id.toString();
            metadata["properties"]["VSTSRM_BuildDefinitionWebAccessUrl"] = buildDefinitionUrl;
            metadata["properties"]["VSTSRM_ConfiguredCDEndPoint"] = '';
            metadata["properties"]["VSTSRM_ReleaseDefinitionId"] = '';

            this.appServiceClient.updateAppServiceMetadata(this.inputs.targetResource.resource.id, metadata);

            // send a deployment log with information about the setup pipeline and links.
            this.appServiceClient.publishDeploymentToAppService(
                this.inputs.targetResource.resource.id,
                buildDefinitionUrl,
                buildDefinitionUrl,
                buildUrl);
        }
        catch (error) {
            telemetryHelper.logError(Layer, TracePoints.PostDeploymentActionFailed, error);
        }
    }

    private async createGithubServiceConnection(): Promise<void> {
        if (!this.serviceConnectionHelper) {
            this.serviceConnectionHelper = new ServiceConnectionHelper(this.inputs.organizationName, this.inputs.project.name, this.azureDevOpsClient);
        }

        // Create GitHub service connection in Azure DevOps
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: Messages.creatingGitHubServiceConnection
            },
            async () => {
                try {
                    let serviceConnectionName = `${this.inputs.sourceRepository.repositoryName}-${this.uniqueResourceNameSuffix}`;
                    this.inputs.sourceRepository.serviceConnectionId = await this.serviceConnectionHelper.createGitHubServiceConnection(serviceConnectionName, this.inputs.githubPatToken);
                }
                catch (error) {
                    telemetryHelper.logError(Layer, TracePoints.GitHubServiceConnectionError, error);
                    throw error;
                }
            });
    }

    private async createAzureRMServiceConnection(): Promise<void> {
        if (!this.serviceConnectionHelper) {
            this.serviceConnectionHelper = new ServiceConnectionHelper(this.inputs.organizationName, this.inputs.project.name, this.azureDevOpsClient);
        }
        // TODO: show notification while setup is being done.
        // ?? should SPN created be scoped to resource group of target azure resource.
        this.inputs.targetResource.serviceConnectionId = await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: utils.format(Messages.creatingAzureServiceConnection, this.inputs.targetResource.subscriptionId)
            },
            async () => {
                try {
                    let scope = this.inputs.targetResource.resource.id;
                    let aadAppName = GraphHelper.generateAadApplicationName(this.inputs.organizationName, this.inputs.project.name);
                    let aadApp = await GraphHelper.createSpnAndAssignRole(this.inputs.azureSession, aadAppName, scope);
                    let serviceConnectionName = `${this.inputs.targetResource.resource.name}-${this.uniqueResourceNameSuffix}`;
                    return await this.serviceConnectionHelper.createAzureServiceConnection(serviceConnectionName, this.inputs.azureSession.tenantId, this.inputs.targetResource.subscriptionId, scope, aadApp);
                }
                catch (error) {
                    telemetryHelper.logError(Layer, TracePoints.AzureServiceConnectionCreateFailure, error);
                    throw error;
                }
            });
    }

    private async checkInPipelineFileToRepository(): Promise<void> {
        try {
            this.inputs.pipelineParameters.pipelineFileName = await getAvailableFileName("azure-pipelines.yml", this.workspaceUri);
            const fileUri = Utils.joinPath(this.workspaceUri, this.inputs.pipelineParameters.pipelineFileName);
            const content = await templateHelper.renderContent(this.inputs.pipelineParameters.pipelineTemplate.path, this.inputs);
            await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content));
            await vscode.window.showTextDocument(fileUri);
        } catch (error) {
            telemetryHelper.logError(Layer, TracePoints.AddingContentToPipelineFileFailed, error);
            throw error;
        }

        try {
            while (!this.inputs.sourceRepository.commitId) {
                const commitOrDiscard = await vscode.window.showInformationMessage(utils.format(Messages.modifyAndCommitFile, Messages.commitAndPush, this.inputs.sourceRepository.branch, this.inputs.sourceRepository.remoteName), Messages.commitAndPush, Messages.discardPipeline);
                if (commitOrDiscard?.toLowerCase() === Messages.commitAndPush.toLowerCase()) {
                    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: Messages.configuringPipelineAndDeployment }, async (progress) => {
                        try {
                            // handle when the branch is not upto date with remote branch and push fails
                            await this.repo.add([Utils.joinPath(this.workspaceUri, this.inputs.pipelineParameters.pipelineFileName).fsPath]);
                            await this.repo.commit(Messages.addYmlFile); // TODO: Only commit the YAML file. Need to file a feature request on VS Code for this.
                            await this.repo.push(this.inputs.sourceRepository.remoteName);
                            this.inputs.sourceRepository.commitId = this.repo.state.HEAD.commit;
                        } catch (error) {
                            telemetryHelper.logError(Layer, TracePoints.CheckInPipelineFailure, error);
                            vscode.window.showErrorMessage(utils.format(Messages.commitFailedErrorMessage, error.stderr));
                        }
                    });
                } else {
                    telemetryHelper.setTelemetry(TelemetryKeys.PipelineDiscarded, 'true');
                    throw new UserCancelledError();
                }
            }
        }
        catch (error) {
            telemetryHelper.logError(Layer, TracePoints.PipelineFileCheckInFailed, error);
            throw error;
        }
    }

    private async createAndRunPipeline(): Promise<Build> {
        return await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: Messages.configuringPipelineAndDeployment }, async () => {
            try {
                const taskAgentApi = await this.azureDevOpsClient.getTaskAgentApi();
                const queues = await taskAgentApi.getAgentQueuesByNames([constants.HostedVS2017QueueName], this.inputs.project.name);
                if (queues.length === 0) {
                    throw new Error(utils.format(Messages.noAgentQueueFound, constants.HostedVS2017QueueName));
                }

                const pipelineName = `${(this.inputs.targetResource.resource ? this.inputs.targetResource.resource.name : this.inputs.pipelineParameters.pipelineTemplate.label)}-${this.uniqueResourceNameSuffix}`;
                const definitionPayload = AzureDevOpsHelper.getBuildDefinitionPayload(pipelineName, queues[0], this.inputs);
                const buildApi = await this.azureDevOpsClient.getBuildApi();
                const definition = await buildApi.createDefinition(definitionPayload, this.inputs.project.name);
                return await buildApi.queueBuild({
                    definition: definition,
                    project: this.inputs.project,
                    sourceBranch: this.inputs.sourceRepository.branch,
                    sourceVersion: this.inputs.sourceRepository.commitId
                }, this.inputs.project.name);
            }
            catch (error) {
                telemetryHelper.logError(Layer, TracePoints.CreateAndQueuePipelineFailed, error);
                throw error;
            }
        });
    }

    private async getAzureDevOpsClient(): Promise<azdev.WebApi> {
        if (this.azureDevOpsClient) {
            return this.azureDevOpsClient;
        }

        const token = await this.inputs.azureSession.credentials2.getToken();
        const authHandler = azdev.getBearerHandler(token.accessToken);
        this.azureDevOpsClient = new azdev.WebApi(`https://dev.azure.com/${this.inputs.organizationName}`, authHandler);
        return this.azureDevOpsClient;
    }
}
