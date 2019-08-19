import { AzureDevOpsClient } from '../../clients/devOps/azureDevOpsClient';
import { BuildDefinition, BuildDefinitionRepositoryProperties, Build } from '../../model/azureDevOps';
import { Messages } from '../../resources/messages';
import { WizardInputs, RepositoryProvider } from '../../model/models';
import * as util from 'util';

export class AzureDevOpsHelper {
    private static AzureReposUrl = 'dev.azure.com/';
    private static VSOUrl = 'visualstudio.com/';

    private azureDevOpsClient: AzureDevOpsClient;

    constructor(azureDevOpsClient: AzureDevOpsClient) {
        this.azureDevOpsClient = azureDevOpsClient;
    }

    public static isAzureReposUrl(remoteUrl: string): boolean {
        return (remoteUrl.indexOf(AzureDevOpsHelper.AzureReposUrl) >= 0 || remoteUrl.indexOf(AzureDevOpsHelper.VSOUrl) >= 0);
    }

    public static getOrganizationAndProjectNameFromRepositoryUrl(remoteUrl: string): { orgnizationName: string, projectName: string } {
        if (remoteUrl.indexOf(AzureDevOpsHelper.AzureReposUrl) >= 0) {
            let part = remoteUrl.substr(remoteUrl.indexOf(AzureDevOpsHelper.AzureReposUrl) + AzureDevOpsHelper.AzureReposUrl.length);
            let parts = part.split('/');
            let organizationName = parts[0].trim();
            let projectName = parts[1].trim();
            return { orgnizationName: organizationName, projectName: projectName };
        }
        else if (remoteUrl.indexOf(AzureDevOpsHelper.VSOUrl) >= 0) {
            let part = remoteUrl.substr(remoteUrl.indexOf(AzureDevOpsHelper.VSOUrl) + AzureDevOpsHelper.VSOUrl.length);
            let parts = part.split('/');
            let organizationName = remoteUrl.substring(remoteUrl.indexOf('https://') + 'https://'.length, remoteUrl.indexOf('.visualstudio.com'));
            let projectName = parts[0].trim();
            return { orgnizationName: organizationName, projectName: projectName };
        }
        else {
            throw new Error(Messages.notAzureRepoUrl);
        }
    }

    public static getRepositoryNameFromRemoteUrl(remoteUrl: string): string {
        if (remoteUrl.indexOf(AzureDevOpsHelper.AzureReposUrl) >= 0) {
            let part = remoteUrl.substr(remoteUrl.indexOf(AzureDevOpsHelper.AzureReposUrl) + AzureDevOpsHelper.AzureReposUrl.length);
            let parts = part.split('/');
            return parts[3].trim();
        }
        else if (remoteUrl.indexOf(AzureDevOpsHelper.VSOUrl) >= 0) {
            let part = remoteUrl.substr(remoteUrl.indexOf(AzureDevOpsHelper.VSOUrl) + AzureDevOpsHelper.VSOUrl.length);
            let parts = part.split('/');
            return parts[2].trim();
        }
        else {
            throw new Error(Messages.notAzureRepoUrl);
        }
    }

    public async createAndRunPipeline(pipelineName: string, inputs: WizardInputs): Promise<string> {
        try {
            let buildDefinitionPayload = this.getBuildDefinitionPayload(pipelineName, inputs);
            let definition = await this.azureDevOpsClient.createBuildDefinition(inputs.organizationName, buildDefinitionPayload);
            let build = await this.azureDevOpsClient.queueBuild(inputs.organizationName, this.getQueueBuildPayload(inputs, definition.id, definition.project.id));
            return build._links.web.href;
        }
        catch (error) {
            throw new Error(util.format(Messages.failedToCreateAzurePipeline, error.message));
        }
    }

    private getBuildDefinitionPayload(pipelineName: string, inputs: WizardInputs): BuildDefinition {
        let repositoryProperties: BuildDefinitionRepositoryProperties = null;

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

        return {
            name: pipelineName,
            type: 2, //YAML process type
            quality: 1, // Defintion=1, Draft=0
            path: "\\", //Folder path of build definition. Root folder in this case
            project: {
                id: inputs.project.id,
                name: inputs.project.name
            },
            process: {
                type: 2,
                yamlFileName: inputs.pipelineParameters.pipelineFilePath
            },
            queue: {
                id: 539 // Default queue Hosted VS 2017. This value is overriden by queue specified in YAML
            },
            triggers: [
                {
                    triggerType: 2, // Continuous integration trigger type
                    settingsSourceType: 2, // Use trigger source as specified in YAML
                    batchChanges: false
                }
            ],
            repository: {
                id: inputs.sourceRepository.repositoryId,
                name: inputs.sourceRepository.repositoryName,
                type: inputs.sourceRepository.repositoryProvider,
                defaultBranch: inputs.sourceRepository.branch,
                url: inputs.sourceRepository.remoteUrl,
                properties: repositoryProperties
            }
        };
    }

    private getQueueBuildPayload(inputs: WizardInputs, buildDefinitionId: number, projectId: string): Build {
        return {
            definition: { id: buildDefinitionId },
            project: { id: projectId },
            sourceBranch: inputs.sourceRepository.branch,
            sourceVersion: inputs.sourceRepository.commitId
        };
    }
}
