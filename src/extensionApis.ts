import * as vscode from 'vscode';
import { AzureAccount } from './configure/model/models';
import { Messages } from './configure/resources/messages';

let azureAccountExtensionApi: AzureAccount;
export function getAzureAccountExtensionApi(): AzureAccount {
    if (azureAccountExtensionApi == null) {
        const azureAccountExtension = vscode.extensions.getExtension<AzureAccount>("ms-vscode.azure-account");
        if (!azureAccountExtension) {
            throw new Error(Messages.azureAccountExntesionUnavailable);
        }

        azureAccountExtensionApi = azureAccountExtension.exports;
    }

    return azureAccountExtensionApi;
}
