/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License.
*--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

import { after, afterEach, before, beforeEach } from 'mocha';
import * as SimpleGit from 'simple-git/promise';

import { LocalGitRepoHelper } from '../../configure/helper/LocalGitRepoHelper';
import { GitRepositoryParameters } from '../../configure/model/models';

// In a sense, many of these tests end up testing the inner workings of simple-git
// and so could be considered redundant if we assume that simple-git works as intended.
// However, I find that having these tests here help explain each function's return value,
// especially for edge cases, without having to manually create a bunch of Git repos
// and self-verifying.
suite('LocalGitRepoHelper', () => {
    let noGitPath: string;
    let emptyGitPath: string;
    let noRemotesGitPath: string;
    let remotesGitPath: string;
    let trackingGitPath: string;

    let allGitPaths: string[] = [];

    // Create a bunch of mock Git repositories in temp.
    // TODO: It might make sense to store these instead as text fixtures but with
    // .git renamed to dot-git, so that other tests can also use them.
    // Then all we need to do is move them to temp & rename dot-git back to .git.
    before(async () => {
        // An empty directory (no .git)
        noGitPath = await fs.mkdtemp(path.join(os.tmpdir(), 'azure-pipelines-vscode-no-git-'));
        allGitPaths.push(noGitPath);

        // A directory with an empty .git folder
        emptyGitPath = await fs.mkdtemp(path.join(os.tmpdir(), 'azure-pipelines-vscode-empty-git-'));
        allGitPaths.push(emptyGitPath);
        await fs.mkdir(path.join(emptyGitPath, '.git'));

        // A repository with no remotes
        // This one has a commit so it can be tracked by other repositories
        noRemotesGitPath = await fs.mkdtemp(path.join(os.tmpdir(), 'azure-pipelines-vscode-git-no-remotes-'));
        allGitPaths.push(noRemotesGitPath);
        const noRemotesGit = SimpleGit(noRemotesGitPath);
        await noRemotesGit.init();

        // Ensure we have committer details for CI
        await noRemotesGit.addConfig('user.name', 'azure-pipelines-vscode unit tests');
        await noRemotesGit.addConfig('user.email', 'test@example.com');

        await noRemotesGit.commit('Initial commit', undefined, {
            '--allow-empty': null,
        });

        // A repository with many remotes, but no tracking branches
        remotesGitPath = await fs.mkdtemp(path.join(os.tmpdir(), 'azure-pipelines-vscode-git-remotes-'));
        allGitPaths.push(remotesGitPath);
        const remotesGit = SimpleGit(remotesGitPath);
        await remotesGit.init();
        await remotesGit.addRemote('github', 'https://github.com/microsoft/azure-pipelines-vscode.git');
        await remotesGit.addRemote('ado', 'https://dev.azure.com/ms/azure-pipelines-vscode/example.git');
        await remotesGit.addRemote('trim', 'https://dev.azure.com/ms/azure-pipelines-vscode/example/');
        await remotesGit.addRemote('vsts', 'https://ms.visualstudio.com/azure-pipelines-vscode/example.git');

        // A repository with a tracking branch
        trackingGitPath = await fs.mkdtemp(path.join(os.tmpdir(), 'azure-pipelines-vscode-git-tracking-'));
        allGitPaths.push(trackingGitPath);
        await SimpleGit(trackingGitPath).clone(noRemotesGitPath, trackingGitPath);
    });

    suite('Instantiation', () => {
        test('Rejects when no .git folder is present', () => {
            assert.rejects(async () =>
                await LocalGitRepoHelper.GetHelperInstance(noGitPath));
        });

        test('Rejects when an empty .git folder is present', () => {
            assert.rejects(async () =>
                await LocalGitRepoHelper.GetHelperInstance(emptyGitPath));
        });

        test('Returns a LocalGitRepoHelper instance when the folder is a Git repository', async () => {
            const helper = await LocalGitRepoHelper.GetHelperInstance(noRemotesGitPath);
            assert.ok(helper instanceof LocalGitRepoHelper);
        });
    });

    // These tests use `git branch` to avoid hardcoding the default branch name,
    // which is configurable via `init.defaultBranch`.
    suite('getGitBranchDetails', () => {
        test('Returns branch and remote name', async () => {
            const helper = await LocalGitRepoHelper.GetHelperInstance(trackingGitPath);
            const details = await helper.getGitBranchDetails();
            assert.deepStrictEqual(details, {
                branch: (await SimpleGit(trackingGitPath).branch([])).current,
                remoteName: 'origin',
            });
        });

        // Re-enable when simple-git >= 2.11.0
        test.skip('Returns null remote if current branch is not tracking a remote', async () => {
            const helper = await LocalGitRepoHelper.GetHelperInstance(remotesGitPath);
            const details = await helper.getGitBranchDetails();
            assert.deepStrictEqual(details, {remoteName: null});
        });

        // Re-enable when simple-git >= 2.48.0 (using new .detached property)
        test.skip('Returns null branch and null remote when on a detached head', async () => {
            const helper = await LocalGitRepoHelper.GetHelperInstance(trackingGitPath);
            const trackingGit = SimpleGit(trackingGitPath);
            await trackingGit.checkout((await trackingGit.log()).latest.hash);

            const details = await helper.getGitBranchDetails();
            assert.deepStrictEqual(details, {branch: null, remoteName: null});
        });
    });

    suite('getGitRemoteNames', () => {
        test("Doesn't return remotes that don't point anywhere", async () => {
            const helper = await LocalGitRepoHelper.GetHelperInstance(noRemotesGitPath);
            assert.ok((await helper.getGitRemoteNames()).length === 0);
        });

        test('Returns all remote names', async () => {
            const helper = await LocalGitRepoHelper.GetHelperInstance(remotesGitPath);
            const remotes = await helper.getGitRemoteNames();
            assert.ok(remotes.length === 4);
            assert.ok(remotes.includes('ado'));
            assert.ok(!remotes.includes('origin'));
        });
    });

    suite('getGitRemoteUrl', () => {
        test('Returns the URL for a remote', async () => {
            const helper = await LocalGitRepoHelper.GetHelperInstance(remotesGitPath);
            const url = await helper.getGitRemoteUrl('ado');
            assert.strictEqual(url, 'https://dev.azure.com/ms/azure-pipelines-vscode/example.git');
        });

        test('Trims the remote URL', async () => {
            const helper = await LocalGitRepoHelper.GetHelperInstance(remotesGitPath);
            const url = await helper.getGitRemoteUrl('trim');
            assert.strictEqual(url, 'https://dev.azure.com/ms/azure-pipelines-vscode/example');
        });
    });

    suite('getGitRootDirectory', () => {
        test('Returns the root directory', async () => {
            const helper = await LocalGitRepoHelper.GetHelperInstance(remotesGitPath);
            const root = await helper.getGitRootDirectory();
            assert.strictEqual(root, remotesGitPath);
        });

        test('Returns the root directory in a child folder', async () => {
            const childPath = path.join(remotesGitPath, 'child');
            await fs.mkdir(path.join(remotesGitPath, 'child'));
            const helper = await LocalGitRepoHelper.GetHelperInstance(childPath);
            const root = await helper.getGitRootDirectory();
            assert.strictEqual(root, remotesGitPath);
        });
    });

    suite('commitAndPushPipelineFile', () => {
        let localGitPath: string;
        let remoteGitPath: string;
        let localGit: SimpleGit.SimpleGit;
        let remoteGit: SimpleGit.SimpleGit;

        // We create these repos in a beforeEach because we don't want write operations interfering
        // between tests.
        beforeEach(async () => {
            localGitPath = await fs.mkdtemp(path.join(os.tmpdir(), 'azure-pipelines-vscode-git-local-'));
            remoteGitPath = await fs.mkdtemp(path.join(os.tmpdir(), 'azure-pipelines-vscode-git-remote-'));

            remoteGit = SimpleGit(remoteGitPath);
            await remoteGit.init();

            // Ensure we have committer details for CI
            await remoteGit.addConfig('user.name', 'azure-pipelines-vscode unit tests');
            await remoteGit.addConfig('user.email', 'test@example.com');

            // We need to give it an initial commit to initialize the default branch.
            // Also allow receiving pushes to the current branch.
            await remoteGit.commit('Initial commit', undefined, {
                '--allow-empty': null,
            });
            await remoteGit.addConfig('receive.denyCurrentBranch', 'ignore');

            // Clone the repository we just set up so that it's considered a remote
            localGit = SimpleGit(localGitPath);
            await localGit.clone(remoteGitPath, localGitPath);

            // Ensure we have committer details for CI
            await localGit.addConfig('user.name', 'azure-pipelines-vscode unit tests');
            await localGit.addConfig('user.email', 'test@example.com');
        });

        test('Pushes pipeline YAML and returns the commit ID', async () => {
            const helper = await LocalGitRepoHelper.GetHelperInstance(localGitPath);
            const pipelineYamlPath = path.join(localGitPath, 'azure-pipelines.yaml');
            await fs.writeFile(pipelineYamlPath, 'test');

            // This has all the properties that the method expects.
            // Don't think it's worth it to create a full GitRepositoryParameters.
            // TODO: Get this from getGitBranchDetails when simple-git >= 2.11.0.
            const repositoryDetails = {
                remoteName: 'origin',
                branch: 'main',
            } as GitRepositoryParameters;
            const hash = await helper.commitAndPushPipelineFile(pipelineYamlPath, repositoryDetails);

            // Since we have main checked out already, need to reset --hard to pick up changes.
            await remoteGit.reset('hard');

            assert.strictEqual(
                await fs.readFile(pipelineYamlPath, 'utf-8'),
                await fs.readFile(path.join(remoteGitPath, 'azure-pipelines.yaml'), 'utf-8'));
            assert.strictEqual(hash, (await remoteGit.log()).latest.hash);
        });

        afterEach(async () => {
            await fs.rm(localGitPath, {recursive: true, force: true});
            await fs.rm(remoteGitPath, {recursive: true, force: true});
        });
    });

    after(async () => {
        for (const gitPath of allGitPaths) {
            await fs.rm(gitPath, {recursive: true, force: true})
        }
    });
});
