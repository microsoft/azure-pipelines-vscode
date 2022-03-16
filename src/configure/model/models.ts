import { Environment } from '@azure/ms-rest-azure-env';
import { ResourceManagementModels } from '@azure/arm-resources';
import { SubscriptionModels } from '@azure/arm-subscriptions';
import { TokenCredentialsBase } from '@azure/ms-rest-nodeauth';
import { Event, QuickPickItem } from 'vscode';
import { Messages } from '../../messages';
import { TeamProjectReference } from 'azure-devops-node-api/interfaces/CoreInterfaces';

// https://github.com/microsoft/vscode-azure-account/blob/main/src/azure-account.api.d.ts
// with just the properties we need
export type AzureLoginStatus = 'Initializing' | 'LoggingIn' | 'LoggedIn' | 'LoggedOut';

export interface AzureAccount {
	readonly status: AzureLoginStatus;
	readonly onStatusChanged: Event<AzureLoginStatus>;
	readonly waitForLogin: () => Promise<boolean>;
	readonly sessions: AzureSession[];
	// readonly onSessionsChanged: Event<void>;
	readonly subscriptions: AzureSubscription[];
	// readonly onSubscriptionsChanged: Event<void>;
	readonly waitForSubscriptions: () => Promise<boolean>;
	readonly filters: AzureResourceFilter[];
	// readonly onFiltersChanged: Event<void>;
	readonly waitForFilters: () => Promise<boolean>;
	// createCloudShell(os: 'Linux' | 'Windows'): CloudShell;
}

export interface AzureSession {
	readonly environment: Environment;
	readonly userId: string;
	readonly tenantId: string;

	/**
	 * The credentials object for azure-sdk-for-node modules https://github.com/azure/azure-sdk-for-node
	 */
	// readonly credentials: ServiceClientCredentials;

	/**
	 * The credentials object for azure-sdk-for-js modules https://github.com/azure/azure-sdk-for-js
	 */
	readonly credentials2: TokenCredentialsBase;
}

export interface AzureSubscription {
	readonly session: AzureSession;
	readonly subscription: SubscriptionModels.Subscription;
}

export type AzureResourceFilter = AzureSubscription;

// Other models
export class WizardInputs {
    organizationName: string;
    isNewOrganization: boolean;
    project: TeamProjectReference;
    sourceRepository: GitRepositoryParameters;
    targetResource: AzureParameters = new AzureParameters();
    pipelineParameters: PipelineParameters = new PipelineParameters();
    azureSession: AzureSession;
    githubPatToken?: string;
}

export interface Organization {
    accountId: string;
    accountName: string;
    accountUri: string;
    properties: {};
}

export type OrganizationAvailability = {
    isAvailable: true;
    name: string;
    unavailabilityReason: null;
} | {
    isAvailable: false;
    name: string;
    unavailabilityReason: string;
};

export class AzureParameters {
    subscriptionId: string;
    resource: ResourceManagementModels.GenericResource;
    serviceConnectionId: string;
}

export class PipelineParameters {
    pipelineFileName: string;
    pipelineTemplate: PipelineTemplate;
    workingDirectory: string;
}

export interface GitRepositoryParameters {
    repositoryProvider: RepositoryProvider;
    repositoryName: string;
    repositoryId: string;
    remoteName: string;
    remoteUrl: string;
    branch: string;
    commitId: string;
    localPath?: string;
    serviceConnectionId?: string; // Id of the service connection in Azure DevOps
}

export interface PipelineTemplate {
    path: string;
    label: string;
    language: string;
    targetType: TargetResourceType;
    targetKind: WebAppKind;
}

export enum SourceOptions {
    CurrentWorkspace = 'Current workspace',
    BrowseLocalMachine = 'Browse local machine',
    GithubRepository = 'Github repository'
}

export enum RepositoryProvider {
    Github = 'github',
    AzureRepos = 'tfsgit'
}

export enum TargetResourceType {
    None = 'none',
    WebApp = 'Microsoft.Web/sites'
}

export enum ServiceConnectionType {
    GitHub = 'github',
    AzureRM = 'azurerm'
}

export enum WebAppKind {
    WindowsApp = 'app',
    FunctionApp = 'functionapp',
    FunctionAppLinux = 'functionapp,linux',
    LinuxApp = 'app,linux',
    LinuxContainerApp = 'app,linux,container'
}

export class QuickPickItemWithData implements QuickPickItem {
    label: string;
    data: any;
    description?: string;
    detail?: string;
}

export class ParsedAzureResourceId {
    public resourceId: string;
    public subscriptionId: string;
    public resourceGroup: string;
    public resourceType: string;
    public resourceProvider: string;
    public resourceName: string;
    public childResourceType?: string;
    public childResource?: string;

    constructor(resourceId: string) {
        if (!resourceId) {
            throw new Error(Messages.resourceIdMissing);
        }

        this.resourceId = resourceId;
        this.parseId();
    }

    private parseId() {
        // remove all empty parts in the resource to avoid failing in case there are leading/trailing/extra '/'
        let parts = this.resourceId.split('/').filter((part) => !!part);
        if (!!parts) {
            for (let i = 0; i < parts.length; i++) {
                switch (i) {
                    case 1:
                            this.subscriptionId = parts[i];
                            break;
                    case 3:
                            this.resourceGroup = parts[i];
                            break;
                    case 5:
                            this.resourceProvider = parts[i];
                            break;
                    case 6:
                            this.resourceType = parts[i];
                            break;
                    case 7:
                            this.resourceName = parts[i];
                            break;
                    case 8:
                            this.childResourceType = parts[i];
                            break;
                    case 9:
                            this.childResource = parts[i];
                            break;
                }
            }
        }
    }
}

export interface AadApplication {
    appId: string;
    secret: string;
    objectId: string;
}

export interface GitBranchDetails {
    remoteName: string;
    branch: string;
}
