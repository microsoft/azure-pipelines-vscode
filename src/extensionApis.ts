import * as vscode from 'vscode';
import * as Messages from './messages';
import { AzureAccount } from './typings/azure-account.api';
import { API, GitExtension } from './typings/git';

let azureAccountExtensionApi: AzureAccount | undefined;
export async function getAzureAccountExtensionApi(): Promise<AzureAccount> {
    if (azureAccountExtensionApi === undefined) {
        const azureAccountExtension = vscode.extensions.getExtension<AzureAccount>("ms-vscode.azure-account");
        if (!azureAccountExtension) {
            throw new Error(Messages.azureAccountExtensionUnavailable);
        }

        if (!azureAccountExtension.isActive) {
            await azureAccountExtension.activate();
        }

        azureAccountExtensionApi = azureAccountExtension.exports;
    }

    return azureAccountExtensionApi;
}

let gitExtensionApi: API | undefined;
export async function getGitExtensionApi(): Promise<API> {
    if (gitExtensionApi === undefined) {
        const gitExtension = vscode.extensions.getExtension<GitExtension>("vscode.git");
        if (!gitExtension) {
            throw new Error(Messages.gitExtensionUnavailable);
        }

        if (!gitExtension.isActive) {
            await gitExtension.activate();
        }

        if (!gitExtension.exports.enabled) {
            throw new Error(Messages.gitExtensionNotEnabled);
        }

        return gitExtension.exports.getAPI(1);
    }

    return gitExtensionApi;
}
