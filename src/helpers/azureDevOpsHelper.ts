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

/**
 * Gets the organization name, project name, and repository name from a given Azure Repos URL.
 *
 * Note that Azure Repos support _many_ formats.
 * Here's all the ones we know of:
 * * New-style HTTPS: https://dev.azure.com/<organization>/<project>/_git/<repository>
 * * Old-style HTTPS: https://<organization>.visualstudio.com/<project>/_git/<repository>
 * * New-style shorthand HTTPS: https://dev.azure.com/<organization>/_git/<repository>
 * * Old-style shorthand HTTPS: https://<organization>.visualstudio.com/_git/<repository>
 * * Old-style default collection HTTPS: https://<organization>.visualstudio.com/DefaultCollection/<project>/_git/<repository>
 * * Old-style default collection shorthand HTTPS: https://<organization>.visualstudio.com/DefaultCollection/_git/<repository>
 * * New-style SSH: git@ssh.dev.azure.com:v3/<organization>/<project>/<repository>
 * * Old-style SSH: <organization>@vs-ssh.visualstudio.com:v3/<organization>/<project>/<repository>
 *
 * @param remoteUrl The Azure Repos URL to parse.
 * @returns Details about the URL.
 */
export function getRepositoryDetailsFromRemoteUrl(remoteUrl: string): { organizationName: string, projectName: string, repositoryName: string } {
    if (remoteUrl.includes(AzureReposUrl)) {
        const part = remoteUrl.substring(remoteUrl.indexOf(AzureReposUrl) + AzureReposUrl.length);
        const parts = part.split('/');

        if (parts.length === 3) {
            // Shorthand URL: project & repository are the same, project is not specified.
            // https://dev.azure.com/<organization>/_git/<repository>
            return {
                organizationName: parts[0].trim(),
                projectName: parts[2].trim(),
                repositoryName: parts[2].trim()
            };
        }

        if (parts.length !== 4) {
            throw new Error(Messages.failedToDetermineAzureRepoDetails);
        }

        // https://dev.azure.com/<organization>/<project>/_git/<repository>
        return {
            organizationName: parts[0].trim(),
            projectName: parts[1].trim(),
            repositoryName: parts[3].trim()
        };
    } else if (remoteUrl.includes(VSOUrl)) {
        const part = remoteUrl.substring(remoteUrl.indexOf(VSOUrl) + VSOUrl.length);
        const organizationName = remoteUrl.substring(remoteUrl.indexOf('https://') + 'https://'.length, remoteUrl.indexOf('.visualstudio.com'));
        const parts = part.split('/');

        if (parts[0].toLowerCase() === 'defaultcollection') {
            // Remove DefaultCollection from the URL.
            // Luckily, projects can't be named DefaultCollection, so this is always safe.
            parts.shift();
        }

        if (parts.length === 2) {
            // Shorthand URL: project & repository are the same, project is not specified.
            // https://<organization>.visualstudio.com/_git/<repository>
            return {
                organizationName: organizationName,
                projectName: parts[1].trim(),
                repositoryName: parts[1].trim()
            };
        }

        if (parts.length !== 3) {
            throw new Error(Messages.failedToDetermineAzureRepoDetails);
        }

        // https://<organization>.visualstudio.com/<project>/_git/<repository>
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
