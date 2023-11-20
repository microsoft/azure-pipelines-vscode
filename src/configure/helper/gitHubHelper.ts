// Note that this is not intended to be be completely accurate.
// This is the canonical URL that GitHub provides when cloning,
// and the only one that we'll support to keep the code simple.
const GitHubUrl = 'https://github.com/';
const SSHGitHubUrl = 'git@github.com:';

export function isGitHubUrl(remoteUrl: string): boolean {
    return remoteUrl.startsWith(GitHubUrl) || remoteUrl.startsWith(SSHGitHubUrl);
}

export function getRepositoryDetailsFromRemoteUrl(remoteUrl: string): { ownerName: string, repositoryName: string } {
    // https://github.com/microsoft/azure-pipelines-vscode.git
    // => ['https:', '', 'github.com', 'microsoft', 'azure-pipelines-vscode.git']
    // => { ownerName: 'microsoft', repositoryName: 'azure-pipelines-vscode'}
    // ===============================================
    // git@github.com:microsoft/azure-pipelines-vscode
    // => microsoft/zure-pipelines-vscode
    // => ['microsoft', 'azure-pipelines-vscode']
    // => { ownerName: 'microsoft', repositoryName: 'azure-pipelines-vscode'}
    const parts = remoteUrl.replace(SSHGitHubUrl, '').split('/');
    return {
        ownerName: parts[parts.length - 2],
        repositoryName: parts[parts.length - 1].replace(/\.git$/, '')
    };
}

export function getFormattedRemoteUrl(remoteUrl: string): string {
    if (remoteUrl.startsWith(SSHGitHubUrl)) {
        return `https://github.com/${remoteUrl.substring(SSHGitHubUrl.length)}`;
    }

    return remoteUrl;
}
