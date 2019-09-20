import * as vscode from 'vscode';
import { AzureTreeItem, UserCancelledError } from 'vscode-azureextensionui';

import { AppServiceClient, ScmType } from './clients/azure/appServiceClient';
import { getSubscriptionSession } from './helper/azureSessionHelper';
import { ControlProvider } from './helper/controlProvider';
import { AzureSession, ParsedAzureResourceId, extensionVariables } from './model/models';
import * as constants from './resources/constants';
import { Messages } from './resources/messages';
import { telemetryHelper, Result } from './helper/telemetryHelper';
import { TelemetryKeys } from './resources/telemetryKeys';

export async function browsePipeline(node: AzureTreeItem): Promise<void> {
    await telemetryHelper.executeFunctionWithTimeTelemetry(async () => {
        try {
            if (!!node && !!node.fullId) {
                let parsedAzureResourceId: ParsedAzureResourceId = new ParsedAzureResourceId(node.fullId);
                let session: AzureSession = getSubscriptionSession(parsedAzureResourceId.subscriptionId);
                let appServiceClient = new AppServiceClient(session.credentials, session.tenantId, session.environment.portalUrl, parsedAzureResourceId.subscriptionId);
                let siteConfig = await appServiceClient.getAppServiceConfig(node.fullId);
                telemetryHelper.setTelemetry(TelemetryKeys.ScmType, siteConfig.scmType);
                let controlProvider = new ControlProvider();

                if (siteConfig.scmType.toLowerCase() === ScmType.VSTSRM.toLowerCase()) {
                    let pipelineUrl = await appServiceClient.getAzurePipelineUrl(node.fullId);
                    vscode.env.openExternal(vscode.Uri.parse(pipelineUrl));
                    telemetryHelper.setTelemetry(TelemetryKeys.BrowsedExistingPipeline, 'true');
                }
                else if (siteConfig.scmType === '' || siteConfig.scmType.toLowerCase() === ScmType.NONE.toLowerCase()) {
                    let result = await controlProvider.showInformationBox(
                        constants.BrowseNotAvailableConfigurePipeline,
                        Messages.browseNotAvailableConfigurePipeline,
                        'Configure Pipeline');

                    if (result === 'Configure Pipeline') {
                        vscode.commands.executeCommand('configure-pipeline', node);
                        telemetryHelper.setTelemetry(TelemetryKeys.ClickedConfigurePipeline, 'true');
                    }
                }
                else {
                    let deploymentCenterUrl: string = await appServiceClient.getDeploymentCenterUrl(node.fullId);
                    await vscode.env.openExternal(vscode.Uri.parse(deploymentCenterUrl));
                    telemetryHelper.setTelemetry(TelemetryKeys.BrowsedDeploymentCenter, 'true');
                }
            }
            else {
                throw new Error(Messages.didNotRecieveAzureResourceNodeToProcess);
            }
        }
        catch (error) {
            if (!(error instanceof UserCancelledError)) {
                extensionVariables.outputChannel.appendLine(error.message);
                vscode.window.showErrorMessage(error.message);
                telemetryHelper.setResult(Result.Failed, error);
            }
            else {
                telemetryHelper.setResult(Result.Canceled, error);
            }
        }
    }, TelemetryKeys.CommandExecutionDuration);
}
