import { GitRepositoryParameters, GitBranchDetails } from '../model/models';
import { Messages } from '../resources/messages';
import * as fs from 'fs/promises';
import * as git from 'simple-git/promise';
import * as path from 'path';
import * as vscode from 'vscode';
import { AzureDevOpsHelper } from './devOps/azureDevOpsHelper';
import { GitHubProvider } from './gitHubHelper';
import { telemetryHelper } from "../../helpers/telemetryHelper";
import { TelemetryKeys } from "../../helpers/telemetryKeys";

export class LocalGitRepoHelper {
    private gitReference: git.SimpleGit;

    private constructor() {
    }

    public static async GetHelperInstance(repositoryPath: string): Promise<LocalGitRepoHelper> {
        try {
            const repoService = new LocalGitRepoHelper();
            repoService.initialize(repositoryPath);
            await repoService.gitReference.status();
            return repoService;
        } catch (error) {
            let gitFolderExists = true;
            try {
                await fs.access(path.join(repositoryPath, ".git"));
            } catch (e) {
                gitFolderExists = false;
            }

            telemetryHelper.setTelemetry(TelemetryKeys.GitFolderExists, gitFolderExists.toString());
            throw new Error(Messages.notAGitRepository);
        }
    }

    public static async GetAvailableFileName(fileName:string, repoPath: string): Promise<string> {
        const files = await fs.readdir(repoPath);
        if (!files.includes(fileName)) {
            return fileName;
        }

        for (let i = 1; i < 100; i++) {
            let incrementalFileName = LocalGitRepoHelper.getIncrementalFileName(fileName, i);
            if (!files.includes(incrementalFileName)) {
                return incrementalFileName;
            }
        }

        throw new Error(Messages.noAvailableFileNames);
    }

    public async getGitBranchDetails(): Promise<GitBranchDetails> {
        let status = await this.gitReference.status();
        let branch = status.current; // TODO: This is wrong.
        let remote = status.tracking ? status.tracking.substr(0, status.tracking.indexOf(branch) - 1) : null;

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

    public async getGitRemoteUrl(remoteName: string): Promise<string|void> {
        let remoteUrl = await this.gitReference.remote(["get-url", remoteName]);
        if (remoteUrl) {
            remoteUrl = remoteUrl.trim();
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
        await fs.writeFile(filePath, content);
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
            await this.gitReference.push(repositoryDetails.remoteName, undefined, {
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

    private static getIncrementalFileName(fileName: string, count: number): string {
        return fileName.substr(0, fileName.indexOf('.')).concat(` (${count})`, fileName.substr(fileName.indexOf('.')));
    }

    private initialize(repositoryPath: string): void {
        this.gitReference = git(repositoryPath);
    }
}
