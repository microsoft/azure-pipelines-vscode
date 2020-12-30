/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License.
*--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as vscode from 'vscode';
import { createTelemetryReporter, callWithTelemetryAndErrorHandling, IActionContext, AzureUserInput, registerUIExtensionVariables } from 'vscode-azureextensionui';
import * as languageclient from 'vscode-languageclient';

import { extensionVariables } from './configure/model/models';
import * as logger from './logger';
import { SchemaAssociationService, SchemaAssociationNotification } from './schema-association-service';
import { schemaContributor, CUSTOM_SCHEMA_REQUEST, CUSTOM_CONTENT_REQUEST } from './schema-contributor';
import { telemetryHelper } from './configure/helper/telemetryHelper';
import { TelemetryKeys } from './configure/resources/telemetryKeys';

export async function activate(context: vscode.ExtensionContext) {
    extensionVariables.reporter = createTelemetryReporter(context);
    registerUiVariables(context);

    const configurePipelineEnabled = vscode.workspace.getConfiguration('[azure-pipelines]').get<boolean>('configure', true);
    await callWithTelemetryAndErrorHandling('azurePipelines.activate', async (activateContext: IActionContext) => {
        activateContext.telemetry.properties.isActivationEvent = 'true';
        telemetryHelper.initialize(activateContext, 'activate');
        telemetryHelper.setTelemetry('configurePipelineEnabled', `${configurePipelineEnabled}`);
        await telemetryHelper.executeFunctionWithTimeTelemetry(
            async () => {
                await activateYmlContributor(context);
                if (configurePipelineEnabled) {
                    const { activateConfigurePipeline } = await import('./configure/activate');
                    await activateConfigurePipeline();
                }
            },
            TelemetryKeys.ExtensionActivationDuration);
    });

    logger.log('Extension has been activated!', 'ExtensionActivated');
    return schemaContributor;
}

function registerUiVariables(context: vscode.ExtensionContext) {
    // Register ui extension variables is required to be done for telemetry to start flowing for extension activation and other events.
    // It also facilitates registering command and called events telemetry.
    extensionVariables.outputChannel = vscode.window.createOutputChannel('Azure Pipelines');
    context.subscriptions.push(extensionVariables.outputChannel);
    extensionVariables.context = context;
    extensionVariables.ui = new AzureUserInput(context.globalState);
    registerUIExtensionVariables(extensionVariables);
}

async function activateYmlContributor(context: vscode.ExtensionContext) {
    const serverOptions: languageclient.ServerOptions = getServerOptions(context);
    const clientOptions: languageclient.LanguageClientOptions = getClientOptions();
    const client = new languageclient.LanguageClient('azure-pipelines', 'Azure Pipelines Language', serverOptions, clientOptions);

    const schemaAssociationService = new SchemaAssociationService(context.extensionPath);

    const disposable = client.start();
    context.subscriptions.push(disposable);

    const initialSchemaAssociations = schemaAssociationService.getSchemaAssociation();

    await client.onReady().then(() => {
        //logger.log(`${JSON.stringify(initialSchemaAssociations)}`, 'SendInitialSchemaAssociation');
        client.sendNotification(SchemaAssociationNotification.type, initialSchemaAssociations);

        // TODO: Should we get rid of these events and handle other events like Ctrl + Space? See when this event gets fired and send updated schema on that event.
        client.onRequest(CUSTOM_SCHEMA_REQUEST, (resource: any) => {
            //logger.log('Custom schema request. Resource: ' + JSON.stringify(resource), 'CustomSchemaRequest');

            // TODO: Can this return the location of the new schema file?
            return schemaContributor.requestCustomSchema(resource); // TODO: Have a single instance for the extension but dont return a global from this namespace.
        });

        // TODO: Can we get rid of this? Never seems to happen.
        client.onRequest(CUSTOM_CONTENT_REQUEST, (uri: any) => {
            //logger.log('Custom content request.', 'CustomContentRequest');

            return schemaContributor.requestCustomSchemaContent(uri);
        });
    })
        .catch((reason) => {
            logger.log(JSON.stringify(reason), 'ClientOnReadyError');
            extensionVariables.reporter.sendTelemetryEvent('extension.languageserver.onReadyError', { 'reason': JSON.stringify(reason) });
        });

    // TODO: Can we get rid of this since it's set in package.json?
    vscode.languages.setLanguageConfiguration('azure-pipelines', { wordPattern: /("(?:[^\\\"]*(?:\\.)?)*"?)|[^\s{}\[\],:]+/ });

    // when config changes, refresh the schema
    vscode.workspace.onDidChangeConfiguration(e => {
        schemaAssociationService.locateSchemaFile();
        const newSchema = schemaAssociationService.getSchemaAssociation();
        if (newSchema['*'][0] != initialSchemaAssociations['*'][0])
        {
            vscode.window.showInformationMessage("Azure Pipelines schema changed. Restart VS Code to see the changes.");
            // this _should_ cause the language server to refresh its config
            // but that doesn't seem to be happening
            client.sendNotification(SchemaAssociationNotification.type, newSchema);
        }
    });
}

function getServerOptions(context: vscode.ExtensionContext): languageclient.ServerOptions {
    const languageServerPath = context.asAbsolutePath(path.join('node_modules', 'azure-pipelines-language-server', 'out', 'server.js'));

    return {
        run: { module: languageServerPath, transport: languageclient.TransportKind.ipc },
        debug: { module: languageServerPath, transport: languageclient.TransportKind.ipc, options: { execArgv: ["--nolazy", "--inspect=6009"] } }
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
            // TODO: Are these what settings we want to pass through to the server? Would be good to see this happening... And see initializeOptions. Maybe remove them?
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
