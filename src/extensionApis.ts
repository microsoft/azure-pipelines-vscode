import * as vscode from 'vscode';
import * as Messages from './messages';
import { API, GitExtension } from './typings/git';

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
