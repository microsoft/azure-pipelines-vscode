import { BuildDefinition, ContinuousIntegrationTrigger, DefinitionQuality, DefinitionTriggerType, DefinitionType, YamlProcess } from 'azure-devops-node-api/interfaces/BuildInterfaces';
import { TaskAgentQueue } from 'azure-devops-node-api/interfaces/TaskAgentInterfaces';

import { RepositoryProvider, GitRepositoryDetails, AzureDevOpsDetails } from '../../model/models';
import * as Messages from '../../../messages';

// https://dev.azure.com/ OR https://org@dev.azure.com/
const AzureReposUrl = 'dev.azure.com/';

// git@ssh.dev.azure.com:v3/
const SSHAzureReposUrl = 'ssh.dev.azure.com:v3/';

// https://org.visualstudio.com/
const VSOUrl = '.visualstudio.com/';

// org@vs-ssh.visualstudio.com:v3/
const SSHVsoReposUrl = 'vs-ssh.visualstudio.com:v3/';

export function isAzureReposUrl(remoteUrl: string): boolean {
    return remoteUrl.includes(AzureReposUrl) ||
        remoteUrl.includes(VSOUrl) ||
        remoteUrl.includes(SSHAzureReposUrl) ||
        remoteUrl.includes(SSHVsoReposUrl);
}

// TODO: Use ADO instead.
export function getFormattedRemoteUrl(remoteUrl: string): string {
    // Convert SSH based url to https based url as pipeline service doesn't accept SSH based URL
    if (remoteUrl.includes(SSHAzureReposUrl) || remoteUrl.includes(SSHVsoReposUrl)) {
        const details = getRepositoryDetailsFromRemoteUrl(remoteUrl);
        return `https://${details.organizationName}${VSOUrl}${details.projectName}/_git/${details.repositoryName}`;
    }

    return remoteUrl;
}

export function getRepositoryDetailsFromRemoteUrl(remoteUrl: string): { organizationName: string, projectName: string, repositoryName: string } {
    if (remoteUrl.includes(AzureReposUrl)) {
        const part = remoteUrl.substring(remoteUrl.indexOf(AzureReposUrl) + AzureReposUrl.length);
        const parts = part.split('/');
        if (parts.length !== 4) {
            throw new Error(Messages.failedToDetermineAzureRepoDetails);
        }

        return {
            organizationName: parts[0].trim(),
            projectName: parts[1].trim(),
            repositoryName: parts[3].trim()
        };
    } else if (remoteUrl.includes(VSOUrl)) {
        const part = remoteUrl.substring(remoteUrl.indexOf(VSOUrl) + VSOUrl.length);
        const organizationName = remoteUrl.substring(remoteUrl.indexOf('https://') + 'https://'.length, remoteUrl.indexOf('.visualstudio.com'));
        const parts = part.split('/');

        if (parts.length === 4 && parts[0].toLowerCase() === 'defaultcollection') {
            // Handle scenario where part is 'DefaultCollection/<project>/_git/<repository>'
            parts.shift();
        }

        if (parts.length !== 3) {
            throw new Error(Messages.failedToDetermineAzureRepoDetails);
        }

        return {
            organizationName: organizationName,
            projectName: parts[0].trim(),
            repositoryName: parts[2].trim()
        };
    } else if (remoteUrl.includes(SSHAzureReposUrl) || remoteUrl.includes(SSHVsoReposUrl)) {
        const urlFormat = remoteUrl.includes(SSHAzureReposUrl) ? SSHAzureReposUrl : SSHVsoReposUrl;
        const part = remoteUrl.substring(remoteUrl.indexOf(urlFormat) + urlFormat.length);
        const parts = part.split('/');
        if (parts.length !== 3) {
            throw new Error(Messages.failedToDetermineAzureRepoDetails);
        }

        return {
            organizationName: parts[0].trim(),
            projectName: parts[1].trim(),
            repositoryName: parts[2].trim()
        };
    } else {
        throw new Error(Messages.notAzureRepoUrl);
    }
}

export function getBuildDefinitionPayload(
    pipelineName: string,
    queue: TaskAgentQueue,
    repoDetails: GitRepositoryDetails,
    adoDetails: AzureDevOpsDetails,
    repositoryProperties: Record<string, string> | undefined,
    pipelineFileName: string,
): BuildDefinition {
    return {
        name: pipelineName,
        type: DefinitionType.Build,
        quality: DefinitionQuality.Definition,
        path: "\\", //Folder path of build definition. Root folder in this case
        project: adoDetails.project,
        process: {
            type: 2,
            yamlFileName: pipelineFileName,
        } as YamlProcess,
        queue: {
            id: queue.id,
        },
        triggers: [
            {
                triggerType: DefinitionTriggerType.ContinuousIntegration, // Continuous integration trigger type
                settingsSourceType: 2, // Use trigger source as specified in YAML
                batchChanges: false,
            } as ContinuousIntegrationTrigger,
        ],
        repository: {
            id: repoDetails.repositoryProvider === RepositoryProvider.Github
                ? `${repoDetails.ownerName}/${repoDetails.repositoryName}`
                : undefined,
            name: repoDetails.repositoryProvider === RepositoryProvider.Github
                ? `${repoDetails.ownerName}/${repoDetails.repositoryName}`
                : repoDetails.repositoryName,
            type: repoDetails.repositoryProvider,
            defaultBranch: repoDetails.branch,
            url: repoDetails.remoteUrl,
            properties: repositoryProperties,
        },
        properties: {
            source: 'ms-azure-devops.azure-pipelines',
        },
    };
}

// TODO: These should be able to be changed to use ADO instead.
export function getOldFormatBuildDefinitionUrl(accountName: string, projectName: string, buildDefinitionId: number) {
    return `https://${accountName}.visualstudio.com/${projectName}/_build?definitionId=${buildDefinitionId}&_a=summary`;
}

export function getOldFormatBuildUrl(accountName: string, projectName: string, buildId: number) {
    return `https://${accountName}.visualstudio.com/${projectName}/_build/results?buildId=${buildId}&view=results`;
}
