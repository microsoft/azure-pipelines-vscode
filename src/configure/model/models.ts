import { AzureEnvironment } from 'ms-rest-azure';
import { GenericResource } from 'azure-arm-resource/lib/resource/models';
import { OutputChannel, ExtensionContext, QuickPickItem } from 'vscode';
import { ServiceClientCredentials } from 'ms-rest';
import { SubscriptionModels } from 'azure-arm-resource';
import { UIExtensionVariables, IAzureUserInput, ITelemetryReporter } from 'vscode-azureextensionui';
import { Messages } from '../resources/messages';

class ExtensionVariables implements UIExtensionVariables {
    public azureAccountExtensionApi: AzureAccountExtensionExports;

    public context: ExtensionContext;
    public outputChannel: OutputChannel;
    public reporter: ITelemetryReporter;
    public ui: IAzureUserInput;
}

let extensionVariables = new ExtensionVariables();
export { extensionVariables };

export interface AzureAccountExtensionExports {
    sessions: AzureSession[];
    subscriptions: { session: AzureSession, subscription: SubscriptionModels.Subscription }[];
    filters: { session: AzureSession, subscription: SubscriptionModels.Subscription }[];
    waitForLogin: () => Promise<boolean>;
}

export class WizardInputs {
    organizationName: string;
    isNewOrganization: boolean;
    project: DevOpsProject;
    sourceRepository: GitRepositoryParameters;
    targetResource: AzureParameters = new AzureParameters();
    pipelineParameters: PipelineParameters = new PipelineParameters();
    azureSession: AzureSession;
    githubPATToken?: string;
}

export interface DevOpsProject {
    id: string;
    name: string;
}

export class Organization {
    accountId: string;
    accountName: string;
    accountUri: string;
    properties: {};
    isMSAOrg: boolean;
}

export class AzureSession {
    environment: AzureEnvironment;
    userId: string;
    tenantId: string;
    credentials: ServiceClientCredentials;
}

export class AzureParameters {
    subscriptionId: string;
    resource: GenericResource;
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
    WindowsWebApp = 'windowsWebApp'
}

export enum ServiceConnectionType {
    GitHub = 'github',
    AzureRM = 'azurerm'
}

export enum WebAppKind {
    WindowsApp = 'app',
    FunctionApp = 'functionapp',
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

export interface Token {
    session: AzureSession;
    accessToken: string;
    refreshToken: string;
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
