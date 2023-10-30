import { BuildDefinition, ContinuousIntegrationTrigger, DefinitionQuality, DefinitionTriggerType, DefinitionType, YamlProcess } from 'azure-devops-node-api/interfaces/BuildInterfaces';
import { TaskAgentQueue } from 'azure-devops-node-api/interfaces/TaskAgentInterfaces';

import { RepositoryProvider, GitRepositoryDetails, AzureDevOpsDetails } from '../../model/models';
import { Messages } from '../../../messages';

export class AzureDevOpsHelper {
    // https://dev.azure.com/ OR https://org@dev.azure.com/
    private static AzureReposUrl = 'dev.azure.com/';

    // git@ssh.dev.azure.com:v3/
    private static SSHAzureReposUrl = 'ssh.dev.azure.com:v3/';

    // https://org.visualstudio.com/
    private static VSOUrl = '.visualstudio.com/';

    // org@vs-ssh.visualstudio.com:v3/
    private static SSHVsoReposUrl = 'vs-ssh.visualstudio.com:v3/';

    public static isAzureReposUrl(remoteUrl: string): boolean {
        return remoteUrl.indexOf(AzureDevOpsHelper.AzureReposUrl) >= 0 ||
            remoteUrl.indexOf(AzureDevOpsHelper.VSOUrl) >= 0 ||
            remoteUrl.indexOf(AzureDevOpsHelper.SSHAzureReposUrl) >= 0 ||
            remoteUrl.indexOf(AzureDevOpsHelper.SSHVsoReposUrl) >= 0;
    }

    // TODO: Use ADO instead.
    public static getFormattedRemoteUrl(remoteUrl: string): string {
        // Convert SSH based url to https based url as pipeline service doesn't accept SSH based URL
        if (remoteUrl.indexOf(AzureDevOpsHelper.SSHAzureReposUrl) >= 0 || remoteUrl.indexOf(AzureDevOpsHelper.SSHVsoReposUrl) >= 0) {
            const details = AzureDevOpsHelper.getRepositoryDetailsFromRemoteUrl(remoteUrl);
            return `https://${details.organizationName}${AzureDevOpsHelper.VSOUrl}${details.projectName}/_git/${details.repositoryName}`;
        }

        return remoteUrl;
    }

    public static getRepositoryDetailsFromRemoteUrl(remoteUrl: string): { organizationName: string, projectName: string, repositoryName: string } {
        if (remoteUrl.indexOf(AzureDevOpsHelper.AzureReposUrl) >= 0) {
            const part = remoteUrl.substring(remoteUrl.indexOf(AzureDevOpsHelper.AzureReposUrl) + AzureDevOpsHelper.AzureReposUrl.length);
            const parts = part.split('/');
            if (parts.length !== 4) {
                throw new Error(Messages.failedToDetermineAzureRepoDetails);
            }

            return {
                organizationName: parts[0].trim(),
                projectName: parts[1].trim(),
                repositoryName: parts[3].trim()
            };
        } else if (remoteUrl.indexOf(AzureDevOpsHelper.VSOUrl) >= 0) {
            const part = remoteUrl.substring(remoteUrl.indexOf(AzureDevOpsHelper.VSOUrl) + AzureDevOpsHelper.VSOUrl.length);
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
        } else if (remoteUrl.indexOf(AzureDevOpsHelper.SSHAzureReposUrl) >= 0 || remoteUrl.indexOf(AzureDevOpsHelper.SSHVsoReposUrl) >= 0) {
            const urlFormat = remoteUrl.indexOf(AzureDevOpsHelper.SSHAzureReposUrl) >= 0 ? AzureDevOpsHelper.SSHAzureReposUrl : AzureDevOpsHelper.SSHVsoReposUrl;
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

    public static getBuildDefinitionPayload(
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
    public static getOldFormatBuildDefinitionUrl(accountName: string, projectName: string, buildDefinitionId: number) {
        return `https://${accountName}.visualstudio.com/${projectName}/_build?definitionId=${buildDefinitionId}&_a=summary`;
    }

    public static getOldFormatBuildUrl(accountName: string, projectName: string, buildId: number) {
        return `https://${accountName}.visualstudio.com/${projectName}/_build/results?buildId=${buildId}&view=results`;
    }
}
