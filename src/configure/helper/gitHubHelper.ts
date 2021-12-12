export class GitHubProvider {
    // Note that this is not intended to be be completely accurate.
    // This is the canonical URL that GitHub provides when cloning,
    // and the only one that we'll support to keep the code simple.
    private static GitHubUrl = 'https://github.com/';
    private static SSHGitHubUrl = 'git@github.com:';

    public static isGitHubUrl(remoteUrl: string): boolean {
        return remoteUrl.startsWith(GitHubProvider.GitHubUrl) || remoteUrl.startsWith(GitHubProvider.SSHGitHubUrl);
    }

    public static getRepositoryIdFromUrl(remoteUrl: string): string {
        let endCount = remoteUrl.indexOf('.git');
        if (endCount < 0) {
            endCount = remoteUrl.length;
        }

        if (remoteUrl.startsWith(GitHubProvider.SSHGitHubUrl)) {
            return remoteUrl.substring(GitHubProvider.SSHGitHubUrl.length, endCount);
        }

        return remoteUrl.substring(GitHubProvider.GitHubUrl.length, endCount);
    }

    public static getFormattedRemoteUrl(remoteUrl: string): string {
        if (remoteUrl.startsWith(GitHubProvider.SSHGitHubUrl)) {
            return `https://github.com/${remoteUrl.substring(GitHubProvider.SSHGitHubUrl.length)}`;
        }

        return remoteUrl;
    }
}
