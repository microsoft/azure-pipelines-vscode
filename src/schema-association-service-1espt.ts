/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License.
*--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { URI, Utils } from 'vscode-uri';
import * as azdev from 'azure-devops-node-api';
import * as logger from './logger';
import { AzureSession } from './typings/azure-account.api';
import { Messages } from './messages';

const milliseconds24hours = 86400000;

export async function get1ESPTSchemaUriIfAvailable(azureDevOpsClient: azdev.WebApi, organizationName: string, session: AzureSession, context: vscode.ExtensionContext, workspaceFolder: vscode.WorkspaceFolder): Promise<URI> {
    try {
        if (session.userId.endsWith("@microsoft.com") || session.userId.endsWith(".microsoft.com")) {
            const gitApi = await azureDevOpsClient.getGitApi();
            const repositories = await gitApi.getRepositories('1ESPipelineTemplates');
            if (!repositories || repositories.length === 0) {
                logger.log(`1ESPipelineTemplates ADO project not found for org ${organizationName}`, `SchemaDetection`);
                disable1ESPTSchemaConfiguration();
                return undefined; // 1ESPT ADO project not found
            }

            const repository = repositories.find(repo => repo.name === "1ESPipelineTemplates");
            if(!repository){
                logger.log(`1ESPipelineTemplates repo not found for org ${organizationName}`, `SchemaDetection`);
                disable1ESPTSchemaConfiguration();
                return undefined; // 1ESPT repo not found
            }
            // Using getItem from GitApi: getItem(repositoryId: string, path: string, project?: string, scopePath?: string, recursionLevel?: GitInterfaces.VersionControlRecursionType, includeContentMetadata?: boolean, latestProcessedChange?: boolean, download?: boolean, versionDescriptor?: GitInterfaces.GitVersionDescriptor, includeContent?: boolean, resolveLfs?: boolean, sanitize?: boolean): Promise<GitInterfaces.GitItem>;
            const schemaFile = await gitApi.getItem(repository.id, "schema/1espt-base-schema.json", "1ESPipelineTemplates", undefined, undefined, true, true, true, undefined, true, true);

            const schemaContent = schemaFile.content;
            const schemaUri = Utils.joinPath(context.globalStorageUri, '1ESPTSchema', `${organizationName}-1espt-schema.json`);
            await vscode.workspace.fs.writeFile(schemaUri, Buffer.from(schemaContent));
            return schemaUri;
        }
        else
        // if user is signed in with account other than microsoft, then disable 1ESPT schema and delete the 1ESPT schema file
        {
            const config = vscode.workspace.getConfiguration('azure-pipelines', workspaceFolder);
            config.update('1ESPipelineTemplatesSchemaFile', false, vscode.ConfigurationTarget.Workspace);
            await vscode.workspace.fs.delete(Utils.joinPath(context.globalStorageUri, '1ESPTSchema'), { recursive: true });
        }
    }
    catch (error) {
        logger.log(`Error : ${error} while fetching 1ESPT schema for org: ${organizationName}  : `, 'SchemaDetection');
    }
    return undefined;
}

/**
 * Fetch cached 1ESPT schema if:
 *     1) User is signed in with microsoft account
       2) 1ESPT schema is enabled
       3) last fetched 1ESPT schema is less than 24 hours old
       4) Schema file exists
 * @param context 
 * @param organizationName 
 * @param session 
 * @param lastUpdated1ESPTSchema 
 * @param seen1ESPTOrganizations 
 * @returns 
 */
export async function getCached1ESPTSchema(context: vscode.ExtensionContext, organizationName: string, session: AzureSession, lastUpdated1ESPTSchema: Map<string, Date>, seen1ESPTOrganizations: Set<string>): Promise<URI> {
    if (seen1ESPTOrganizations.has(organizationName)) {
        const schemaUri1ESPT = Utils.joinPath(context.globalStorageUri, '1ESPTSchema', `${organizationName}-1espt-schema.json`);

        try {
            if (session.userId.endsWith("@microsoft.com") || session.userId.endsWith(".microsoft.com")) {
                if ((new Date().getTime() - lastUpdated1ESPTSchema.get(organizationName).getTime()) < milliseconds24hours) {
                    const schemaFileExists = await vscode.workspace.fs.stat(schemaUri1ESPT);
                    if (schemaFileExists) {                                 
                        logger.log("Returning cached schema for 1ESPT", 'SchemaDetection');
                        return schemaUri1ESPT;
                    }
                }
                // schema is older than 24 hours, fetch schema file again
                else {
                    logger.log(`Skipping cached 1ESPT schema for ${organizationName} as it is older than 24 hours`, `SchemaDetection`);
                }
            }
            else {
                logger.log(`Skipping cached 1ESPT schema for ${organizationName} as user is not signed in with Microsoft account`, `SchemaDetection`);
            }
        }
        catch (error) {
            logger.log(`Error : ${error} while fetching cached 1ESPT schema for org: ${organizationName}. It's possible that the schema does not exist.`, 'SchemaDetection');
        }
    }
    return undefined;
}

function disable1ESPTSchemaConfiguration() : void{
    const config = vscode.workspace.getConfiguration('azure-pipelines');
    config.update('1ESPipelineTemplatesSchemaFile', false, vscode.ConfigurationTarget.Workspace); // disable the 1ESPT schema configuration
    vscode.window.showInformationMessage(Messages.disabled1ESPTSchemaAsADOOrgNotContains1ESPT);
}

