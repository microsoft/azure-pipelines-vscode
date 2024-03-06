/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License.
*--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as vscode from 'vscode';
import * as languageclient from 'vscode-languageclient/node';

import * as logger from './logger';
import { getSchemaAssociation, locateSchemaFile, onDidSelectOrganization, resetDoNotAskState, SchemaAssociationNotification } from './schema-association-service';
import { schemaContributor, CUSTOM_SCHEMA_REQUEST, CUSTOM_CONTENT_REQUEST } from './schema-contributor';
import { telemetryHelper } from './helpers/telemetryHelper';
import { getAzureAccountExtensionApi } from './extensionApis';

/**
 * The unique string that identifies the Azure Pipelines languge.
 */
const LANGUAGE_IDENTIFIER = 'azure-pipelines';

/**
 * The document selector to use when deciding whether to activate Azure Pipelines-specific features.
 */
const DOCUMENT_SELECTOR = [
    { language: LANGUAGE_IDENTIFIER, scheme: 'file' },
    { language: LANGUAGE_IDENTIFIER, scheme: 'untitled' }
]

export async function activate(context: vscode.ExtensionContext) {
    const configurePipelineEnabled = vscode.workspace.getConfiguration(LANGUAGE_IDENTIFIER).get<boolean>('configure', true);
    telemetryHelper.setTelemetry('isActivationEvent', 'true');
    telemetryHelper.setTelemetry('configurePipelineEnabled', `${configurePipelineEnabled}`);
    await telemetryHelper.callWithTelemetryAndErrorHandling('azurePipelines.activate', async () => {
        await activateYmlContributor(context);
        if (configurePipelineEnabled) {
            const { activateConfigurePipeline } = await import('./configure/activate');
            activateConfigurePipeline();
        }
    });

    context.subscriptions.push(telemetryHelper);

    logger.log('Extension has been activated!', 'ExtensionActivated');
    return schemaContributor;
}

async function activateYmlContributor(context: vscode.ExtensionContext) {
    const serverOptions: languageclient.ServerOptions = getServerOptions(context);
    const clientOptions: languageclient.LanguageClientOptions = getClientOptions();
    const client = new languageclient.LanguageClient(LANGUAGE_IDENTIFIER, 'Azure Pipelines Language', serverOptions, clientOptions);

    const disposable = client.start();
    context.subscriptions.push(disposable);

    // If this throws, the telemetry event in activate() will catch & log it
    await client.onReady();

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
    vscode.languages.setLanguageConfiguration(LANGUAGE_IDENTIFIER, { wordPattern: /("(?:[^\\"]*(?:\\.)?)*"?)|[^\s{}[\],:]+/ });

    // Let the server know of any schema changes.
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(async event => {
        if (event.affectsConfiguration('azure-pipelines.customSchemaFile') || event.affectsConfiguration('azure-pipelines.1ESPipelineTemplatesSchemaFile')) {
            await loadSchema(context, client);
        }
    }));

    // Load the schema if we were activated because an Azure Pipelines file.
    if (vscode.window.activeTextEditor?.document.languageId === LANGUAGE_IDENTIFIER) {
        await loadSchema(context, client);
    }

    // And subscribe to future open events, as well.
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(async () => {
        await loadSchema(context, client);
    }));

    // Or if the active editor's language changes.
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(async textDocument => {
        // Ensure this event is due to a language change.
        // Since onDidOpenTextDocument is fired *before* activeTextEditor changes,
        // if the URIs are the same we know that the new text document must be
        // due to a language change.
        if (textDocument.uri !== vscode.window.activeTextEditor?.document.uri) {
            return;
        }

        await loadSchema(context, client);
    }));

    // Re-request the schema when sessions change since auto-detection is dependent on
    // being able to query ADO organizations, check if 1ESPT schema can be used using session credentials.
    const azureAccountApi = await getAzureAccountExtensionApi();
    context.subscriptions.push(azureAccountApi.onSessionsChanged(async () => {
        if (azureAccountApi.status === 'LoggedIn' || azureAccountApi.status === 'LoggedOut') {
            await loadSchema(context, client);
        }
    }));

    // We now have an organization for a non-Azure Repo folder,
    // so we can try auto-detecting the schema again.
    context.subscriptions.push(onDidSelectOrganization(async workspaceFolder => {
        await loadSchema(context, client, workspaceFolder);
    }));

    // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
    context.subscriptions.push(vscode.commands.registerCommand("azure-pipelines.reset-state", async () => await resetDoNotAskState(context)));
}

// Find the schema and notify the server.
async function loadSchema(
    context: vscode.ExtensionContext,
    client: languageclient.LanguageClient,
    workspaceFolder?: vscode.WorkspaceFolder): Promise<void> {
    if (workspaceFolder === undefined) {
        const textDocument = vscode.window.activeTextEditor?.document;
        if (textDocument?.languageId !== LANGUAGE_IDENTIFIER) {
            return;
        }

        workspaceFolder = vscode.workspace.getWorkspaceFolder(textDocument.uri);
    }

    const schemaFilePath = await locateSchemaFile(context, workspaceFolder);
    const schema = getSchemaAssociation(schemaFilePath);
    client.sendNotification(SchemaAssociationNotification.type, schema);
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
        documentSelector: DOCUMENT_SELECTOR,
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
