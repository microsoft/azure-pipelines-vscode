/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License.
*--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { URI, Utils } from 'vscode-uri';
import * as azdev from 'azure-devops-node-api';
import * as logger from './logger';
import { AzureSession } from './typings/azure-account.api';
import { VersionControlRecursionType } from 'azure-devops-node-api/interfaces/TfvcInterfaces';
import * as fs from 'fs'
import { Messages } from './messages';

const milliseconds24hours = 86400000;

export async function get1ESPTSchemaUriIfAvailable(azureDevOpsClient: azdev.WebApi, organizationName: string, session: AzureSession, context: vscode.ExtensionContext, lastUpdated1ESPTSchema: Date, seen1ESPTOrganizations: Set<string>): Promise<any> {
    try {
        if (session.userId.endsWith("@microsoft.com") || session.userId.endsWith(".microsoft.com")) {
            const gitApi = await azureDevOpsClient.getGitApi();
            const repositories = await gitApi.getRepositories('1ESPipelineTemplates');
            if (!repositories || repositories.length == 0) {
                logger.log(`1ESPT repo not found for org ${organizationName}`, `SchemaDetection`)
                const config = vscode.workspace.getConfiguration('azure-pipelines')
                config.update('1ESPipelineTemplatesSchemaFile', undefined, vscode.ConfigurationTarget.WorkspaceFolder); // disable the 1ESPT schema configuration
                vscode.window.showInformationMessage(Messages.disabled1ESPTSchemaAsADOOrgNotContains1ESPT)
                return undefined; // 1ESPT repo not found
            }
            const repository = repositories.find(repo => repo.name === "1ESPipelineTemplates");
            
            // Using getItem from GitApi: getItem(repositoryId: string, path: string, project?: string, scopePath?: string, recursionLevel?: GitInterfaces.VersionControlRecursionType, includeContentMetadata?: boolean, latestProcessedChange?: boolean, download?: boolean, versionDescriptor?: GitInterfaces.GitVersionDescriptor, includeContent?: boolean, resolveLfs?: boolean, sanitize?: boolean): Promise<GitInterfaces.GitItem>;
            var schemaFile = await gitApi.getItem(repository.id, "schema/1espt-base-schema.json", "1ESPipelineTemplates", "", VersionControlRecursionType.None, true, true, true, {}, true, true)

            const schemaContent = schemaFile.content;
            const schemaUri = Utils.joinPath(context.globalStorageUri, '1ESPTSchema', `${organizationName}-1espt-schema.json`);
            await vscode.workspace.fs.writeFile(schemaUri, Buffer.from(schemaContent));
            lastUpdated1ESPTSchema = new Date();
            seen1ESPTOrganizations.add(organizationName);
            return schemaUri;
        }
        else
        // if user is signed in with account other than microsoft, then disable 1ESPT schema and delete the 1ESPT schema file
        {
            const config = vscode.workspace.getConfiguration('azure-pipelines')
            config.update('1ESPipelineTemplatesSchemaFile', false, vscode.ConfigurationTarget.WorkspaceFolder);
            await vscode.workspace.fs.delete(Utils.joinPath(context.globalStorageUri, '1ESPTSchema'), { recursive: true })
            return undefined;
        }
    }
    catch (error) {
        logger.log(`Error : ${error} while fetching 1ESPT schema for org: ${organizationName}  : `, 'SchemaDetection');
    }
}

export function getCached1ESPTSchemaInformation(context: vscode.ExtensionContext, organizationName: string, session: AzureSession, oneesptSchemaEnabled: boolean, lastUpdated1ESPTSchema: Date, seen1ESPTOrganizations: Set<string>): [URI, boolean] {
    var skipOrgSpecificCachedSchema = false
    var validSessionToEnable1ESPTSchema = false;
    if (seen1ESPTOrganizations.has(organizationName)) {
        const schemaUri1ESPT = Utils.joinPath(context.globalStorageUri, '1ESPTSchema', `${organizationName}-1espt-schema.json`);
        validSessionToEnable1ESPTSchema = session.userId.endsWith("@microsoft.com") || session.userId.endsWith(".microsoft.com")

        // check if 1ESPT schema file exists
        var cached1ESPTSchemaFileExists = fs.existsSync(schemaUri1ESPT.path.substring(1));
        if (cached1ESPTSchemaFileExists) {
        // Fetch cached 1ESPT schema if:
        // 1) User is signed in with microsoft account
        // 2) 1ESPT schema is enabled
        // 3) last fetched 1ESPT schema is less than 24 hours old
            if (validSessionToEnable1ESPTSchema && oneesptSchemaEnabled && ((new Date().getTime() - lastUpdated1ESPTSchema.getTime()) < milliseconds24hours)) {
                logger.log("Returning cached schema for 1ESPT", 'SchemaDetection')
                return [schemaUri1ESPT, skipOrgSpecificCachedSchema];
            }
            // 1ESPT schema has been loaded for this org, but is older than 24 hours
            else if (validSessionToEnable1ESPTSchema && oneesptSchemaEnabled) {
                skipOrgSpecificCachedSchema = true
                logger.log(`Skipping cached 1ESPT schema for ${organizationName} as it is older than 24 hours`, `SchemaDetection`)
            }
            else {
                logger.log(`Skipping cached 1ESPT schema for ${organizationName}`, `SchemaDetection`)
            }
        }
    }
    // 1ESPT schema file does not exist previously but now user has signed in and 1ESPT schema is enabled, so skip fetching cached org specific schema
    else if (validSessionToEnable1ESPTSchema && oneesptSchemaEnabled) {
        skipOrgSpecificCachedSchema = true
        logger.log(`Skip getting org specific cached schema for ${organizationName} as now user is signed in and 1espt schema is enabled`, `SchemaDetection`)
    }
    return [undefined, skipOrgSpecificCachedSchema];
}

