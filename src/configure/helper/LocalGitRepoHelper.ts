import { GitRepositoryParameters, GitBranchDetails } from '../model/models';
import { Messages } from '../../messages';
import * as git from 'simple-git/promise';
import { URI } from 'vscode-uri';

export class LocalGitRepoHelper {
    private gitReference: git.SimpleGit;

    private constructor() {
    }

    public static async GetHelperInstance(repositoryUri: URI): Promise<LocalGitRepoHelper> {
        try {
            const repoService = new LocalGitRepoHelper();
            repoService.initialize(repositoryUri);
            await repoService.gitReference.status();
            return repoService;
        } catch (error) {
            throw new Error(Messages.notAGitRepository);
        }
    }

    public async getGitBranchDetails(): Promise<GitBranchDetails> {
        const status = await this.gitReference.status();
        const branch = status.current; // FIXME: This doesn't work correctly for empty repos until 2.11.0
        const remote = status.tracking ? status.tracking.substr(0, status.tracking.indexOf(branch) - 1) : null;

        return {
            branch: branch,
            remoteName: remote
        };
    }

    public async getGitRemoteNames(): Promise<string[]> {
        // "origin" is always a remote, even if it doesn't point anywhere
        // (try `git init` followed by `git remote`).
        // We need to use the verbose flag to ensure it has refs.
        const remotes = await this.gitReference.getRemotes(true);
        return remotes
            .filter(remote => Object.keys(remote.refs).length > 0)
            .map(remote => remote.name);
    }

    public async getGitRemoteUrl(remoteName: string): Promise<string | void> {
        let remoteUrl = await this.gitReference.remote(["get-url", remoteName]);
        if (remoteUrl) {
            remoteUrl = remoteUrl.trim();
            if (remoteUrl[remoteUrl.length - 1] === '/') {
                remoteUrl = remoteUrl.substr(0, remoteUrl.length - 1);
            }
        }

        return remoteUrl;
    }

    /**
     * commits yaml pipeline file into the local repo and pushes the commit to remote branch.
     * @param pipelineYamlPath : local path of yaml pipeline in the repository
     * @returns: thenable string which resolves to commitId once commit is pushed to remote branch, and failure message if unsuccessful
     */
    public async commitAndPushPipelineFile(pipelineYamlPath: string, repositoryDetails: GitRepositoryParameters): Promise<string> {
        await this.gitReference.add(pipelineYamlPath);
        await this.gitReference.commit(Messages.addYmlFile, pipelineYamlPath);
        let gitLog = await this.gitReference.log();

        if (repositoryDetails.remoteName && repositoryDetails.branch) {
            await this.gitReference.push(repositoryDetails.remoteName, undefined, {
                "--set-upstream": null
            });
        }
        else {
            throw new Error(Messages.cannotAddFileRemoteMissing);
        }

        return gitLog.latest.hash;
    }

    private initialize(repositoryUri: URI): void {
        this.gitReference = git(repositoryUri.fsPath);
    }
}
