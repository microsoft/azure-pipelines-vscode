import { GitRepositoryParameters, GitBranchDetails } from '../model/models';
import { Messages } from '../resources/messages';
import * as fs from 'fs';
import * as git from 'simple-git/promise';
import * as path from 'path';
import * as Q from 'q';
import * as vscode from 'vscode';
import { RemoteWithoutRefs } from 'simple-git/typings/response';
import {AzureDevOpsHelper} from './devOps/azureDevOpsHelper';
import {GitHubProvider} from './gitHubHelper';
import { telemetryHelper } from "./telemetryHelper";
import { TelemetryKeys } from "../resources/telemetryKeys";

export class LocalGitRepoHelper {
    private gitReference: git.SimpleGit;

    private constructor() {
    }

    public static GetHelperInstance(repositoryPath: string): LocalGitRepoHelper {
        var repoService = new LocalGitRepoHelper();
        repoService.initialize(repositoryPath);

        let gitFolderExists = fs.existsSync(path.join(repositoryPath, ".git"));
        telemetryHelper.setTelemetry(TelemetryKeys.GitFolderExists, gitFolderExists.toString());
        
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

    public async isGitRepository(): Promise<boolean> {
        try {
            await this.gitReference.status();
            return true;
        }
        catch(error) {
            return false;
        }
    }

    public async getGitBranchDetails(): Promise<GitBranchDetails> {
        let status = await this.gitReference.status();
        let branch = status.current;
        let remote = status.tracking ? status.tracking.substr(0, status.tracking.indexOf(branch) - 1) : null;

        return {
            branch: branch,
            remoteName: remote
        };
    }

    public async getGitRemotes(): Promise<RemoteWithoutRefs[]> {
        return this.gitReference.getRemotes(false);
    }

    public async getGitRemoteUrl(remoteName: string): Promise<string|void> {
        let remoteUrl = await this.gitReference.remote(["get-url", remoteName]);
        if (remoteUrl) {
            remoteUrl = (<string>remoteUrl).trim();
            if (remoteUrl[remoteUrl.length - 1] === '/') {
                remoteUrl = remoteUrl.substr(0, remoteUrl.length - 1);
            }
        }

        if (AzureDevOpsHelper.isAzureReposUrl(<string>remoteUrl)) {
            remoteUrl = AzureDevOpsHelper.getFormattedRemoteUrl(<string>remoteUrl);
        }
        else if (GitHubProvider.isGitHubUrl(<string>remoteUrl)) {
            remoteUrl = GitHubProvider.getFormattedRemoteUrl(<string>remoteUrl);
        }
        return remoteUrl;
    }

    /**
     *
     * @param pipelineYamlPath : local path of yaml pipeline in the extension
     * @param context: inputs required to be filled in the yaml pipelines
     * @returns: thenable object which resolves once all files are added to the repository
     */
    public async addContentToFile(content: string, pathToFile: string): Promise<string> {
        fs.writeFileSync(pathToFile, content);
        await vscode.workspace.saveAll(true);
        return pathToFile;
    }

    /**
     * commits yaml pipeline file into the local repo and pushes the commit to remote branch.
     * @param pipelineYamlPath : local path of yaml pipeline in the repository
     * @returns: thenable string which resolves to commitId once commit is pushed to remote branch, and failure message if unsuccessful
     */
    public async commitAndPushPipelineFile(pipelineYamlPath: string, repositoryDetails: GitRepositoryParameters, commitMessage: string): Promise<string> {
        await this.gitReference.add(pipelineYamlPath);
        await this.gitReference.commit(commitMessage, pipelineYamlPath);
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

    public async getGitRootDirectory(): Promise<string> {
        let gitRootDir = await this.gitReference.revparse(["--show-toplevel"]);
        return path.normalize(gitRootDir.trim());
    }

    public async initializeGitRepository(remoteName: string, remoteUrl: string, filesToExcludeRegex?: string): Promise<void> {
        let isGitRepository = await this.isGitRepository()

        if(!isGitRepository) {
            await this.gitReference.init();
        }

        try {
            // Try to see if there are any commits
            await this.gitReference.log();
        }
        catch(error) {
            // Commit all files if there are not commits on this branch
            await this.gitReference.add(`:!${filesToExcludeRegex}`);
            await this.gitReference.commit("Initialized git repository");
        }

        await this.gitReference.addRemote(remoteName, remoteUrl);
    }

    private static getIncreamentalFileName(fileName: string, count: number): string {
        return fileName.substr(0, fileName.indexOf('.')).concat(` (${count})`, fileName.substr(fileName.indexOf('.')));
    }

    private initialize(repositoryPath: string): void {
        this.gitReference = git(repositoryPath);
    }
}
