import * as path from 'path';
import * as fs from 'fs';
import * as utils from 'util';
import * as vscode from 'vscode';
import { Configurer } from "./configurerBase";
import { WizardInputs, AzureSession, TargetResourceType } from "../model/models";
import { LocalGitRepoHelper } from '../helper/LocalGitRepoHelper';
import { Messages } from '../resources/messages';
import { UserCancelledError } from 'vscode-azureextensionui';
import { telemetryHelper } from '../helper/telemetryHelper';
import { TelemetryKeys } from '../resources/telemetryKeys';
import { ControlProvider } from '../helper/controlProvider';
import { GraphHelper } from '../helper/graphHelper';
import { TracePoints } from '../resources/tracePoints';

const Layer = 'GitHubWorkflowConfigurer';

export class GitHubWorkflowConfigurer implements Configurer {
    private queuedPipelineUrl: string;

    constructor(azureSession: AzureSession, subscriptionId: string) {
    }

    public async getInputs(inputs: WizardInputs): Promise<void> {
        return;
    }

    public async validatePermissions(): Promise<void> {
        return;
    }

    public async createPreRequisites(inputs: WizardInputs): Promise<void> {
        if (inputs.targetResource.resource.type.toLowerCase() === TargetResourceType.WebApp.toLowerCase()) {
            let azureConnectionSecret = await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: utils.format(Messages.creatingAzureServiceConnection, inputs.targetResource.subscriptionId)
                },
                async () => {
                    try {
                        let scope = inputs.targetResource.resource.id;
                        let aadAppName = GraphHelper.generateAadApplicationName(inputs.sourceRepository.remoteName, 'github');
                        let aadApp = await GraphHelper.createSpnAndAssignRole(inputs.azureSession, aadAppName, scope);
                        return {
                            "clientId": `${aadApp.appId}`,
                            "clientSecret": `${aadApp.secret}`,
                            "subscriptionId": `${inputs.targetResource.subscriptionId}`,
                            "tenantId": `${inputs.azureSession.tenantId}`,
                        };
                    }
                    catch (error) {
                        telemetryHelper.logError(Layer, TracePoints.AzureServiceConnectionCreateFailure, error);
                        throw error;
                    }
                });
            inputs.targetResource.serviceConnectionId = 'AZURE_CREDENTIALS';
            let showCopyAndOpenNotificationFunction = (nextLabel = false) => {
                return this.showCopyAndOpenNotification(
                    JSON.stringify(azureConnectionSecret),
                    `https://github.com/${inputs.sourceRepository.repositoryId}/settings/secrets`,
                    utils.format(Messages.copyAndCreateSecretMessage, inputs.targetResource.serviceConnectionId),
                    'copyAzureCredentials',
                    nextLabel);
            };

            let copyAndOpen = await showCopyAndOpenNotificationFunction();
            if (copyAndOpen === Messages.copyAndOpenLabel) {
                let nextSelected = "";
                while (nextSelected !== Messages.nextLabel) {
                    nextSelected = await showCopyAndOpenNotificationFunction(true);
                    if (nextSelected === undefined) {
                        throw new UserCancelledError(Messages.operationCancelled);
                    }
                }
            }
        }
    }

    public async getPathToPipelineFile(inputs: WizardInputs): Promise<string> {
        // Create .github directory
        let workflowDirectoryPath = path.join(inputs.sourceRepository.localPath, '.github');
        if (!fs.existsSync(workflowDirectoryPath)) {
            fs.mkdirSync(workflowDirectoryPath);
        }

        // Create .github/workflows directory
        workflowDirectoryPath = path.join(workflowDirectoryPath, 'workflows');
        if (!fs.existsSync(workflowDirectoryPath)) {
            fs.mkdirSync(workflowDirectoryPath);
        }

        let pipelineFileName = await LocalGitRepoHelper.GetAvailableFileName('workflow.yml', workflowDirectoryPath);
        return path.join(workflowDirectoryPath, pipelineFileName);
    }

    public async checkInPipelineFileToRepository(inputs: WizardInputs, localGitRepoHelper: LocalGitRepoHelper): Promise<string> {

        while (!inputs.sourceRepository.commitId) {
            let commitOrDiscard = await vscode.window.showInformationMessage(
                utils.format(Messages.modifyAndCommitFile, Messages.commitAndPush, inputs.sourceRepository.branch, inputs.sourceRepository.remoteName),
                Messages.commitAndPush,
                Messages.discardPipeline);

            if (!!commitOrDiscard && commitOrDiscard.toLowerCase() === Messages.commitAndPush.toLowerCase()) {
                inputs.sourceRepository.commitId = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: Messages.configuringPipelineAndDeployment }, async () => {
                    try {
                        // handle when the branch is not upto date with remote branch and push fails
                        return await localGitRepoHelper.commitAndPushPipelineFile(inputs.pipelineParameters.pipelineFilePath, inputs.sourceRepository, Messages.addAzurePipelinesYmlFile);
                    }
                    catch (error) {
                        telemetryHelper.logError(Layer, TracePoints.CheckInPipelineFailure, error);
                        vscode.window.showErrorMessage(utils.format(Messages.commitFailedErrorMessage, error.message));
                        return null;
                    }
                });
            }
            else {
                telemetryHelper.setTelemetry(TelemetryKeys.PipelineDiscarded, 'true');
                throw new UserCancelledError(Messages.operationCancelled);
            }
        }

        return inputs.sourceRepository.commitId;
    }

    public async createAndQueuePipeline(inputs: WizardInputs): Promise<string> {
        this.queuedPipelineUrl = `https://github.com/${inputs.sourceRepository.repositoryId}/commit/${inputs.sourceRepository.commitId}/checks`;
        return this.queuedPipelineUrl;
    }

    public async executePostPipelineCreationSteps(): Promise<void> {
        return;
    }

    public async browseQueuedPipeline(): Promise<void> {
        vscode.window.showInformationMessage(Messages.githubWorkflowSetupSuccessfully, Messages.browseWorkflow)
            .then((action: string) => {
                if (action && action.toLowerCase() === Messages.browseWorkflow.toLowerCase()) {
                    telemetryHelper.setTelemetry(TelemetryKeys.BrowsePipelineClicked, 'true');
                    vscode.env.openExternal(vscode.Uri.parse(this.queuedPipelineUrl));
                }
            });
    }

    private async showCopyAndOpenNotification(valueToBeCopied: string, urlToBeOpened: string, messageToBeShown: string, messageIdentifier: string, showNextButton = false): Promise<string> {
        let actions: Array<string> = showNextButton ? [Messages.copyAndOpenLabel, Messages.nextLabel] : [Messages.copyAndOpenLabel];
        let controlProvider = new ControlProvider();
        let copyAndOpen = await controlProvider.showInformationBox(
            messageIdentifier,
            messageToBeShown,
            ...actions);
        if (copyAndOpen === Messages.copyAndOpenLabel) {
            await vscode.env.clipboard.writeText(valueToBeCopied);
            await vscode.env.openExternal(vscode.Uri.parse(urlToBeOpened));
        }

        return copyAndOpen;
    }
}
