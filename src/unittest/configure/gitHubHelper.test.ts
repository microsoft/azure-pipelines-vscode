import * as assert from 'assert';
import { GitHubProvider } from '../../configure/helper/gitHubHelper';

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

    suite('getRepositoryIdFromUrl', () => {
        test('Returns username/repository from an HTTPS URL', () => {
            assert.strictEqual(
                GitHubProvider.getRepositoryIdFromUrl('https://github.com/microsoft/azure-pipelines-vscode'),
                'microsoft/azure-pipelines-vscode');
        });

        test('Returns username/repository from an HTTPS URL with trailing .git', () => {
            assert.strictEqual(
                GitHubProvider.getRepositoryIdFromUrl('https://github.com/microsoft/azure-pipelines-vscode.git'),
                'microsoft/azure-pipelines-vscode');
        });

        test('Returns username/repository from a SSH URL', () => {
            assert.strictEqual(
                GitHubProvider.getRepositoryIdFromUrl('git@github.com:microsoft/azure-pipelines-vscode.git'),
                'microsoft/azure-pipelines-vscode');
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
