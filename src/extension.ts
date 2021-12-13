/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License.
*--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as vscode from 'vscode';
import * as languageclient from 'vscode-languageclient/node';

import * as logger from './logger';
import { getSchemaAssociation, locateSchemaFile, SchemaAssociationNotification } from './schema-association-service';
import { schemaContributor, CUSTOM_SCHEMA_REQUEST, CUSTOM_CONTENT_REQUEST } from './schema-contributor';
import { telemetryHelper } from './helpers/telemetryHelper';

export async function activate(context: vscode.ExtensionContext) {
    const configurePipelineEnabled = vscode.workspace.getConfiguration('azure-pipelines').get<boolean>('configure', true);
    telemetryHelper.initialize('azurePipelines.activate', {
        isActivationEvent: 'true',
        configurePipelineEnabled: `${configurePipelineEnabled}`,
    });
    await telemetryHelper.callWithTelemetryAndErrorHandling(async () => {
        await activateYmlContributor(context);
        if (configurePipelineEnabled) {
            const { activateConfigurePipeline } = await import('./configure/activate');
            await activateConfigurePipeline();
        }
    });

    logger.log('Extension has been activated!', 'ExtensionActivated');
    return schemaContributor;
}

async function activateYmlContributor(context: vscode.ExtensionContext) {
    const serverOptions: languageclient.ServerOptions = getServerOptions(context);
    const clientOptions: languageclient.LanguageClientOptions = getClientOptions();
    const client = new languageclient.LanguageClient('azure-pipelines', 'Azure Pipelines Language', serverOptions, clientOptions);

    const disposable = client.start();
    context.subscriptions.push(disposable);

    // If this throws, the telemetry event in activate() will catch & log it
    await client.onReady();

    // Notify the server which schemas to use.
    const schemaFilePath = await locateSchemaFile(context);
    const initialSchemaAssociations = getSchemaAssociation(schemaFilePath);
    client.sendNotification(SchemaAssociationNotification.type, initialSchemaAssociations);

    // Fired whenever the server is about to validate a YAML file (e.g. on content change),
    // and allows us to return a custom schema to use for validation.
    client.onRequest(CUSTOM_SCHEMA_REQUEST, (resource: string) => {
        // TODO: Have a single instance for the extension but dont return a global from this namespace
        return schemaContributor.requestCustomSchema(resource);
    });

    // Fired whenever the server encounters a URI scheme that it doesn't recognize,
    // and allows us to use the URI to determine the schema's content.
    client.onRequest(CUSTOM_CONTENT_REQUEST, (uri: string) => {
        return schemaContributor.requestCustomSchemaContent(uri);
    });

    // TODO: Can we get rid of this since it's set in package.json?
    vscode.languages.setLanguageConfiguration('azure-pipelines', { wordPattern: /("(?:[^\\\"]*(?:\\.)?)*"?)|[^\s{}\[\],:]+/ });

    // Let the server know of any schema changes.
    vscode.workspace.onDidChangeConfiguration(async event => {
        if (event.affectsConfiguration('azure-pipelines.customSchemaFile')) {
            const schemaFilePath = await locateSchemaFile(context);
            const newSchema = getSchemaAssociation(schemaFilePath);
            client.sendNotification(SchemaAssociationNotification.type, newSchema);
        }
    });
}

function getServerOptions(context: vscode.ExtensionContext): languageclient.ServerOptions {
    // TODO: Figure out a way to get sourcemaps working with webpack so that we can always
    // use the webpacked version.
    const languageServerPath = context.extensionMode === vscode.ExtensionMode.Development ?
        context.asAbsolutePath(path.join('node_modules', 'azure-pipelines-language-server', 'out', 'server.js')) :
        context.asAbsolutePath(path.join('dist', 'server.js'));

    return {
        run: { module: languageServerPath, transport: languageclient.TransportKind.ipc },
        debug: { module: languageServerPath, transport: languageclient.TransportKind.ipc, options: { execArgv: ["--nolazy", "--inspect=6009"] } }
    };
}

function getClientOptions(): languageclient.LanguageClientOptions {
    return {
        // Register the server for Azure Pipelines documents
        documentSelector: [
            { language: 'azure-pipelines', scheme: 'file' },
            { language: 'azure-pipelines', scheme: 'untitled' }
        ],
        synchronize: {
            // TODO: Switch to handling the workspace/configuration request
            configurationSection: ['yaml', 'http.proxy', 'http.proxyStrictSSL'],
            // Notify the server about file changes to YAML files in the workspace
            fileEvents: [
                vscode.workspace.createFileSystemWatcher('**/*.?(e)y?(a)ml')
            ]
        },
    };
}

// this method is called when your extension is deactivated
export function deactivate() {
    telemetryHelper.dispose();
}
