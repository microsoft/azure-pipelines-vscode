import * as path from 'path';
import * as fs from 'fs';
import * as utils from 'util';
import * as vscode from 'vscode';
import { Configurer } from "./configurerBase";
import { WizardInputs, AzureSession } from "../model/models";
import { LocalGitRepoHelper } from '../helper/LocalGitRepoHelper';
import { Messages } from '../resources/messages';
import { UserCancelledError } from 'vscode-azureextensionui';
import { AppServiceClient } from '../clients/azure/appServiceClient';
import { telemetryHelper } from '../helper/telemetryHelper';
import { TelemetryKeys } from '../resources/telemetryKeys';
import { ControlProvider } from '../helper/controlProvider';

export class GitHubWorkflowConfigurer implements Configurer {
    private appServiceClient: AppServiceClient;
    private queuedPipelineUrl: string;

    constructor(azureSession: AzureSession, subscriptionId: string) {
        this.appServiceClient = new AppServiceClient(azureSession.credentials, azureSession.tenantId, azureSession.environment.portalUrl, subscriptionId);
    }

    public async validatePermissions(): Promise<void> {
        return;
    }

    public async createPreRequisites(inputs: WizardInputs): Promise<void> {
        // Get publish profile for web app
        let publishXml = await this.appServiceClient.getWebAppPublishXml(inputs.targetResource.resource.id);

        //Copy secret and open browser window
        let copyAndOpen = await this.showCopyAndOpenNotification(inputs, publishXml);

        if (copyAndOpen === Messages.copyAndOpenLabel) {

            let nextSelected = "";
            while (nextSelected !== Messages.nextLabel) {
                nextSelected = await this.showCopyAndOpenNotification(inputs, publishXml, true);
                if (nextSelected === undefined) {
                    throw new UserCancelledError(Messages.operationCancelled);
                }
            }
        }

        inputs.targetResource.serviceConnectionId = 'publishProfile';
    }

    public async getPathToPipelineFile(inputs: WizardInputs) {
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

    public async createAndQueuePipeline(inputs: WizardInputs): Promise<any> {
        let gitHubWorkflowUrl = `https://github.com/${inputs.sourceRepository.repositoryId}/commit/${inputs.sourceRepository.commitId}/checks`;
        return gitHubWorkflowUrl;
    }

    public async postPipelineCreationSteps(): Promise<void> {
        return;
    }

    public async browseQueuedPipeline(): Promise<void> {
        vscode.window.showInformationMessage(Messages.pipelineSetupSuccessfully, Messages.browsePipeline)
            .then((action: string) => {
                if (action && action.toLowerCase() === Messages.browsePipeline.toLowerCase()) {
                    telemetryHelper.setTelemetry(TelemetryKeys.BrowsePipelineClicked, 'true');
                    vscode.env.openExternal(vscode.Uri.parse(this.queuedPipelineUrl));
                }
            });
    }

    private async showCopyAndOpenNotification(inputs: WizardInputs, publishXml: string, showNextButton = false): Promise<string> {
        let actions: Array<string> = showNextButton ? [Messages.copyAndOpenLabel, Messages.nextLabel] : [Messages.copyAndOpenLabel];
        let controlProvider = new ControlProvider();
        let copyAndOpen = await controlProvider.showInformationBox(
            'copyPublishingCredentials',
            utils.format(Messages.copyPublishingCredentials, inputs.targetResource.serviceConnectionId),
            ...actions);
        if (copyAndOpen === Messages.copyAndOpenLabel) {
            await vscode.env.clipboard.writeText(publishXml);
            await vscode.env.openExternal(vscode.Uri.parse(`https://github.com/${inputs.sourceRepository.repositoryId}/settings/secrets`));
        }
        return copyAndOpen;
    }
}
