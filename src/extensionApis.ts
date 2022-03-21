import * as vscode from 'vscode';
import { Messages } from './messages';
import { AzureAccount } from './typings/azure-account.api';
import { API, GitExtension } from './typings/git';

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
