/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License.
*--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { URI, Utils } from 'vscode-uri';
import * as azdev from 'azure-devops-node-api';
import * as logger from './logger';
import * as Messages from './messages';
import { getAzureDevOpsSessions } from './schema-association-service';

const milliseconds24hours = 86400000;

export async function get1ESPTSchemaUri(azureDevOpsClient: azdev.WebApi, organizationName: string, session: vscode.AuthenticationSession, context: vscode.ExtensionContext, repoId1espt: string): Promise<URI | undefined> {
    try {
        if (session.account.label.endsWith("@microsoft.com")) {
            const gitApi = await azureDevOpsClient.getGitApi();
            // Using getItem from GitApi: getItem(repositoryId: string, path: string, project?: string, scopePath?: string, recursionLevel?: GitInterfaces.VersionControlRecursionType, includeContentMetadata?: boolean, latestProcessedChange?: boolean, download?: boolean, versionDescriptor?: GitInterfaces.GitVersionDescriptor, includeContent?: boolean, resolveLfs?: boolean, sanitize?: boolean): Promise<GitInterfaces.GitItem>;
            const schemaFile = await gitApi.getItem(repoId1espt, "schema/1espt-base-schema.json", "1ESPipelineTemplates", undefined, undefined, true, true, true, undefined, true, true);

            const { content } = schemaFile;
            if (content === undefined) {
                logger.log(`File was retrieved without content for org: ${organizationName}`, 'SchemaDetection');
                return undefined;
            }

            const schemaUri = Utils.joinPath(context.globalStorageUri, '1ESPTSchema', `${organizationName}-1espt-schema.json`);
            await vscode.workspace.fs.writeFile(schemaUri, Buffer.from(content));
            return schemaUri;
        }
        else {
            // if user is signed in with account other than microsoft, then delete the 1ESPT schema file
            await delete1ESPTSchemaFileIfPresent(context);
        }
    }
    catch (error) {
        logger.log(`Error: ${error instanceof Error ? error.message : String(error)} while fetching 1ESPT schema for org: ${organizationName}  : `, 'SchemaDetection');
    }
    return undefined;
}

/**
 * Fetch cached 1ESPT schema if:
       1) User is signed in with microsoft account
       2) 1ESPT schema is enabled
       3) last fetched 1ESPT schema is less than 24 hours old
       4) Schema file exists
 * @param context
 * @param organizationName
 * @param session
 * @param lastUpdated1ESPTSchema
 * @returns
 */
export async function getCached1ESPTSchema(context: vscode.ExtensionContext, organizationName: string, session: vscode.AuthenticationSession, lastUpdated1ESPTSchema: Map<string, Date>): Promise<URI | undefined> {
    const lastUpdatedDate = lastUpdated1ESPTSchema.get(organizationName);
    if (!lastUpdatedDate) {
        return undefined;
    }

    const schemaUri1ESPT = Utils.joinPath(context.globalStorageUri, '1ESPTSchema', `${organizationName}-1espt-schema.json`);

    try {
        if (session.account.label.endsWith("@microsoft.com")) {
            if ((new Date().getTime() - lastUpdatedDate.getTime()) < milliseconds24hours) {
                try {
                    await vscode.workspace.fs.stat(schemaUri1ESPT);
                    logger.log("Returning cached schema for 1ESPT", 'SchemaDetection');
                    return schemaUri1ESPT;
                } catch {
                    // Expected failure if file doesn't exist.
                }
            }
            // schema is older than 24 hours, fetch schema file again
            else {
                logger.log(`Skipping cached 1ESPT schema for ${organizationName} as it is older than 24 hours`, `SchemaDetection`);
            }
        }
        else {
            void vscode.window.showInformationMessage(Messages.notUsing1ESPTSchemaAsUserNotSignedInMessage, Messages.signInWithADifferentAccountLabel)
                .then(async action => {
                    if (action === Messages.signInWithADifferentAccountLabel) {
                        await getAzureDevOpsSessions(context, {
                            clearSessionPreference: true,
                            createIfNone: true,
                        });
                    }
                });
            logger.log(`Skipping cached 1ESPT schema for ${organizationName} as user is not signed in with Microsoft account`, `SchemaDetection`);
        }
    }
    catch (error) {
        logger.log(`Error: ${error instanceof Error ? error.message : String(error)} while fetching cached 1ESPT schema for org: ${organizationName}. It's possible that the schema does not exist.`, 'SchemaDetection');
    }

    return undefined;
}

/**
 * User is eligible for 1ESPT schema if 1ESPT schema is available in ADO organization
 * @param azureDevOpsClient
 * @param organizationName
 * @returns
 */
export async function get1ESPTRepoIdIfAvailable(azureDevOpsClient: azdev.WebApi, organizationName: string): Promise<string> {
    try {
        const gitApi = await azureDevOpsClient.getGitApi();
        const repository = await gitApi.getRepository('1ESPipelineTemplates', '1ESPipelineTemplates');
        // Types are wrong and getRepository cah return null.
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (repository?.id === undefined) {
            logger.log(`1ESPipelineTemplates repo not found for org ${organizationName}`, `SchemaDetection`);
            return ""; // 1ESPT repo not found
        }

        return repository.id;
    }
    catch (error) {
        logger.log(`Error: ${error instanceof Error ? error.message : String(error)} while checking eligibility for enhanced Intellisense for 1ESPT schema for org: ${organizationName}.`, 'SchemaDetection');
        return "";
    }
}

export async function delete1ESPTSchemaFileIfPresent(context: vscode.ExtensionContext) {
    try {
        await vscode.workspace.fs.delete(Utils.joinPath(context.globalStorageUri, '1ESPTSchema'), { recursive: true });
    }
    catch (error) {
        logger.log(`Error: ${error instanceof Error ? error.message : String(error)} while deleting 1ESPT schema. It's possible that the schema file does not exist`, 'SchemaDetection');
    }
}
