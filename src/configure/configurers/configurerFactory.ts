import { Configurer } from './configurerBase';
import { GitHubWorkflowConfigurer } from '../configurers/githubWorkflowConfigurer';
import { AzurePipelineConfigurer } from './azurePipelineConfigurer';
import { GitRepositoryParameters, RepositoryProvider } from '../model/models';
import { Messages } from '../resources/messages';

export class ConfigurerFactory {
    public static GetConfigurer(sourceRepositoryDetails: GitRepositoryParameters): Configurer {
        switch(sourceRepositoryDetails.repositoryProvider) {
            case RepositoryProvider.Github:
                return new GitHubWorkflowConfigurer();
            case RepositoryProvider.AzureRepos:
                return new AzurePipelineConfigurer();
            default:
                throw new Error(Messages.cannotIdentifyRespositoryDetails);
        }
    }
}
