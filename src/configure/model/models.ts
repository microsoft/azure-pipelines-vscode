import { QuickPickItem } from 'vscode';
import { TeamProject } from 'azure-devops-node-api/interfaces/CoreInterfaces';
import { WebApi } from 'azure-devops-node-api';
import { AppServiceClient } from '../clients/azure/appServiceClient';
import { Build, BuildDefinition } from 'azure-devops-node-api/interfaces/BuildInterfaces';
import { WebSiteManagementModels } from '@azure/arm-appservice';
import { AzureSession } from '../../typings/azure-account.api';

export interface Organization {
    accountId: string;
    accountName: string;
    accountUri: string;
    properties: Record<string, unknown>;
}

/**
 * Identical to @see {TeamProject} except with name & id verified.
 */
export interface ValidatedProject extends TeamProject {
    name: string;
    id: string;
}

/**
 * Identical to @see {WebSiteManagementModels.Site} except with name, id, & resourceGroup verified.
 */
export interface ValidatedSite extends WebSiteManagementModels.Site {
    name: string;
    id: string;
    resourceGroup: string;
}

/**
 * Identical to @see {Build} except with definition & id verified.
 */
export interface ValidatedBuild extends Build {
    definition: Required<BuildDefinition>;
    id: number;
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

export interface AzureSiteDetails {
    appServiceClient: AppServiceClient;
    subscriptionId: string;
    site: ValidatedSite;
}

export type GitRepositoryDetails = {
    repositoryName: string;
    remoteName: string;
    remoteUrl: string;
    branch: string;
} & ({
    repositoryProvider: RepositoryProvider.AzureRepos;
    organizationName: string;
    projectName: string;
} | {
    repositoryProvider: RepositoryProvider.Github;
    ownerName: string;
});

export interface AzureDevOpsDetails {
    session: AzureSession;
    adoClient: WebApi;
    organizationName: string;
    project: ValidatedProject;
}

export interface PipelineTemplate {
    path: string;
    label: string;
    language: string;
    target: TargetResource;
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

export type TargetResource = {
    type: TargetResourceType.None;
} | {
    type: TargetResourceType.WebApp;
    kind: WebAppKind;
};

export enum TargetResourceType {
    None = 'none',
    WebApp = 'Microsoft.Web/sites'
}

export enum WebAppKind {
    WindowsApp = 'app',
    FunctionApp = 'functionapp',
    FunctionAppLinux = 'functionapp,linux',
    LinuxApp = 'app,linux',
    LinuxContainerApp = 'app,linux,container'
}

export interface QuickPickItemWithData<T> extends QuickPickItem {
    data: T;
}

export interface AadApplication {
    appId: string;
    secret: string;
    objectId: string;
}
