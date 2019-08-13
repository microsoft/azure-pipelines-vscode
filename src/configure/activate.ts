import * as vscode from 'vscode';
import { registerCommand, IActionContext, createApiProvider } from 'vscode-azureextensionui';
import { AzureExtensionApi, AzureExtensionApiProvider } from 'vscode-azureextensionui/api';

import { configurePipeline } from './configure';
import { Messages } from './messages';
import { AzureAccountExtensionExports, extensionVariables } from './model/models';

export async function activateConfigurePipeline(context: vscode.ExtensionContext): Promise<AzureExtensionApiProvider> {
    let azureAccountExtension = vscode.extensions.getExtension("ms-vscode.azure-account");
    if (!azureAccountExtension) {
        throw new Error(Messages.azureAccountExntesionUnavailable);
    }

    if (!azureAccountExtension.isActive) {
        await azureAccountExtension.activate();
    }

    extensionVariables.azureAccountExtensionApi = <AzureAccountExtensionExports>azureAccountExtension.exports;

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    registerCommand('configure-pipeline', async (actionContext: IActionContext, node: any) => {
        // The code you place here will be executed every time your command is executed
        await configurePipeline(actionContext, node);
    });

    return createApiProvider([<AzureExtensionApi>
        {
            configurePipelineApi: configurePipeline,
            apiVersion: "0.0.1"
        }]);
}