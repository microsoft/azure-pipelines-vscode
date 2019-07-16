import * as fs from 'fs';
import * as path from 'path';
import * as git from 'simple-git/promise';
import * as Q from 'q';
import * as util from 'util';
import * as vscode from 'vscode';

import { AzureDevOpsHelper } from './devOps/azureDevOpsHelper';
import { Messages } from '../messages';
import { GitRepositoryParameters, RepositoryProvider } from '../model/models';
import { GitHubProvider } from './gitHubHelper';
import { BranchSummary } from 'simple-git/typings/response';

export class LocalGitRepoHelper {
    private gitReference: git.SimpleGit;

    private constructor() {
    }

    public static GetHelperInstance(repositoryPath: string): LocalGitRepoHelper {
        var repoService = new LocalGitRepoHelper();
        repoService.initialize(repositoryPath);
        return repoService;
    }

    public static async GetAvailableFileName(fileName:string, repoPath: string): Promise<string> {
        let deferred: Q.Deferred<string> = Q.defer();
        fs.readdir(repoPath, (err, files: string[]) => {
            if (files.indexOf(fileName) < 0) {
                deferred.resolve(fileName);
            }
            else {
                for (let i = 1; i < 100; i++) {
                    let increamentalFileName = LocalGitRepoHelper.getIncreamentalFileName(fileName, i);
                    if (files.indexOf(increamentalFileName) < 0) {
                        deferred.resolve(increamentalFileName);
                    }
                }
            }
        });

        return deferred.promise;
    }

    public async getGitRepoDetails(repositoryPath: string): Promise<GitRepositoryParameters> {
        let status = await this.gitReference.status();
        let branch = status.current;
        let commitId = await this.getLatestCommitId(branch);
        let remote = "";
        let remoteUrl = "" || null;
        if (!status.tracking) {
            let remotes = await this.gitReference.getRemotes(false);
            if (remotes.length !== 1) {
                throw new Error(util.format(Messages.branchRemoteMissing, branch));
            }
            remote = remotes[0].name;
        }
        else {
            remote = status.tracking.substr(0, status.tracking.indexOf(branch) - 1);
        }
        remoteUrl = await this.gitReference.remote(["get-url", remote]);

        if (remoteUrl) {
            if (AzureDevOpsHelper.isAzureReposUrl(remoteUrl)) {
                return <GitRepositoryParameters>{
                    repositoryProvider: RepositoryProvider.AzureRepos,
                    repositoryId: "",
                    repositoryName: AzureDevOpsHelper.getRepositoryNameFromRemoteUrl(remoteUrl),
                    remoteUrl: remoteUrl,
                    branch: branch,
                    commitId: commitId,
                    localPath: repositoryPath
                };
            }
            else if (GitHubProvider.isGitHubUrl(remoteUrl)) {
                let repoId = GitHubProvider.getRepositoryIdFromUrl(remoteUrl);
                return <GitRepositoryParameters>{
                    repositoryProvider: RepositoryProvider.Github,
                    repositoryId: repoId,
                    repositoryName: repoId,
                    remoteUrl: remoteUrl,
                    branch: branch,
                    commitId: commitId,
                    localPath: repositoryPath
                };
            }
            else {
                throw new Error(Messages.cannotIdentifyRespositoryDetails);
            }
        }
        else {
            throw new Error(Messages.remoteRepositoryNotConfigured);
        }
    }

    /**
     *
     * @param pipelineYamlPath : local path of yaml pipeline in the extension
     * @param context: inputs required to be filled in the yaml pipelines
     * @returns: thenable object which resolves once all files are added to the repository
     */
    public async addContentToFile(content: string, fileName: string, repoPath: string): Promise<string> {
        let filePath = path.join(repoPath, "/" + fileName);
        fs.writeFileSync(filePath, content);
        await vscode.workspace.saveAll(true);
        return fileName;
    }

    /**
     * commits yaml pipeline file into the local repo and pushes the commit to remote branch.
     * @param pipelineYamlPath : local path of yaml pipeline in the repository
     * @returns: thenable object which resolves once commit is pushed to remote branch, and failure message if unsuccessful
     */
    public async commitAndPushPipelineFile(pipelineYamlPath: string): Promise<{ commitId: string, branch: string }> {
        await this.gitReference.add(pipelineYamlPath);
        let commit = await this.gitReference.commit(Messages.addYmlFile, pipelineYamlPath);
        let status = await this.gitReference.status();
        let branch = status.current;
        let remote = status.tracking;
        if (!remote) {
            let remotes = await this.gitReference.getRemotes(false);
            if (remotes.length !== 1) {
                throw new Error(util.format(Messages.branchRemoteMissing, branch));
            }
            remote = remotes[0].name;
        }
        else {
            remote = remote.substr(0, remote.indexOf(branch) - 1);
        }

        if (remote && branch) {
            await this.gitReference.push(remote, branch, {
                "--set-upstream": null
            });
        }
        else {
            throw new Error(Messages.cannotAddFileRemoteMissing);
        }

        return {
            branch: branch,
            commitId: commit.commit
        };
    }

    private static getIncreamentalFileName(fileName: string, count: number): string {
        return fileName.substr(0, fileName.indexOf('.')).concat(` (${count})`, fileName.substr(fileName.indexOf('.')));
    }

    private async getLatestCommitId(branchName: string): Promise<string> {
        let branchSummary: BranchSummary = await this.gitReference.branchLocal();
        if (!!branchSummary.branches[branchName]) {
            return branchSummary.branches[branchName].commit;
        }

        return "";
    }

    private initialize(repositoryPath: string): void {
        this.gitReference = git(repositoryPath);
    }
}
