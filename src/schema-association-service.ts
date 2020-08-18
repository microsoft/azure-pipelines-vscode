/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License.
*--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as vscode from 'vscode';
import * as languageclient from 'vscode-languageclient';

export interface ISchemaAssociationService {
    getSchemaAssociation(): ISchemaAssociations;
    locateSchemaFile(): void;
}

export class SchemaAssociationService implements ISchemaAssociationService {

    extensionPath: string;
    schemaFilePath: string;

    constructor(extensionPath: string) {
        this.extensionPath = extensionPath;
        this.locateSchemaFile();
    }

    public locateSchemaFile() {
        let alternateSchema = vscode.workspace.getConfiguration('[azure-pipelines]', null).get<string>('customSchemaFile');
        if (!alternateSchema || !path.isAbsolute(alternateSchema)) {
            alternateSchema = path.resolve(vscode.workspace.rootPath, alternateSchema);
        }
        const schemaPath = alternateSchema || path.join(this.extensionPath, './service-schema.json');
        this.schemaFilePath = vscode.Uri.file(schemaPath).toString();
    }

    public getSchemaAssociation(): ISchemaAssociations {
        return { '*': [this.schemaFilePath] };
    }
}

// TODO: Do we need this?
export interface ISchemaAssociations {
	[pattern: string]: string[];
}

// TODO: Do we need this?
export namespace SchemaAssociationNotification {
	export const type: languageclient.NotificationType<ISchemaAssociations, any> = new languageclient.NotificationType('json/schemaAssociations');
}
