import * as path from 'path';
import * as vscode from 'vscode';
import * as languageclient from 'vscode-languageclient';

export interface ISchemaAssociationService {
    getSchemaAssociation(): ISchemaAssociations;
}

export class SchemaAssociationService implements ISchemaAssociationService {

    /* Where the schema file is on disk. This is packaged with the extension, in the root, at local-schema.json. */
    schemaFilePath: string;

    // TODO: Move request from server first?
    constructor(extensionPath: string) {
        this.schemaFilePath = vscode.Uri.file(path.join(extensionPath, './local-schema.json')).toString();
    }

    // TODO: Extract to schema association service
    public getSchemaAssociation(): ISchemaAssociations {
        return { '*.*': [this.schemaFilePath] };
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
