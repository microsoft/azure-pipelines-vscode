import * as vscode from 'vscode';
import { registerCommand, IActionContext } from 'vscode-azureextensionui';

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

    registerCommand('configure-pipeline', async (actionContext: IActionContext) => {
        telemetryHelper.initialize(actionContext, 'configure-pipeline');
        await configurePipeline();
    });
}
