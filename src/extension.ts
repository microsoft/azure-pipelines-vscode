/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

'use strict';

import * as languageclient from 'vscode-languageclient';
import * as logger from './logger';
import * as path from 'path';
import * as schemacontributor from './schema-contributor'
import * as vscode from 'vscode';
import * as schemaassociationservice from './schema-association-service';
import { CommandNames } from './helpers/constants';
import { ICredentialManager, CredentialManager, CredentialNames } from './credentials/credential-manager';
//import { CredentialStore } from './credentialstore/credentialstore';

export interface IAzurePipelinesConfiguration {
    account: string;
    pat: string;
}

// Use the console to output diagnostic information (console.log) and errors (console.error)
// This line of code will only be executed once when your extension is activated
export async function activate(context: vscode.ExtensionContext) {
    logger.log('Extension has been activated!', 'ExtensionActivated'); // TODO: Add extension name.

    const credentialManager: ICredentialManager = new CredentialManager();

    const accountFromConfig: string | undefined = vscode.workspace.getConfiguration('azure-pipelines').get('account');
    let account: string = '';
    if (accountFromConfig) {
        account = accountFromConfig;
    }

    let pat: string = '';
    const patFromStore = await credentialManager.get(CredentialNames.PAT);
    if (patFromStore) {
        pat = patFromStore;
    }

    // TODO: Disable my pat since it will be in source history.

    const serverOptions: languageclient.ServerOptions = getServerOptions(context);
    const clientOptions: languageclient.LanguageClientOptions = getClientOptions();
    const client = new languageclient.LanguageClient('azure-pipelines', 'Azure Pipelines Support', serverOptions, clientOptions);

    const requestSchemaFromServer: boolean = true; // TODO: Allow a config setting to make this true. Or assume true if creds provided? Make this auto request from server... Add it as a setting. Default to false. Update readme.

    const schemaAssociationService: schemaassociationservice.ISchemaAssociationService = new schemaassociationservice.SchemaAssociationService(context.storagePath, requestSchemaFromServer, context.extensionPath, { account: account, pat: pat});

    const disposable = client.start();
    context.subscriptions.push(disposable);
    
    client.onReady()
    .then(() => {
        const initialSchemaAssociations: schemaassociationservice.ISchemaAssociations = schemaAssociationService.getSchemaAssociation(); // TODO: Pass in current extension path.
        logger.log(`${JSON.stringify(initialSchemaAssociations)}`, 'SendInitialSchemaAssociation');
        client.sendNotification(schemaassociationservice.SchemaAssociationNotification.type, initialSchemaAssociations);

        // TODO: Should we get rid of these events and handle other events like Ctrl + Space? See when this event gets fired.
        // It's a hack but we could hijack this event to load latest server content.
        client.onRequest(schemacontributor.CUSTOM_SCHEMA_REQUEST, (resource: any) => {
            logger.log('Custom schema request. Resource: ' + JSON.stringify(resource), 'CustomSchemaRequest');


            // TODO: Can this return the location of the new schema file?
            return schemacontributor.schemaContributor.requestCustomSchema(resource); // TODO: Have a single instance for the extension but dont return a global from this namespace.
        });

        // TODO: Can we get rid of this? Never seems to happen.
        client.onRequest(schemacontributor.CUSTOM_CONTENT_REQUEST, (uri: any) => {
            logger.log('Custom content request.', 'CustomContentRequest');
            return schemacontributor.schemaContributor.requestCustomSchemaContent(uri);
        });
    })
    .catch((reason) => {
        logger.log(reason, 'ClientOnReady.Error');
    });

    // TODO: Can we get rid of this since it's set in package.json?
    vscode.languages.setLanguageConfiguration('azure-pipelines', { wordPattern: /("(?:[^\\\"]*(?:\\.)?)*"?)|[^\s{}\[\],:]+/ });


    // Register command to display current schema file
    // TODO: This is mostly to help debugging. Maybe remove later?
    const displayCurrentSchemaFileDisposable = vscode.commands.registerCommand(CommandNames.DisplayCurrentSchemaFile, () => {
        vscode.window.showInformationMessage('Current schema file: ' + schemaAssociationService.schemaFilePath);
    });
    context.subscriptions.push(displayCurrentSchemaFileDisposable);

    // Register command to force load latest task schema from server
    const loadLatestTaskSchemaDisposable = vscode.commands.registerCommand(CommandNames.LoadLatestTaskSchema, () => {
        vscode.window.showInformationMessage('Latest task schema loaded.');
    });
    context.subscriptions.push(loadLatestTaskSchemaDisposable);

    // Register command to sign in using PAT.
    console.log(CommandNames.Signin);
    const signinDisposable = vscode.commands.registerCommand(CommandNames.Signin, async function() {
        // TODO: Make sure account is setup as workspace setting first.
        const token: string | undefined = await vscode.window.showInputBox({ value: "", prompt: `Provide the personal access token for your account (${account})`, placeHolder: "", password: true });
        console.log('token: ' + token);

        if (token) {
            credentialManager.set(CredentialNames.PAT, token);
            vscode.window.showInformationMessage('PAT saved securely.');

            // TODO: Update pat value in SchemaAssociationService
        }
        else {
            // TODO: Because it's empty? What else could go wrong.
            vscode.window.showInformationMessage('Unable to save PAT.');
        }
    });
    context.subscriptions.push(signinDisposable);

    // Register command to sign out. This deletes the PAT from secure storage.
    // TODO: These need to be stored per account too...
    const signoutDisposable = vscode.commands.registerCommand(CommandNames.Signout, async function() {
        await credentialManager.delete(CredentialNames.PAT);
        vscode.window.showInformationMessage('Signout successful.');

        // TODO: Update pat value in SchemaAssociationService
    });
    context.subscriptions.push(signoutDisposable);

    return schemacontributor.schemaContributor;
}

function getServerOptions(context: vscode.ExtensionContext): languageclient.ServerOptions {
    const languageServerPath = context.asAbsolutePath(path.join('node_modules', 'yaml-language-server', 'out', 'server', 'src', 'server.js'));

    return {
        run : { module: languageServerPath, transport: languageclient.TransportKind.ipc },
        debug: { module: languageServerPath, transport: languageclient.TransportKind.ipc, options: { execArgv: ["--nolazy", "--debug=6009"] } }
    };
}

function getClientOptions(): languageclient.LanguageClientOptions {
    return {
        // Register the server for plain text documents
        documentSelector: [
            { language: 'azure-pipelines', scheme: 'file' },
            { language: 'azure-pipelines', scheme: 'untitled' }
        ],
        synchronize: {
            // Synchronize the setting section 'languageServerExample' to the server
            // TODO: Are these what settings we want to pass through to the server? Would be good to see this happening... And see initializeOptions
            configurationSection: ['yaml', 'http.proxy', 'http.proxyStrictSSL'],
            // Notify the server about file changes to '.clientrc files contain in the workspace
            fileEvents: [
                vscode.workspace.createFileSystemWatcher('**/*.?(e)y?(a)ml'),
                vscode.workspace.createFileSystemWatcher('**/*.json')
            ]
        },
    };
}

// this method is called when your extension is deactivated
export function deactivate() {
}
