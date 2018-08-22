/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { DTData } from './dtdata';
import { IAzurePipelinesConfiguration } from './extension';
import * as fs from 'fs';
import * as handlers from 'typed-rest-client/Handlers'
import * as logger from './logger';
import * as path from 'path';
import * as typedrestclient from 'typed-rest-client';
import * as vscode from 'vscode';
import * as languageclient from 'vscode-languageclient';
import { IYamlSchemaService, YamlSchemaService } from './yaml-schema-service';
import { LogEvents, LogMessages, Constants } from './helpers/constants';

export interface ISchemaAssociationService {
    schemaFilePath: string;

    getSchemaAssociation(): ISchemaAssociations;
}

export class SchemaAssociationService implements ISchemaAssociationService {

    /* Default duration before we try to request a new schema for the server. */
    schemaRequestIntervalMinutes: number = 10;

    /* Folder where we can store extension related data. This exists even after uninstall(verify this). */
    extensionStoragePath: string;

    /* Try to request task schema from the server. */
    requestSchemaFromServer: boolean = false; // TODO: Shouldn't need to be nullable?

    /* The last time we tried to request task schema from the server. */
    schemaLastRequestedTime: Date = new Date(1900, 1, 1);

    pat: string;
    accountName: string;

    /* Where the schema file is. This could be either the one packaged with the extension or the latest schema loaded from the server. */
    public schemaFilePath: string;

    /* The path of the schema file that is packaged with the extension. This is regenerated per sprint. */
    extensionSchemaFilePath: string;

    // TODO: Move request from server first?
    constructor(storagePath: string | undefined, requestSchemaFromServer: boolean, extensionPath: string, configuration: IAzurePipelinesConfiguration) {
        // TODO: If pat or account are empty, don't make requests from server.
        this.pat = configuration.pat;
        this.accountName = configuration.account;
        
        // storagePath may not exist, create it if not
        // AppData\Roaming\Code\User\workspaceStorage\{guid}\{publisher-name}.{extension-name}
        if (storagePath) {
            // This path isn't guaranteed to exist, create it if it doesn't.
            if (!fs.existsSync(storagePath)){
                fs.mkdirSync(storagePath);
            }

            this.extensionStoragePath = storagePath;
        } 
        else {
            // TODO: what if storagePath is undefined, when can this happen? Is this too heavy handed? We could fall back to local schema file if this happens?
            throw "Storage path must exist";
        }

        if (requestSchemaFromServer !== null) {
            this.requestSchemaFromServer = requestSchemaFromServer;
        }

        // Set the default extension schema file path.
        this.extensionSchemaFilePath = vscode.Uri.file(path.join(extensionPath, './local-schema.json')).toString();

        this.schemaFilePath = this.getSchemaFilePath();
    }

    // Get the schema file path. First try to use the latest schema file from server. If there isn't one, use the extension version.
    getSchemaFilePath(): string {
        const yamlFiles: string[] = [];
        
        fs.readdirSync(this.extensionStoragePath).forEach((yamlFile) => {
            yamlFiles.push(path.join(this.extensionStoragePath, yamlFile));
        });

        if (yamlFiles && yamlFiles.length > 0) {
            return this.getLatestYamlSchemaFromServerPath(yamlFiles);
        }

        // We weren't able to find a schema file loaded from the server, fallback to the schema packaged with the extension.
        return this.extensionSchemaFilePath;
    }

    // TODO: Extract to schema association service
    public getSchemaAssociation(): ISchemaAssociations {
        if (this.requestSchemaFromServer) {
            // check if we need to request the latest schema from the server
            const currentTime = new Date();
            const minutesSinceLastLoaded = Math.round(currentTime.getTime() - this.schemaLastRequestedTime.getTime() / 60000);
            if (minutesSinceLastLoaded > this.schemaRequestIntervalMinutes) {
                // we need to load the schema and write it to disk
                logger.log(`${minutesSinceLastLoaded} minutes since schema load, interval is ${this.schemaRequestIntervalMinutes} minutes.`, 'RequestSchemaFromServer');

                // update schema last requested time here so we don't make another request while this one is going
                this.schemaLastRequestedTime = currentTime;

                // make an http request, if successful, write to disk where we store schemas. only store last one? do this async so we don't block autocomplete
                this.downloadLatestTasksAsYaml();
            }

            // see if we can load the schema from disk
            // this could come from the yamlValidation node or from files on disk
            // TODO: do we want to get rid of the yamlValidation node? move that code to here?
            // TODO: write down all the possible scenarios/use cases
            // ideally we want either to use the version shipped with the extension (doesn't require yamlValidation node), or the latest we received from the server.
            // we also want to handle extension update that contains a new schema.
            //  in this case I dont think we want to supercede request from server if that setting is true... perhaps we default to false and they have to opt in with a workspace setting?
            // files on disk could be shipped with the extension or previously requested by the extension from the server
            // TODO: add strict compilation settings
        }

        // Fallback to the schema file defined in yamlValidation
        // TODO: This will become falling back to the latest schema from the extension. We can have a well known location for this within the src for the extension.
        return this.getSchemaAssociationFromYamlValidationNode();
    }

    downloadLatestTasksAsYaml(): void {
        if (!this.pat) {
            logger.log(LogMessages.PatRequiredToDownloadTasks, LogEvents.SkippingDownloadLatestTasks);
        }

        if (!this.accountName) {
            logger.log(LogMessages.AccountRequiredToDownloadTasks, LogEvents.SkippingDownloadLatestTasks);
        }

        const credentialHandler: handlers.BasicCredentialHandler = new handlers.BasicCredentialHandler('', this.pat);
        const restClient: typedrestclient.RestClient = new typedrestclient.RestClient(Constants.UserAgent, `https://${this.accountName}.visualstudio.com`, [credentialHandler]);

        // Make sure this runs async so we can load from fallback until done and not block intellisense for the user.
        // Also make sure this gets fired each time we run intellisense, not just once on the first try. Find correct method.
        restClient
                .get<DTData>('_apis/distributedtask/tasks')
                .then((response: typedrestclient.IRestResponse<DTData>) => {
                    logger.log(`Rest client response: ${JSON.stringify(response)}`);

                    if (response && response.result && response.result.value) {
                        const yamlSchemaService: IYamlSchemaService = new YamlSchemaService();
                        const tasksYaml = yamlSchemaService.getSchemaFromTasks(response.result.value);

                        const yamlFileName = 'yaml-schema-from-server-' + new Date().toISOString().replace('T', '-').replace(':', '-').replace(':', '-').replace('.', '-') + '.json'; // "2018-08-17T18:23:56.776Z", TODO: Use regex to replace all instances.
                        const fullFilePath = path.join(this.extensionStoragePath, yamlFileName);

                        fs.writeFile(fullFilePath, tasksYaml);

                        // Set the newest schema file path to be the file we just downloaded. Maybe instead use getSchemaFilePath()?
                        this.schemaFilePath = this.getSchemaFilePath();
                    } 
                    else {
                        // If there's an issue here, log it and continue operating. The file path can continue to be whatever it was before so the extension still works.
                        logger.log(`The structure of the tasks response from the server is unexpeted. ${JSON.stringify(response)}`, 'ErrorWithServerResponseStructure');
                    }
                })
                .catch((err: any) => {
                    logger.log(`${JSON.stringify(err)}`, 'HttpTaskRequestError');
                });
    }

    // For now this is used in the condition where we have one file written to disk and the new one isn't written yet.
    // There is probably some better solution with adding .incomplete to the file.
    // We only ever want 2 max at the same time.
    // TODO: Delete older files once a new one is fully downloaded.
    // TODO: Extract to own class.
    // TODO: Should this go with schema contributor?
    getLatestYamlSchemaFromServerPath(yamlFiles: string[]): string {
        const sorted = yamlFiles.sort((a: string, b: string) => {
            const aLastModified: Date = fs.statSync(a).mtime;
            const bLastModified: Date = fs.statSync(b).mtime;

            if (aLastModified > bLastModified) {
                return 1;
            }

            if (aLastModified < bLastModified) {
                return -1;
            }

            return 0;
        })

        // Return the last file in the list, sorted by modification date/time.
        // vscode.Uri.file(sorted[sorted.length-1]).toString()
        //return sorted[sorted.length-1];

        // Need to make it a vscode URI so that it has the proper structure... file:///...
        return vscode.Uri.file(sorted[sorted.length-1]).toString();
    }

    // TODO: Unit test this, make sure we need the logic in here. Not sure if we do... Add comments.
    // TODO: This should be called over and over, does it reload every time? What kind of caching can we do?
    
    /////////////////////////////////////
    /////////////////////////////////////
    // TODO: Can part of this go away? We either load from well known location (local-schema.json) or we load from server. 
    //          There is nothing user passed except whether or not to load from server. Maybe we just need file association?
    //          What's the difference between this and filenamePatterns. I don't think we need both(prob can skip this).
    //          For this one I think we just want to load from the well known location. What about filetype matching? How is it different than language association?
    /////////////////////////////////////
    /////////////////////////////////////
    getSchemaAssociationFromYamlValidationNode(): ISchemaAssociations {
        // I think contributes activates it in the extension and then we should always return schema associations... don't make it scpecific to a dictionary.
        // Just always return *.* with the schema? Test this for non associated files.
        // Need to make sure this doesn't break other extensions. Though I think the request should only come from the yaml language server? Read vscode docs to be sure.

        // TODO: Is this OK? I am assuming this is only activatede from the yaml language server and shouldn't adversely affect others. What if there are multiple trying to validate this type? We still only want ours I think.
        // This lets them decide the activation file types and pick manually and regardless of file structure we will return the schema to validate against.

        // TODO: In this class maintain the location of the schema file. Update when we download a new one from the server. Load the file on startup based on config settings.
        return { '*.*': [this.schemaFilePath] };
    }
}

// TODO: Do we need this? Why isn't it in vscode?
export interface ISchemaAssociations {
	[pattern: string]: string[];
}

// TODO: Do we need this? Why isn't it in vscode? Does it need to be a namespace?
export namespace SchemaAssociationNotification {
	export const type: languageclient.NotificationType<ISchemaAssociations, any> = new languageclient.NotificationType('json/schemaAssociations');
}
