/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License.
*--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as vscode from 'vscode';
import { Utils } from 'vscode-uri';
import * as languageclient from 'vscode-languageclient/node';
import * as azdev from 'azure-devops-node-api';
import { format } from 'util';
import { getAzureAccountExtensionApi, getGitExtensionApi } from './extensionApis';
import { OrganizationsClient } from './configure/clients/devOps/organizationsClient';
import { AzureDevOpsHelper } from './configure/helper/devOps/azureDevOpsHelper';
import { showQuickPick } from './configure/helper/controlProvider';
import { QuickPickItemWithData } from './configure/model/models';
import { Messages } from './messages';
import { AzureSession } from './typings/azure-account.api';

const selectOrganizationEvent = new vscode.EventEmitter<vscode.WorkspaceFolder>();
export const onDidSelectOrganization = selectOrganizationEvent.event;

/**
 * A session-level cache of all the organizations we've saved the schema for.
 */
const seenOrganizations = new Set<string>();

export async function locateSchemaFile(
    context: vscode.ExtensionContext,
    workspaceFolder: vscode.WorkspaceFolder | undefined): Promise<string> {
    let schemaUri: vscode.Uri | undefined;
    // TODO: Support auto-detection for Azure Pipelines files outside of the workspace.
    if (workspaceFolder !== undefined) {
        try {
            schemaUri = await autoDetectSchema(context, workspaceFolder);
            if (schemaUri) {
                return schemaUri.toString();
            }
        } catch (error) {
            // Well, we tried our best. Fall back to the predetermined schema paths.
            // TODO: Start exposing errors once we're more confident in the schema detection.
        }
    }

    let alternateSchema = vscode.workspace.getConfiguration('azure-pipelines').get<string>('customSchemaFile', '');
    if (alternateSchema.trim().length === 0) {
        alternateSchema = path.join(context.extensionPath, 'service-schema.json');
    }

    // A somewhat hacky way to support both files and URLs without requiring use of the file:// URI scheme
    if (alternateSchema.toLowerCase().startsWith("http://") || alternateSchema.toLowerCase().startsWith("https://")) {
        schemaUri = vscode.Uri.parse(alternateSchema, true);
    } else if (path.isAbsolute(alternateSchema)) {
        schemaUri = vscode.Uri.file(alternateSchema);
    } else if (workspaceFolder !== undefined) {
        schemaUri = vscode.Uri.file(path.join(workspaceFolder.uri.fsPath, alternateSchema));
    } else {
        schemaUri = vscode.Uri.file(path.join(context.extensionPath, 'service-schema.json'));
    }

    return schemaUri.toString();
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
export function getSchemaAssociation(schemaFilePath: string): ISchemaAssociations {
    return { '*': [schemaFilePath] };
}

async function autoDetectSchema(
    context: vscode.ExtensionContext,
    workspaceFolder: vscode.WorkspaceFolder): Promise<vscode.Uri | undefined> {
    const azureAccountApi = await getAzureAccountExtensionApi();
    if (!(await azureAccountApi.waitForLogin())) {
        // Don't await this message so that we can return the fallback schema instead of blocking.
        // We'll detect the login in extension.ts and then re-request the schema.
        vscode.window.showInformationMessage(Messages.signInForEnhancedIntelliSense, Messages.signInLabel)
            .then(async action => {
                if (action === Messages.signInLabel) {
                    await vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: Messages.waitForAzureSignIn,
                    }, async () => {
                        await vscode.commands.executeCommand("azure-account.login");
                    });
                }
            });

        return undefined;
    }

    // Get the remote URL if we're in a Git repo.
    let remoteUrl: string | undefined;
    const gitExtension = await getGitExtensionApi();
    const repo = gitExtension.getRepository(workspaceFolder.uri);
    if (repo !== null) {
        await repo.status();
        if (repo.state.HEAD?.upstream !== undefined) {
            const remoteName = repo.state.HEAD.upstream.remote;
            remoteUrl = repo.state.remotes.find(remote => remote.name === remoteName)?.fetchUrl;
        }
    }

    let organizationName: string;
    let session: AzureSession | undefined;
    if (remoteUrl !== undefined && AzureDevOpsHelper.isAzureReposUrl(remoteUrl)) {
        // If we're in an Azure repo, we can silently determine the organization name and session.
        organizationName = AzureDevOpsHelper.getRepositoryDetailsFromRemoteUrl(remoteUrl).organizationName;
        for (const azureSession of azureAccountApi.sessions) {
            const organizationsClient = new OrganizationsClient(azureSession.credentials2);
            const organizations = await organizationsClient.listOrganizations();
            if (organizations.find(org => org.accountName.toLowerCase() === organizationName.toLowerCase())) {
                session = azureSession;
                break;
            }
        }
    } else {
        const azurePipelinesDetails = context.workspaceState.get<{
            [folder: string]: { organization: string; tenant: string; }
        }>('azurePipelinesDetails');
        if (azurePipelinesDetails?.[workspaceFolder.name] !== undefined) {
            // If we already have cached information for this workspace folder, use it.
            const details = azurePipelinesDetails[workspaceFolder.name];
            organizationName = details.organization;
            session = azureAccountApi.sessions.find(session => session.tenantId === details.tenant);
        } else {
            // Otherwise, we need to manually prompt.
            // We do this by asking them to select an organization via an information message,
            // then displaying the quick pick of all the organizations they have access to.
            // We *do not* await this message so that we can use the fallback schema while waiting.
            // We'll detect when they choose the organization in extension.ts and then re-request the schema.
            vscode.window.showInformationMessage(
                format(Messages.selectOrganizationForEnhancedIntelliSense, workspaceFolder.name),
                Messages.selectOrganizationLabel)
                .then(async action => {
                    if (action === Messages.selectOrganizationLabel) {
                        // Lazily construct list of organizations so that we can immediately show the quick pick,
                        // then fill in the choices as they come in.
                        const organizationAndSessionsPromise = new Promise<
                            QuickPickItemWithData<AzureSession>[]
                        >(async resolve => {
                            const organizationAndSessions: QuickPickItemWithData<AzureSession>[] = [];

                            // FIXME: azureAccountApi.sessions changes under us. Why?
                            for (const azureSession of azureAccountApi.sessions) {
                                const organizationsClient = new OrganizationsClient(azureSession.credentials2);
                                const organizations = await organizationsClient.listOrganizations();
                                organizationAndSessions.push(...organizations.map(organization => ({
                                    label: organization.accountName,
                                    data: azureSession,
                                })));
                            }

                            resolve(organizationAndSessions);
                        });

                        const selectedOrganizationAndSession = await showQuickPick(
                            'organization',
                            organizationAndSessionsPromise, {
                                placeHolder: format(Messages.selectOrganizationPlaceholder, workspaceFolder.name),
                        });

                        if (selectedOrganizationAndSession === undefined) {
                            return;
                        }

                        organizationName = selectedOrganizationAndSession.label;
                        session = selectedOrganizationAndSession.data;

                        await context.workspaceState.update('azurePipelinesDetails', {
                            ...azurePipelinesDetails,
                            [workspaceFolder.name]: {
                                organization: organizationName,
                                tenant: session.tenantId,
                            }
                        });

                        selectOrganizationEvent.fire(workspaceFolder);
                    }
                });
            return undefined;
        }
    }

    // Not logged into an account that has access.
    if (session === undefined) {
        vscode.window.showErrorMessage(format(Messages.unableToAccessOrganization, organizationName));
        return undefined;
    }

    // Create the global storage folder to guarantee that it exists.
    await vscode.workspace.fs.createDirectory(context.globalStorageUri);

    // Grab and save the schema if we haven't already seen the organization this session.
    // NOTE: Despite saving the schema to disk, we can't use it as a persistent cache because:
    // 1. ADO doesn't provide an API to indicate which version (milestone) it's on,
    //    so we don't have a way of busting the cache.
    // 2. Even if we did, organizations can add/remove tasks at any time.
    // So we do the next-best thing and keep a session-level cache so we only
    // hit the network to request an updated schema for an organization once per session.
    const schemaUri = Utils.joinPath(context.globalStorageUri, `${organizationName}-schema.json`);
    if (seenOrganizations.has(organizationName)) {
        return schemaUri;
    }

    const token = await session.credentials2.getToken();
    const authHandler = azdev.getBearerHandler(token.accessToken);
    const azureDevOpsClient = new azdev.WebApi(`https://dev.azure.com/${organizationName}`, authHandler);
    const taskAgentApi = await azureDevOpsClient.getTaskAgentApi();
    const schema = JSON.stringify(await taskAgentApi.getYamlSchema());
    await vscode.workspace.fs.writeFile(schemaUri, Buffer.from(schema));

    seenOrganizations.add(organizationName);

    return schemaUri;
}

// Mapping of glob pattern -> schemas
interface ISchemaAssociations {
	[pattern: string]: string[];
}

export namespace SchemaAssociationNotification {
	export const type = new languageclient.NotificationType<ISchemaAssociations>('json/schemaAssociations');
}
