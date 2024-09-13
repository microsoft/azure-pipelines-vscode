import * as Messages from '../messages';

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
