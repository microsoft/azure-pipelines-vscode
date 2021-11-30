import * as path from 'path';

import { BuildDefinition, ContinuousIntegrationTrigger, DefinitionQuality, DefinitionTriggerType, DefinitionType, YamlProcess } from 'azure-devops-node-api/interfaces/BuildInterfaces';
import { TaskAgentQueue } from 'azure-devops-node-api/interfaces/TaskAgentInterfaces';

import { WizardInputs, RepositoryProvider } from '../../model/models';
import { Messages } from '../../resources/messages';

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

    public static getFormattedRemoteUrl(remoteUrl: string): string {
        // Convert SSH based url to https based url as pipeline service doesn't accept SSH based URL
        if (remoteUrl.indexOf(AzureDevOpsHelper.SSHAzureReposUrl) >= 0 || remoteUrl.indexOf(AzureDevOpsHelper.SSHVsoReposUrl) >= 0) {
            let details = AzureDevOpsHelper.getRepositoryDetailsFromRemoteUrl(remoteUrl);
            return `https://${details.organizationName}${AzureDevOpsHelper.VSOUrl}/${details.projectName}/_git/${details.repositoryName}`;
        }

        return remoteUrl;
    }

    public static getRepositoryDetailsFromRemoteUrl(remoteUrl: string): { organizationName: string, projectName: string, repositoryName: string } {
        if (remoteUrl.indexOf(AzureDevOpsHelper.AzureReposUrl) >= 0) {
            let part = remoteUrl.substr(remoteUrl.indexOf(AzureDevOpsHelper.AzureReposUrl) + AzureDevOpsHelper.AzureReposUrl.length);
            let parts = part.split('/').filter((value) => !!value);
            if(parts.length !== 4) {
                throw new Error(Messages.failedToDetermineAzureRepoDetails);
            }
            return { organizationName: parts[0].trim(), projectName: parts[1].trim(), repositoryName: parts[3].trim() };
        }
        else if (remoteUrl.indexOf(AzureDevOpsHelper.VSOUrl) >= 0) {
            let part = remoteUrl.substr(remoteUrl.indexOf(AzureDevOpsHelper.VSOUrl) + AzureDevOpsHelper.VSOUrl.length);
            let organizationName = remoteUrl.substring(remoteUrl.indexOf('https://') + 'https://'.length, remoteUrl.indexOf('.visualstudio.com'));
            let parts = part.split('/').filter((value) => !!value);

            if (parts.length === 4 && parts[0].toLowerCase() === 'defaultcollection') {
                // Handle scenario where part is 'DefaultCollection/<project>/_git/<repository>'
                parts = parts.slice(1);
            }

            if(parts.length !== 3) {
                throw new Error(Messages.failedToDetermineAzureRepoDetails);
            }
            return { organizationName: organizationName, projectName: parts[0].trim(), repositoryName: parts[2].trim() };
        }
        else if (remoteUrl.indexOf(AzureDevOpsHelper.SSHAzureReposUrl) >= 0 || remoteUrl.indexOf(AzureDevOpsHelper.SSHVsoReposUrl) >= 0) {
            let urlFormat = remoteUrl.indexOf(AzureDevOpsHelper.SSHAzureReposUrl) >= 0 ? AzureDevOpsHelper.SSHAzureReposUrl : AzureDevOpsHelper.SSHVsoReposUrl;
            let part = remoteUrl.substr(remoteUrl.indexOf(urlFormat) + urlFormat.length);
            let parts = part.split('/').filter((value) => !!value);
            if(parts.length !== 3) {
                throw new Error(Messages.failedToDetermineAzureRepoDetails);
            }
            return { organizationName: parts[0].trim(), projectName: parts[1].trim(), repositoryName: parts[2].trim() };
        }
        else {
            throw new Error(Messages.notAzureRepoUrl);
        }
    }

    public static getBuildDefinitionPayload(pipelineName: string, queue: TaskAgentQueue, inputs: WizardInputs): BuildDefinition {
        let repositoryProperties: { [key: string]: string } = null;

        if (inputs.sourceRepository.repositoryProvider === RepositoryProvider.Github) {
            repositoryProperties = {
                apiUrl: `https://api.github.com/repos/${inputs.sourceRepository.repositoryId}`,
                branchesUrl: `https://api.github.com/repos/${inputs.sourceRepository.repositoryId}/branches`,
                cloneUrl: inputs.sourceRepository.remoteUrl,
                connectedServiceId: inputs.sourceRepository.serviceConnectionId,
                defaultBranch: inputs.sourceRepository.branch,
                fullName: inputs.sourceRepository.repositoryName,
                refsUrl: `https://api.github.com/repos/${inputs.sourceRepository.repositoryId}/git/refs`
            };
        }

        const properties = { 'source': 'ms-azure-devops.azure-pipelines' };

        return {
            name: pipelineName,
            type: DefinitionType.Build,
            quality: DefinitionQuality.Definition,
            path: "\\", //Folder path of build definition. Root folder in this case
            project: inputs.project,
            process: {
                type: 2,
                yamlFileName: path.join(inputs.pipelineParameters.workingDirectory, inputs.pipelineParameters.pipelineFileName)
            } as YamlProcess,
            queue: {
                id: queue.id,
            },
            triggers: [
                {
                    triggerType: DefinitionTriggerType.ContinuousIntegration, // Continuous integration trigger type
                    settingsSourceType: 2, // Use trigger source as specified in YAML
                    batchChanges: false
                } as ContinuousIntegrationTrigger,
            ],
            repository: {
                id: inputs.sourceRepository.repositoryId,
                name: inputs.sourceRepository.repositoryName,
                type: inputs.sourceRepository.repositoryProvider,
                defaultBranch: inputs.sourceRepository.branch,
                url: inputs.sourceRepository.remoteUrl,
                properties: repositoryProperties
            },
            properties: properties
        };
    }

    public static getOldFormatBuildDefinitionUrl(accountName: string, projectName: string, buildDefinitionId: number) {
        return `https://${accountName}.visualstudio.com/${projectName}/_build?definitionId=${buildDefinitionId}&_a=summary`;
    }

    public static getOldFormatBuildUrl(accountName: string, projectName: string, buildId: number) {
        return `https://${accountName}.visualstudio.com/${projectName}/_build/results?buildId=${buildId}&view=results`;
    }
}
