import * as vscode from 'vscode';

import { configurePipeline } from './configure';
import { Messages } from './resources/messages';
import { AzureAccountExtensionExports, extensionVariables } from './model/models';
import { telemetryHelper } from '../helpers/telemetryHelper';

export async function activateConfigurePipeline(): Promise<void> {
    let azureAccountExtension = vscode.extensions.getExtension("ms-vscode.azure-account");
    if (!azureAccountExtension) {
        throw new Error(Messages.azureAccountExntesionUnavailable);
    }

    extensionVariables.azureAccountExtensionApi = <AzureAccountExtensionExports>azureAccountExtension.exports;

    vscode.commands.registerCommand('azure-pipelines.configure-pipeline', async () => {
        if (!azureAccountExtension.isActive) {
            await azureAccountExtension.activate();
        }

        telemetryHelper.initialize('configure-pipeline');
        await telemetryHelper.callWithTelemetryAndErrorHandling(async () => {
            await configurePipeline();
        });
    });
}
