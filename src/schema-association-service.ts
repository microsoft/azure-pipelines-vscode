/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License.
*--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as vscode from 'vscode';
import { Utils } from 'vscode-uri';
import * as languageclient from 'vscode-languageclient/node';
import * as azdev from 'azure-devops-node-api';
import { AzureDevOpsHelper } from './configure/helper/devOps/azureDevOpsHelper';
import { LocalGitRepoHelper } from './configure/helper/LocalGitRepoHelper';
import { getAzureAccountExtensionApi } from './extensionApis';

// TODO: Should this inlined into getSchemaAssocations?
export async function locateSchemaFile(context: vscode.ExtensionContext): Promise<string> {
    // Are we in an Azure Repo?
    let remoteUrl: string | void;
    try {
        const gitHelper = await LocalGitRepoHelper.GetHelperInstance(vscode.workspace.workspaceFolders[0].uri.fsPath);
        const remoteName = (await gitHelper.getGitBranchDetails()).remoteName;
        remoteUrl = await gitHelper.getGitRemoteUrl(remoteName);
    } catch (error) {
        // Nothing
    }

    if (remoteUrl && AzureDevOpsHelper.isAzureReposUrl(remoteUrl)) {
        const { organizationName } = AzureDevOpsHelper.getRepositoryDetailsFromRemoteUrl(remoteUrl);
        if (!(await getAzureAccountExtensionApi().waitForLogin())) {
            await vscode.commands.executeCommand("azure-account.login");
            // let signIn = await vscode.window.showInformationMessage(Messages.azureLoginRequired, Messages.signInLabel);
            // if (signIn && signIn.toLowerCase() === Messages.signInLabel.toLowerCase()) {
            //     await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: Messages.waitForAzureSignIn },
            //         async () => {
            //             await vscode.commands.executeCommand("azure-account.login");
            //         });
            // }
            // else {
            //     throw new Error(Messages.azureLoginRequired);
            // }
        }

        // Create the global storage folder to guarantee that it exists.
        await vscode.workspace.fs.createDirectory(context.globalStorageUri);

        // Do we already have the schema cached?
        // TODO: How do we bust the cache?
        const filename = `${organizationName}-schema.json`;
        const schemaUri = Utils.joinPath(context.globalStorageUri, filename);
        const schemas = await vscode.workspace.fs.readDirectory(context.globalStorageUri);
        if (schemas.find(schema => schema[0] === filename && schema[1] === vscode.FileType.File)) {
            return schemaUri.toString();
        }

        // If not, retrieve it.
        const token = await getAzureAccountExtensionApi().sessions[0].credentials2.getToken();
        const authHandler = azdev.getBearerHandler(token.accessToken);
        const azureDevOpsClient = new azdev.WebApi(`https://dev.azure.com/${organizationName}`, authHandler);
        const taskAgentApi = await azureDevOpsClient.getTaskAgentApi();
        const schema = JSON.stringify(await taskAgentApi.getYamlSchema());

        // Cache the schema for future lookups.
        await vscode.workspace.fs.writeFile(schemaUri, Buffer.from(schema));

        return schemaUri.toString();
    }

    let alternateSchema = vscode.workspace.getConfiguration('azure-pipelines').get<string>('customSchemaFile');
    if ((alternateSchema?.trim().length ?? 0) === 0) {
        alternateSchema = path.join(context.extensionPath, 'service-schema.json');
    }

    // A somewhat hacky way to support both files and URLs without requiring use of the file:// URI scheme
    let uri: vscode.Uri;
    if (alternateSchema.toLowerCase().startsWith("http://") || alternateSchema.toLowerCase().startsWith("https://")) {
        uri = vscode.Uri.parse(alternateSchema, true);
    } else if (path.isAbsolute(alternateSchema)) {
        uri = vscode.Uri.file(alternateSchema);
    } else {
        uri = vscode.Uri.file(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, alternateSchema));
    }

    return uri.toString();
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

// Mapping of glob pattern -> schemas
interface ISchemaAssociations {
	[pattern: string]: string[];
}

export namespace SchemaAssociationNotification {
	export const type: languageclient.NotificationType<ISchemaAssociations> = new languageclient.NotificationType('json/schemaAssociations');
}
