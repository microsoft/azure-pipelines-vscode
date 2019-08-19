export class GitHubProvider {
    // private gitHubPatToken: string;
    private static GitHubUrl = 'https://github.com/';

    // constructor(gitHubPat: string) {
    //     this.gitHubPatToken = gitHubPat;
    // }

    public static isGitHubUrl(remoteUrl: string): boolean {
        return remoteUrl.startsWith(GitHubProvider.GitHubUrl);
    }

    public static getRepositoryIdFromUrl(remoteUrl: string): string {
        let endCount: number = remoteUrl.indexOf('.git');
        if (endCount < 0) {
            endCount = remoteUrl.length;
        }

        return remoteUrl.substring(GitHubProvider.GitHubUrl.length, endCount);
    }
}
