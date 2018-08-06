'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import * as path from 'path';
import * as vscode from 'vscode';

//import * as fs from 'fs';

//fs.writeFileSync('C:\stuff.txt', '');

import * as languageclient from 'vscode-languageclient';
import { schemaContributor, CUSTOM_SCHEMA_REQUEST, CUSTOM_CONTENT_REQUEST } from './schema-contributor'

export interface ISchemaAssociations {
	[pattern: string]: string[];
}

namespace SchemaAssociationNotification {
	export const type: languageclient.NotificationType<ISchemaAssociations, any> = new languageclient.NotificationType('json/schemaAssociations');
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    log('1. Extension has been activated!');

    let serverModule = context.asAbsolutePath(path.join('node_modules', 'yaml-language-server', 'out', 'server', 'src', 'server.js'));
    //log('2. Server module defined.');

    // The debug options for the server
    let debugOptions = { execArgv: ["--nolazy", "--debug=6009"] };
    //log('3. Debug options defined.');

    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    let serverOptions: languageclient.ServerOptions = {
        run : { module: serverModule, transport: languageclient.TransportKind.ipc },
        debug: { module: serverModule, transport: languageclient.TransportKind.ipc, options: debugOptions }
    };
    //log('4. Server options defined');

    // Options to control the language client
    let clientOptions: languageclient.LanguageClientOptions = {
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
        //initializationOptions: { }, // TODO: Could we pass the local folder name here? Might have to modify the server code... Or do a PR?
    };

    var config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration();
    config.update("testsection", "testvalue");
    //log('4.5. Workspace configuration modified.');

    //log('5. Client options defined.');

    let client = new languageclient.LanguageClient('azure-pipelines', 'Azure Pipelines Support', serverOptions, clientOptions);
    //log('6. Language client defined.');

    let disposable = client.start();
    //log('7. Client started.');

    context.subscriptions.push(disposable);
    //log('8. Client added as a disposable.');
    
    client.onReady().then(() => {
        log('9. Client ready.');

        client.sendNotification(SchemaAssociationNotification.type, getSchemaAssociation(context));
        // TODO: Very important, can we use this to send schema association ourselves?

        //log('9.a. Schema association notification sent.')

        client.onRequest(CUSTOM_SCHEMA_REQUEST, (resource: any) => {
            log('Custom schema request. Resource: ' + JSON.stringify(resource));
            return schemaContributor.requestCustomSchema(resource);
        });
        client.onRequest(CUSTOM_CONTENT_REQUEST, (uri: any) => {
            log('Custom content request.');
            return schemaContributor.requestCustomSchemaContent(uri);
        });
    });

    //fs.writeFileSync('E:\\stufffffff.txt', 'sdfsadfasdf');
    //fs.appendFileSync()

    
    //log('10. Setting language configuration.');
    // vscode.languages.setLanguageConfiguration('yaml', {
    //     wordPattern: /("(?:[^\\\"]*(?:\\.)?)*"?)|[^\s{}\[\],:]+/
    // });

    vscode.languages.setLanguageConfiguration('azure-pipelines', {
        wordPattern: /("(?:[^\\\"]*(?:\\.)?)*"?)|[^\s{}\[\],:]+/
    });

    log('11. Returning schema contributor.');
    return schemaContributor;
}

function getSchemaAssociation(context: vscode.ExtensionContext): ISchemaAssociations {
    log('getSchemaAssociation');
    let associations: ISchemaAssociations = {};
    console.log('1');
    
	vscode.extensions.all.forEach(extension => {
        const packageJSON = extension.packageJSON;
        
		if (packageJSON && packageJSON.contributes && packageJSON.contributes.yamlValidation) {
			const yamlValidation = packageJSON.contributes.yamlValidation;
            
            if (Array.isArray(yamlValidation)) {
				yamlValidation.forEach(jv => {
                    let { fileMatch, url } = jv;
                    
					if (fileMatch && url) {
						if (url[0] === '.' && url[1] === '/') {
                            console.log('should get here');
							url = vscode.Uri.file(path.join(extension.extensionPath, url)).toString();
                        }
                        
						if (fileMatch[0] === '%') {
							fileMatch = fileMatch.replace(/%APP_SETTINGS_HOME%/, '/User');
							fileMatch = fileMatch.replace(/%APP_WORKSPACES_HOME%/, '/Workspaces');
						} else if (fileMatch.charAt(0) !== '/' && !fileMatch.match(/\w+:\/\//)) {
                            console.log('bad');
							fileMatch = '/' + fileMatch;
                        }
                        
                        let association = associations[fileMatch];
                        
						if (!association) {
							association = [];
							associations[fileMatch] = association;
                        }
                        
						association.push(url);
					}
				});
			}
		}
    });
    
    console.log(`Schema associations: ${JSON.stringify(associations)}`);

	return associations;
}

function log(message: string){
    // easily turn logging on and off
    console.log(message);
}

// this method is called when your extension is deactivated
export function deactivate() {
}