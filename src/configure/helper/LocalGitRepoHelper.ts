import { AzureDevOpsHelper } from './devOps/azureDevOpsHelper';
import { GitHubProvider } from './gitHubHelper';
import { extensionVariables, GitRepositoryParameters, RepositoryProvider } from '../model/models';
import { Messages } from '../resources/messages';
import * as fs from 'fs';
import * as git from 'simple-git/promise';
import * as path from 'path';
import * as Q from 'q';
import * as util from 'util';
import * as vscode from 'vscode';

export class LocalGitRepoHelper {
    private gitReference: git.SimpleGit;

    private constructor() {
    }

    public static async GetHelperInstance(repositoryPath: string): Promise<LocalGitRepoHelper> {
        try {
            var repoService = new LocalGitRepoHelper();
            repoService.initialize(repositoryPath);
            await repoService.gitReference.status();
            return repoService;
        }
        catch(error) {
            throw new Error(Messages.notAGitRepository);
        }
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
        let remote = "";
        let remoteUrl = "" || null;
        if (!status.tracking) {
            let remotes = await this.gitReference.getRemotes(false);
            if (remotes.length === 0) {
                throw new Error(util.format(Messages.branchRemoteMissing, branch));
            }
            else if(remotes.length === 1) {
                remote = remotes[0].name;
            }
            else {
                // Show an option to user to select remote to be configured
                let selectedRemote = await extensionVariables.ui.showQuickPick(remotes.map(remote => { return { label: remote.name }; }), { placeHolder: Messages.selectRemoteForBranch });
                remote = selectedRemote.label;
            }
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
                    remoteName: remote,
                    remoteUrl: remoteUrl,
                    branch: branch,
                    commitId: "",
                    localPath: repositoryPath
                };
            }
            else if (GitHubProvider.isGitHubUrl(remoteUrl)) {
                let repoId = GitHubProvider.getRepositoryIdFromUrl(remoteUrl);
                return <GitRepositoryParameters>{
                    repositoryProvider: RepositoryProvider.Github,
                    repositoryId: repoId,
                    repositoryName: repoId,
                    remoteName: remote,
                    remoteUrl: remoteUrl,
                    branch: branch,
                    commitId: "",
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
     * @returns: thenable string which resolves to commitId once commit is pushed to remote branch, and failure message if unsuccessful
     */
    public async commitAndPushPipelineFile(pipelineYamlPath: string, repositoryDetails: GitRepositoryParameters): Promise<string> {
        await this.gitReference.add(pipelineYamlPath);
        await this.gitReference.commit(Messages.addYmlFile, pipelineYamlPath);
        let gitLog = await this.gitReference.log();

        if (repositoryDetails.remoteName && repositoryDetails.branch) {
            await this.gitReference.push(repositoryDetails.remoteName, repositoryDetails.branch, {
                "--set-upstream": null
            });
        }
        else {
            throw new Error(Messages.cannotAddFileRemoteMissing);
        }

        return gitLog.latest.hash;
    }

    private static getIncreamentalFileName(fileName: string, count: number): string {
        return fileName.substr(0, fileName.indexOf('.')).concat(` (${count})`, fileName.substr(fileName.indexOf('.')));
    }

    private initialize(repositoryPath: string): void {
        this.gitReference = git(repositoryPath);
    }
}
