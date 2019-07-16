import { Messages } from '../../messages';

export class AzureDevOpsHelper {
    private static AzureReposUrl = 'dev.azure.com/';
    private static VSOUrl = 'visualstudio.com/';

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
}
