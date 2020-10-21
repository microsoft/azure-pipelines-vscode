import * as vscode from 'vscode';

import { configurePipeline } from './configure';
import { Messages } from './resources/messages';
import { AzureAccountExtensionExports, extensionVariables } from './model/models';
import { telemetryHelper } from './helper/telemetryHelper';

export async function activateConfigurePipeline(): Promise<void> {
    let azureAccountExtension = vscode.extensions.getExtension("ms-vscode.azure-account");
    if (!azureAccountExtension) {
        throw new Error(Messages.azureAccountExntesionUnavailable);
    }

    if (!azureAccountExtension.isActive) {
        await azureAccountExtension.activate();
    }

    extensionVariables.azureAccountExtensionApi = <AzureAccountExtensionExports>azureAccountExtension.exports;

    vscode.commands.registerCommand('configure-pipeline', async () => {
        telemetryHelper.initialize('configure-pipeline');
        await telemetryHelper.callWithTelemetryAndErrorHandling(async () => {
            await configurePipeline();
        });
    });
}
