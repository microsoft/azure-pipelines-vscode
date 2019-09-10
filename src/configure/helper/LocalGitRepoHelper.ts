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

    public static async GetHelperInstance(repositoryPath: string): Promise<LocalGitRepoHelper> {
        try {
            var repoService = new LocalGitRepoHelper();
            repoService.initialize(repositoryPath);
            await repoService.gitReference.status();
            return repoService;
        }
        catch(error) {
            let gitFolderExists = fs.existsSync(path.join(repositoryPath, ".git"));
            telemetryHelper.setTelemetry(TelemetryKeys.GitFolderExists, gitFolderExists.toString());
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

    public async getGitRootDirectory(): Promise<string> {
        let gitRootDir = await this.gitReference.revparse(["--show-toplevel"]);
        return path.normalize(gitRootDir.trim());
    }

    private static getIncreamentalFileName(fileName: string, count: number): string {
        return fileName.substr(0, fileName.indexOf('.')).concat(` (${count})`, fileName.substr(fileName.indexOf('.')));
    }

    private initialize(repositoryPath: string): void {
        this.gitReference = git(repositoryPath);
    }
}
