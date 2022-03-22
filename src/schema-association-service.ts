/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License.
*--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as vscode from 'vscode';
import { Utils } from 'vscode-uri';
import * as languageclient from 'vscode-languageclient/node';
import * as azdev from 'azure-devops-node-api';
import { getAzureAccountExtensionApi } from './extensionApis';
import { AzureDevOpsHelper } from './configure/helper/devOps/azureDevOpsHelper';
import { LocalGitRepoHelper } from './configure/helper/LocalGitRepoHelper';
import { Messages } from './messages';

export async function locateSchemaFile(context: vscode.ExtensionContext): Promise<string> {
    let schemaUri: vscode.Uri | undefined;
    try {
        schemaUri = await autoDetectSchema(context);
        if (schemaUri) {
            return schemaUri.toString();
        }
    } catch (error) {
        // Well, we tried our best. Fall back to the predetermined schema paths.
    }

    let alternateSchema = vscode.workspace.getConfiguration('azure-pipelines').get<string>('customSchemaFile');
    if ((alternateSchema?.trim().length ?? 0) === 0) {
        alternateSchema = path.join(context.extensionPath, 'service-schema.json');
    }

    // A somewhat hacky way to support both files and URLs without requiring use of the file:// URI scheme
    if (alternateSchema.toLowerCase().startsWith("http://") || alternateSchema.toLowerCase().startsWith("https://")) {
        schemaUri = vscode.Uri.parse(alternateSchema, true);
    } else if (path.isAbsolute(alternateSchema)) {
        schemaUri = vscode.Uri.file(alternateSchema);
    } else {
        schemaUri = vscode.Uri.file(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, alternateSchema));
    }

    return schemaUri.toString();
}

// Looking at how the vscode-yaml extension does it, it looks like this is meant as a
// way for other extensions to hook into the validation process, not as something
// user-configurable.
// For our purposes, since we're only concerned with validating Azure Pipelines files,
// we don't need to worry about other extensions.
// TODO: We *could* make this configurable, but it'd probably make more sense to co-opt
// the existing yaml.schemas setting (and rename it to azure-pipelines.schemas) that
// the server already looks for.
// That one is schema -> patterns, rather than pattern -> schemas.
export function getSchemaAssociation(schemaFilePath: string): ISchemaAssociations {
    return { '*': [schemaFilePath] };
}

async function autoDetectSchema(context: vscode.ExtensionContext): Promise<vscode.Uri | undefined> {
    // Get the remote URL if we're in a Git repo
    let remoteUrl: string | void;
    try {
        const gitHelper = await LocalGitRepoHelper.GetHelperInstance(vscode.workspace.workspaceFolders[0].uri);
        const remoteName = (await gitHelper.getGitBranchDetails()).remoteName;
        remoteUrl = await gitHelper.getGitRemoteUrl(remoteName);
    } catch (error) {
        return undefined;
    }

    // Are we in an Azure Repo?
    if (remoteUrl && AzureDevOpsHelper.isAzureReposUrl(remoteUrl)) {
        const { organizationName } = AzureDevOpsHelper.getRepositoryDetailsFromRemoteUrl(remoteUrl);
        const azureAccountApi = await getAzureAccountExtensionApi();
        if (!(await azureAccountApi.waitForLogin())) {
            // Don't await this message so that we can return the fallback schema instead of blocking.
            // We'll detect the login in extension.ts and then re-request the schema.
            const actionPromise = vscode.window.showInformationMessage(Messages.signInForEnhancedIntelliSense, Messages.signInLabel);
            actionPromise.then(async action => {
                if (action === Messages.signInLabel) {
                    await vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: Messages.waitForAzureSignIn,
                    }, async () => {
                        await vscode.commands.executeCommand("azure-account.login");
                    });
                }
            });

            return undefined;
        }

        // Create the global storage folder to guarantee that it exists.
        await vscode.workspace.fs.createDirectory(context.globalStorageUri);

        // Grab and save the schema.
        // TODO: Prompt for the correct session to use.
        // NOTE: Despite saving the schema to disk, we don't treat it as a cache
        // for the following reasons:
        // 1. ADO doesn't provide an API to indicate which version (milestone) it's on,
        //    so we don't have a way of busting the cache.
        // 2. Even if we did, organizations can add/remove tasks at any time.
        // 3. Schema association only happens at startup or when schema settings change,
        //    so typically we'll only hit the network once per session anyway.
        const token = await azureAccountApi.sessions[0].credentials2.getToken();
        const authHandler = azdev.getBearerHandler(token.accessToken);
        const azureDevOpsClient = new azdev.WebApi(`https://dev.azure.com/${organizationName}`, authHandler);
        const taskAgentApi = await azureDevOpsClient.getTaskAgentApi();
        const schema = JSON.stringify(await taskAgentApi.getYamlSchema());
        const schemaUri = Utils.joinPath(context.globalStorageUri, `${organizationName}-schema.json`);
        await vscode.workspace.fs.writeFile(schemaUri, Buffer.from(schema));

        return schemaUri;
    }
    return undefined;
}

// Mapping of glob pattern -> schemas
interface ISchemaAssociations {
	[pattern: string]: string[];
}

export namespace SchemaAssociationNotification {
	export const type: languageclient.NotificationType<ISchemaAssociations> = new languageclient.NotificationType('json/schemaAssociations');
}
