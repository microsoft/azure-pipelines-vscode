export class GitHubProvider {
    // Note that this is not intended to be be completely accurate.
    // This is the canonical URL that GitHub provides when cloning,
    // and the only one that we'll support to keep the code simple.
    private static GitHubUrl = 'https://github.com/';
    private static SSHGitHubUrl = 'git@github.com:';

    public static isGitHubUrl(remoteUrl: string): boolean {
        return remoteUrl.startsWith(GitHubProvider.GitHubUrl) || remoteUrl.startsWith(GitHubProvider.SSHGitHubUrl);
    }

    public static getRepositoryDetailsFromRemoteUrl(remoteUrl: string): { ownerName: string, repositoryName: string } {
        // https://github.com/microsoft/azure-pipelines-vscode.git
        // => ['https:', '', 'github.com', 'microsoft', 'azure-pipelines-vscode.git']
        // => { ownerName: 'microsoft', repositoryName: 'azure-pipelines-vscode'}
        // ===============================================
        // git@github.com:microsoft/azure-pipelines-vscode
        // => microsoft/zure-pipelines-vscode
        // => ['microsoft', 'azure-pipelines-vscode']
        // => { ownerName: 'microsoft', repositoryName: 'azure-pipelines-vscode'}
        const parts = remoteUrl.replace(GitHubProvider.SSHGitHubUrl, '').split('/');
        return {
            ownerName: parts[parts.length - 2],
            repositoryName: parts[parts.length - 1].replace(/\.git$/, '')
        };
    }

    public static getFormattedRemoteUrl(remoteUrl: string): string {
        if (remoteUrl.startsWith(GitHubProvider.SSHGitHubUrl)) {
            return `https://github.com/${remoteUrl.substring(GitHubProvider.SSHGitHubUrl.length)}`;
        }

        return remoteUrl;
    }
}
