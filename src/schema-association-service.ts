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
import { getGitExtensionApi } from './extensionApis';
import { OrganizationsClient } from './clients/devOps/organizationsClient';
import { getRepositoryDetailsFromRemoteUrl, isAzureReposUrl } from './helpers/azureDevOpsHelper';
import { showQuickPick } from './helpers/controlProvider';
import * as logger from './logger';
import * as Messages from './messages';
import { get1ESPTSchemaUri, getCached1ESPTSchema, get1ESPTRepoIdIfAvailable, delete1ESPTSchemaFileIfPresent } from './schema-association-service-1espt';

const selectOrganizationEvent = new vscode.EventEmitter<vscode.WorkspaceFolder>();
export const onDidSelectOrganization = selectOrganizationEvent.event;

/**
 * A session-level cache of all the organizations we've saved the schema for.
 */
const seenOrganizations = new Set<string>();
const lastUpdated1ESPTSchema = new Map<string, Date>();

const DO_NOT_ASK_SIGN_IN_KEY = "DO_NOT_ASK_SIGN_IN_KEY";
const DO_NOT_ASK_SELECT_ORG_KEY = "DO_NOT_ASK_SELECT_ORG_KEY";

const AZURE_DEVOPS_SCOPES = [
    // It would be better to use the fine-grained scopes,
    // but we need to wait for VS Code to support them.
    // https://github.com/microsoft/vscode/issues/201679
    '499b84ac-1321-427f-aa17-267ca6975798/.default',
    // // Get YAML schema
    // '499b84ac-1321-427f-aa17-267ca6975798/vso.agentpools',
    // // Get ADO orgs
    // '499b84ac-1321-427f-aa17-267ca6975798/vso.profile',
];

let repoId1espt: string | undefined = undefined;

export async function resetDoNotAskState(context: vscode.ExtensionContext) {
    await context.globalState.update(DO_NOT_ASK_SIGN_IN_KEY, undefined);
    await context.globalState.update(DO_NOT_ASK_SELECT_ORG_KEY, undefined);
    logger.log("State is reset");
}

export async function locateSchemaFile(
    context: vscode.ExtensionContext,
    workspaceFolder: vscode.WorkspaceFolder | undefined): Promise<string> {
    let schemaUri: vscode.Uri | undefined;
    // TODO: Support auto-detection for Azure Pipelines files outside of the workspace.
    if (workspaceFolder !== undefined) {
        try {
            logger.log(`Detecting schema for workspace folder ${workspaceFolder.name}`, 'SchemaDetection');
            schemaUri = await autoDetectSchema(context, workspaceFolder);
            if (schemaUri) {
                logger.log(
                    `Detected schema for workspace folder ${workspaceFolder.name}: ${schemaUri.path}`,
                    'SchemaDetection');
                return schemaUri.path;
            }
        } catch (error) {
            // Well, we tried our best. Fall back to the predetermined schema paths.
            // TODO: Re-throw error once we're more confident in the schema detection.
            logger.log(
                `Error auto-detecting schema for workspace folder ${workspaceFolder.name}: ${String(error)}`,
                'SchemaDetection');
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

    logger.log(
        `Using hardcoded schema for workspace folder ${workspaceFolder?.name ?? 'ANONYMOUS_WORKSPACE'}: ${schemaUri.path}`,
        'SchemaDetection');

    // TODO: We should update getSchemaAssociations so we don't need to constantly
    // notify the server of a "new" schema when in reality we're simply updating
    // associations -- which is exactly what getSchemaAssociations is there for!
    return schemaUri.path;
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
    const azureDevOpsSession = await getAzureDevOpsSession(context);
    if (azureDevOpsSession === undefined) {
        logger.log(`Not logged in`, 'SchemaDetection');
        return undefined;
    }

    // Get the remote URL if we're in a Git repo.
    let remoteUrl: string | undefined;

    try {
        const gitExtension = await getGitExtensionApi();

        // Use openRepository because it's possible the Git extension hasn't
        // finished opening all the repositories yet, and thus getRepository
        // may return null if an Azure Pipelines file is open on startup.
        const repo = await gitExtension.openRepository(workspaceFolder.uri);
        if (repo !== null) {
            await repo.status();
            if (repo.state.HEAD?.upstream !== undefined) {
                const remoteName = repo.state.HEAD.upstream.remote;
                remoteUrl = repo.state.remotes.find(remote => remote.name === remoteName)?.fetchUrl;
                if (remoteUrl !== undefined) {
                    logger.log(`Found remote URL for ${workspaceFolder.name}: ${remoteUrl}`, 'SchemaDetection');
                }
            }
            // get remoteUrl for dev branches
            else if (repo.state.remotes.length > 0) {
                remoteUrl = repo.state.remotes[0].fetchUrl;
            }
        }
    } catch (error) {
        // Log and that's it - perhaps they're not in a Git repo, and so don't have the Git extension enabled.
        logger.log(`${workspaceFolder.name} has no remote URLs: ${String(error)}`, 'SchemaDetection');
    }

    let organizationName: string;
    if (remoteUrl !== undefined && isAzureReposUrl(remoteUrl)) {
        logger.log(`${workspaceFolder.name} is an Azure repo`, 'SchemaDetection');

        // If we're in an Azure repo, we can silently determine the organization name.
        organizationName = getRepositoryDetailsFromRemoteUrl(remoteUrl).organizationName;

        logger.log(`Using organization "${organizationName}"`, 'SchemaDetection');
    } else {
        logger.log(`${workspaceFolder.name} has no remote URL or is not an Azure repo`, 'SchemaDetection');

        const azurePipelinesDetails = context.workspaceState.get<
            Record<string, { organization: string; tenant: string; }>
        >('azurePipelinesDetails');
        if (azurePipelinesDetails?.[workspaceFolder.name] !== undefined) {
            // If we already have cached information for this workspace folder, use it.
            organizationName = azurePipelinesDetails[workspaceFolder.name].organization;

            logger.log(
                `Using cached organization for ${workspaceFolder.name}: ${organizationName}`,
                'SchemaDetection');
        } else {
            const doNotAskAgainSelectOrg = context.globalState.get<boolean>(DO_NOT_ASK_SELECT_ORG_KEY);
            if (doNotAskAgainSelectOrg) {
                logger.log(`Not prompting for organization - do not ask again was set`, 'SchemaDetection');
                return undefined;
            }

            logger.log(`Retrieving organizations for ${workspaceFolder.name}`, 'SchemaDetection');

            const organizationsClient = new OrganizationsClient(azureDevOpsSession.accessToken);
            const organizations = (await organizationsClient.listOrganizations()).map(({ accountName }) => accountName);

            logger.log(`${organizations.length} organizations found - prompting for ${workspaceFolder.name}`, 'SchemaDetection');

            // Otherwise, we need to manually prompt.
            // We do this by asking them to select an organization via an information message,
            // then displaying the quick pick of all the organizations they have access to.
            // We *do not* await this message so that we can use the fallback schema while waiting.
            // We'll detect when they choose the organization in extension.ts and then re-request the schema.
            void vscode.window.showInformationMessage(
                format(Messages.selectOrganizationForEnhancedIntelliSense, workspaceFolder.name),
                Messages.selectOrganizationLabel,
                Messages.doNotAskAgain
            ).then(async action => {
                if (action === Messages.selectOrganizationLabel) {
                    const quickPickItems: vscode.QuickPickItem[] =
                        organizations.map(organization => ({ label: organization }));
                    quickPickItems.push({ label: 'Other options', kind: vscode.QuickPickItemKind.Separator });
                    quickPickItems.push({ label: Messages.signInWithADifferentAccountLabel })
                    quickPickItems.push({ label: Messages.changeTenantLabel })

                    const selectedOrganization = await showQuickPick(
                        'organization',
                        quickPickItems, {
                        placeHolder: format(Messages.selectOrganizationPlaceholder, workspaceFolder.name),
                    });

                    if (selectedOrganization === undefined) {
                        logger.log(`No organization picked for ${workspaceFolder.name}`, 'SchemaDetection');
                        return;
                    }

                    if (selectedOrganization.label === Messages.signInWithADifferentAccountLabel) {
                        logger.log('Signing in with a different account', 'SchemaDetection');
                        await getAzureDevOpsSession(context, {
                            clearSessionPreference: true,
                            createIfNone: true,
                        });
                        return undefined;
                    } else if (selectedOrganization.label === Messages.changeTenantLabel) {
                        logger.log('Opening tenant settings', 'SchemaDetection');
                        await vscode.env.openExternal(vscode.Uri.parse(`${vscode.env.uriScheme}://settings/${context.extension.id.split('.')[1]}.tenant`));
                        return undefined;
                    }

                    organizationName = selectedOrganization.label;

                    logger.log(`Associating organization "${organizationName}" with ${workspaceFolder.name}`, 'SchemaDetection');

                    await context.workspaceState.update('azurePipelinesDetails', {
                        ...azurePipelinesDetails,
                        [workspaceFolder.name]: {
                            organization: organizationName,
                        }
                    });

                    selectOrganizationEvent.fire(workspaceFolder);
                } else if (action === Messages.doNotAskAgain) {
                    await context.globalState.update(DO_NOT_ASK_SELECT_ORG_KEY, true);
                }
            });
            return undefined;
        }
    }

    const organizationsClient = new OrganizationsClient(azureDevOpsSession.accessToken);
    const organizations = await organizationsClient.listOrganizations();
    if (!organizations.map(({ accountName }) => accountName).includes(organizationName)) {
        logger.log(`Account does not have access to ${organizationName}`, 'SchemaDetection');

        void vscode.window.showErrorMessage(
            format(Messages.unableToAccessOrganization, organizationName),
            Messages.signInWithADifferentAccountLabel,
            Messages.changeTenantLabel,
        ).then(async action => {
            if (action === Messages.signInWithADifferentAccountLabel) {
                logger.log('Signing in with a different account', 'SchemaDetection');
                await getAzureDevOpsSession(context, {
                    clearSessionPreference: true,
                    createIfNone: true,
                });
            } else if (action === Messages.changeTenantLabel) {
                logger.log('Opening tenant settings', 'SchemaDetection');
                await vscode.env.openExternal(vscode.Uri.parse(`${vscode.env.uriScheme}://settings/${context.extension.id.split('.')[1]}.tenant`));
            }
        });

        await delete1ESPTSchemaFileIfPresent(context);
        return undefined;
    }

    // Create the global storage folder to guarantee that it exists.
    await vscode.workspace.fs.createDirectory(context.globalStorageUri);

    logger.log(`Retrieving ${organizationName} schema for ${workspaceFolder.name}`, 'SchemaDetection');

    // Try to fetch schema in the following order:
    // 1. Cached 1ESPT schema
    // 2. 1ESPT schema if user is signed in with microsoft account and has enabled 1ESPT schema
    // 3. Cached Organization specific schema
    // 4. Organization specific schema
    const authHandler = azdev.getBearerHandler(azureDevOpsSession.accessToken);
    const azureDevOpsClient = new azdev.WebApi(`https://dev.azure.com/${organizationName}`, authHandler);

    // Cache the response - this is why this method returns empty strings instead of undefined.
    if (repoId1espt === undefined) {
        repoId1espt = await get1ESPTRepoIdIfAvailable(azureDevOpsClient, organizationName);
    }

    if (repoId1espt.length > 0) {
        // user has enabled 1ESPT schema
        if (vscode.workspace.getConfiguration('azure-pipelines', workspaceFolder).get<boolean>('1ESPipelineTemplatesSchemaFile', false)) {
            const cachedSchemaUri1ESPT = await getCached1ESPTSchema(context, organizationName, azureDevOpsSession, lastUpdated1ESPTSchema);
            if (cachedSchemaUri1ESPT) {
                return cachedSchemaUri1ESPT;
            }
            else {
                // if user is signed in with microsoft account and has enabled 1ESPipeline Template Schema, then give preference to 1ESPT schema
                const schemaUri1ESPT = await get1ESPTSchemaUri(azureDevOpsClient, organizationName, azureDevOpsSession, context, repoId1espt);
                if (schemaUri1ESPT) {
                    lastUpdated1ESPTSchema.set(organizationName, new Date());
                    return schemaUri1ESPT;
                }
            }
        }
        // If 1ESPT schema is not enabled, show a pop-up option to enable it for enhanced intellisense
        else {
            if (context.globalState.get('doNotAskAgain1ESPTSchema') == undefined || !context.globalState.get('doNotAskAgain1ESPTSchema')) {
                const schema1esptPopupResponse = await vscode.window.showInformationMessage(Messages.userEligibleForEnahanced1ESPTIntellisense, Messages.enable1ESPTSchema, Messages.doNotAskAgain);
                if (schema1esptPopupResponse === Messages.enable1ESPTSchema) {
                    await vscode.workspace.getConfiguration('azure-pipelines').update('1ESPipelineTemplatesSchemaFile', true, vscode.ConfigurationTarget.Workspace);
                }
                else if (schema1esptPopupResponse === Messages.doNotAskAgain) {
                    await context.globalState.update('doNotAskAgain1ESPTSchema', true);
                }
            }
        }
    }
    else {
        logger.log(`User is not eligible for enhanced 1ESPT Schema Intellisense.`, 'SchemaDetection');
    }

    // Grab and save the schema if we haven't already seen the organization this session.
    // NOTE: Despite saving the schema to disk, we can't use it as a persistent cache because:
    // 1. ADO doesn't provide an API to indicate which version (milestone) it's on,
    //    so we don't have a way of busting the cache.
    // 2. Even if we did, organizations can add/remove tasks at any time.
    // So we do the next-best thing and keep a session-level cache so we only
    // hit the network to request an updated schema for an organization once per session.
    const schemaUri = Utils.joinPath(context.globalStorageUri, `${organizationName}-schema.json`);
    if (seenOrganizations.has(organizationName)) {
        logger.log(`Returning cached ${organizationName} schema for ${workspaceFolder.name}`, 'SchemaDetection');
        return schemaUri;
    }

    const taskAgentApi = await azureDevOpsClient.getTaskAgentApi();
    const schema = JSON.stringify(await taskAgentApi.getYamlSchema());
    await vscode.workspace.fs.writeFile(schemaUri, Buffer.from(schema));

    seenOrganizations.add(organizationName);

    return schemaUri;
}

export async function getAzureDevOpsSession(context: vscode.ExtensionContext, options?: vscode.AuthenticationGetSessionOptions): Promise<vscode.AuthenticationSession | undefined> {
    const rawTenantId = vscode.workspace.getConfiguration('azure-pipelines').get<string>('tenant', '');
    const tenantId = rawTenantId.trim().length > 0 ? rawTenantId : undefined;
    logger.log(`Getting session for tenant ${tenantId ?? 'default'}`, 'SchemaDetection');
    const azureDevOpsSession = await vscode.authentication.getSession(
        'microsoft',
        tenantId ? [...AZURE_DEVOPS_SCOPES, `VSCODE_TENANT:${tenantId}`] : AZURE_DEVOPS_SCOPES,
        options
    );
    if (azureDevOpsSession === undefined) {
        const doNotAskAgainSignIn = context.globalState.get<boolean>(DO_NOT_ASK_SIGN_IN_KEY);
        if (doNotAskAgainSignIn) {
            logger.log(`Not prompting for login - do not ask again was set`, 'SchemaDetection');
            return undefined;
        }

        logger.log(`Waiting for login`, 'SchemaDetection');

        try {
            await delete1ESPTSchemaFileIfPresent(context);
            logger.log("1ESPTSchema folder deleted as user is not signed in", 'SchemaDetection')
        }
        catch (error) {
            logger.log(`Error ${String(error)} while trying to delete 1ESPTSchema folder. Either the folder does not exist or there is an actual error.`, 'SchemaDetection')
        }

        // Don't await this message so that we can return the fallback schema instead of blocking.
        // We'll detect the login in extension.ts and then re-request the schema.
        void vscode.window.showInformationMessage(
            Messages.signInForEnhancedIntelliSense,
            Messages.signInLabel,
            Messages.doNotAskAgain
        ).then(async action => {
            if (action === Messages.signInLabel) {
                await vscode.authentication.getSession('microsoft', tenantId ? [...AZURE_DEVOPS_SCOPES, `VSCODE_TENANT:${tenantId}`] : AZURE_DEVOPS_SCOPES, { createIfNone: true });
            } else if (action === Messages.doNotAskAgain) {
                await context.globalState.update(DO_NOT_ASK_SIGN_IN_KEY, true);
            }
        });

        return undefined;
    }

    logger.log(`Retrieved session: ${azureDevOpsSession.account.id}`, 'SchemaDetection');
    return azureDevOpsSession;
}

// Mapping of glob pattern -> schemas
type ISchemaAssociations = Record<string, string[]>;

export const SchemaAssociationNotification = {
    type: new languageclient.NotificationType<ISchemaAssociations>('json/schemaAssociations'),
}
