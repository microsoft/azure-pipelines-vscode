/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License.
*--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as vscode from 'vscode';
import * as languageclient from 'vscode-languageclient/node';

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

    // TODO: Should this inlined into getSchemaAssocations?
    public locateSchemaFile() {
        let alternateSchema = vscode.workspace.getConfiguration('azure-pipelines').get<string>('customSchemaFile');
        console.log("Alternate schema: ", alternateSchema);
        if (alternateSchema?.trim().length ?? 0 === 0) {
            alternateSchema = path.join(this.extensionPath, 'service-schema.json');
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

        this.schemaFilePath = uri.toString();
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
    public getSchemaAssociation(): ISchemaAssociations {
        return { '*': [this.schemaFilePath] };
    }
}

// Mapping of glob pattern -> schemas
export interface ISchemaAssociations {
	[pattern: string]: string[];
}

export namespace SchemaAssociationNotification {
	export const type: languageclient.NotificationType<ISchemaAssociations> = new languageclient.NotificationType('json/schemaAssociations');
}
