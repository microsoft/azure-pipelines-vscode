import * as vscode from 'vscode';

import { AzureUserInput, createApiProvider, registerUIExtensionVariables } from 'vscode-azureextensionui';
import { AzureExtensionApi, AzureExtensionApiProvider } from 'vscode-azureextensionui/api';
import TelemetryReporter from 'vscode-extension-telemetry';

import { configurePipeline } from './configure';
import { Messages } from './messages';
import { AzureAccountExtensionExports, extensionVariables } from './model/models';


export async function activateConfigurePipeline(context: vscode.ExtensionContext, reporter: TelemetryReporter): Promise<AzureExtensionApiProvider> {
    extensionVariables.reporter = reporter;
    // not localizing the below strings as it is not user facing
    extensionVariables.outputChannel = vscode.window.createOutputChannel('Azure Pipelines');
    context.subscriptions.push(extensionVariables.outputChannel);

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
    vscode.commands.registerCommand('configure-pipeline', async (node: any) => {
        // The code you place here will be executed every time your command is executed
        await configurePipeline(node);
    });

    // register ui extension variables is required to be done for createApiProvider to be called.
    extensionVariables.context = context;
    extensionVariables.ui = new AzureUserInput(context.globalState);
    registerUIExtensionVariables(extensionVariables);
    return createApiProvider([<AzureExtensionApi>
        {
            configurePipelineApi: configurePipeline,
            apiVersion: "0.0.1"
        }]);
}