import * as assert from 'assert';
import { GitHubProvider } from '../../../configure/helper/gitHubHelper';

suite('GitHub Helper', () => {
    suite('isGitHubUrl', () => {
        test('Returns true for HTTPS GitHub URLs', () => {
            assert.ok(GitHubProvider.isGitHubUrl('https://github.com/microsoft/azure-pipelines-vscode'));
        });

        test('Returns true for HTTPS GitHub URLs with trailing .git', () => {
            assert.ok(GitHubProvider.isGitHubUrl('https://github.com/microsoft/azure-pipelines-vscode.git'));
        });

        test('Returns true for SSH GitHub URLs', () => {
            assert.ok(GitHubProvider.isGitHubUrl('git@github.com:microsoft/azure-pipelines-vscode.git'));
        });

        test('Returns false for non-GitHub HTTPS URLs', () => {
            assert.strictEqual(
                GitHubProvider.isGitHubUrl('https://github.coms/microsoft/azure-pipelines-vscode'),
                false);
        });

        test('Returns false for non-GitHub SSH URLs', () => {
            assert.strictEqual(
                GitHubProvider.isGitHubUrl('sgit@github.com:microsoft/azure-pipelines-vscode.git'),
                false);
        });
    });

    suite('getRepositoryDetailsFromRemoteUrl', () => {
        test('Returns owner and repo from an HTTPS URL', () => {
            assert.strictEqual(
                GitHubProvider.getRepositoryDetailsFromRemoteUrl('https://github.com/microsoft/azure-pipelines-vscode'),
                { ownerName: 'microsoft', repositoryName: 'azure-pipelines-vscode' });
        });

        test('Returns owner from an HTTPS URL with trailing .git', () => {
            assert.strictEqual(
                GitHubProvider.getRepositoryDetailsFromRemoteUrl('https://github.com/microsoft/azure-pipelines-vscode.git'),
                { ownerName: 'microsoft', repositoryName: 'azure-pipelines-vscode' });
        });

        test('Returns owner from a SSH URL', () => {
            assert.strictEqual(
                GitHubProvider.getRepositoryDetailsFromRemoteUrl('git@github.com:microsoft/azure-pipelines-vscode.git'),
                { ownerName: 'microsoft', repositoryName: 'azure-pipelines-vscode' });
        });
    });

    suite('getFormattedRemoteUrl', () => {
        test('Returns HTTPS URLs as-is', () => {
            assert.strictEqual(
                GitHubProvider.getFormattedRemoteUrl('https://github.com/microsoft/azure-pipelines-vscode.git'),
                'https://github.com/microsoft/azure-pipelines-vscode.git');
        });

        test('Returns an HTTPS URL from a SSH URL', () => {
            assert.strictEqual(
                GitHubProvider.getFormattedRemoteUrl('git@github.com:microsoft/azure-pipelines-vscode.git'),
                'https://github.com/microsoft/azure-pipelines-vscode.git');
        });
    });
});
