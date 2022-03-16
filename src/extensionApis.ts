import * as vscode from 'vscode';
import { AzureAccount } from './configure/model/models';
import { Messages } from './messages';

let azureAccountExtensionApi: AzureAccount;
export async function getAzureAccountExtensionApi(): Promise<AzureAccount> {
    if (azureAccountExtensionApi == null) {
        const azureAccountExtension = vscode.extensions.getExtension<AzureAccount>("ms-vscode.azure-account");
        if (!azureAccountExtension) {
            throw new Error(Messages.azureAccountExntesionUnavailable);
        }

        if (!azureAccountExtension.isActive) {
            await azureAccountExtension.activate();
        }

        azureAccountExtensionApi = azureAccountExtension.exports;
    }

    return azureAccountExtensionApi;
}
