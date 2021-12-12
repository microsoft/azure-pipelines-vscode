import * as assert from 'assert';
import { AzureDevOpsHelper } from '../../configure/helper/devOps/azureDevOpsHelper';

suite('Azure DevOps Helper', () => {
    suite('isAzureReposUrl', () => {
        test('Returns true for HTTPS ADO URLs', () => {
            assert.ok(AzureDevOpsHelper.isAzureReposUrl('https://dev.azure.com/ms/example/_git/repo'));
        });

        test('Returns true for HTTPS ADO URLs with leading organization', () => {
            assert.ok(AzureDevOpsHelper.isAzureReposUrl('https://ms@dev.azure.com/ms/example/_git/repo'));
        });

        test('Returns true for SSH ADO URLs', () => {
            assert.ok(AzureDevOpsHelper.isAzureReposUrl('git@ssh.dev.azure.com:v3/ms/example/repo'));
        });

        test('Returns true for legacy HTTPS VSTS URLs', () => {
            assert.ok(AzureDevOpsHelper.isAzureReposUrl('https://ms.visualstudio.com/example/_git/repo'));
        });

        test('Returns true for legacy HTTPS VSTS URLs with DefaultCollection', () => {
            assert.ok(AzureDevOpsHelper.isAzureReposUrl('https://ms.visualstudio.com/DefaultCollection/example/_git/repo'));
        });

        test('Returns true for legacy SSH VSTS URLs', () => {
            assert.ok(AzureDevOpsHelper.isAzureReposUrl('ms@vs-ssh.visualstudio.com:v3/ms/example/repo'));
        });

        test('Returns false for non-ADO HTTPS URLs', () => {
            assert.strictEqual(
                AzureDevOpsHelper.isAzureReposUrl('https://dev.azure.coms/ms/example/_git/repo'),
                false);
        });

        test('Returns false for non-ADO SSH URLs', () => {
            assert.strictEqual(
                AzureDevOpsHelper.isAzureReposUrl('git@dev.azure.com:v3/ms/example/repo'),
                false);
        });

        test('Returns false for non-VSTS HTTPS URLs', () => {
            assert.strictEqual(
                AzureDevOpsHelper.isAzureReposUrl('https://ms.visualstudio.coms/example/_git/repo'),
                false);
        });

        test('Returns false for non-VSTS SSH URLs', () => {
            assert.strictEqual(
                AzureDevOpsHelper.isAzureReposUrl('ms@ssh.visualstudio.com:v3/ms/example/repo'),
                false);
        });
    });

    suite('getRepositoryIdFromUrl', () => {
        test('Returns details from an HTTPS ADO URL', () => {
            assert.deepStrictEqual(
                AzureDevOpsHelper.getRepositoryDetailsFromRemoteUrl('https://dev.azure.com/ms/example/_git/repo'),
                {
                    organizationName: 'ms',
                    projectName: 'example',
                    repositoryName: 'repo',
                });
        });

        test('Returns details from an HTTPS ADO URL with leading organization', () => {
            assert.deepStrictEqual(
                AzureDevOpsHelper.getRepositoryDetailsFromRemoteUrl('https://ms@dev.azure.com/ms/example/_git/repo'),
                {
                    organizationName: 'ms',
                    projectName: 'example',
                    repositoryName: 'repo',
                });
        });

        test('Returns details from a SSH ADO URL', () => {
            assert.deepStrictEqual(
                AzureDevOpsHelper.getRepositoryDetailsFromRemoteUrl('git@ssh.dev.azure.com:v3/ms/example/repo'),
                {
                    organizationName: 'ms',
                    projectName: 'example',
                    repositoryName: 'repo',
                });
        });

        test('Returns details from a legacy HTTPS VSTS URL', () => {
            assert.deepStrictEqual(
                AzureDevOpsHelper.getRepositoryDetailsFromRemoteUrl('https://ms.visualstudio.com/example/_git/repo'),
                {
                    organizationName: 'ms',
                    projectName: 'example',
                    repositoryName: 'repo',
                });
        });

        test('Returns details from a legacy HTTPS VSTS URL with DefaultCollection', () => {
            assert.deepStrictEqual(
                AzureDevOpsHelper.getRepositoryDetailsFromRemoteUrl('https://ms.visualstudio.com/DefaultCollection/example/_git/repo'),
                {
                    organizationName: 'ms',
                    projectName: 'example',
                    repositoryName: 'repo',
                });
        });

        test('Returns details from a legacy SSH VSTS URL', () => {
            assert.deepStrictEqual(
                AzureDevOpsHelper.getRepositoryDetailsFromRemoteUrl('ms@vs-ssh.visualstudio.com:v3/ms/example/repo'),
                {
                    organizationName: 'ms',
                    projectName: 'example',
                    repositoryName: 'repo',
                });
        });
    });

    suite('getFormattedRemoteUrl', () => {
        test('Returns HTTPS ADO URLs as-is', () => {
            assert.strictEqual(
                AzureDevOpsHelper.getFormattedRemoteUrl('https://dev.azure.com/ms/example/_git/repo'),
                'https://dev.azure.com/ms/example/_git/repo');
        });

        test('Returns HTTPS ADO URLs with leading organization as-is', () => {
            assert.strictEqual(
                AzureDevOpsHelper.getFormattedRemoteUrl('https://ms@dev.azure.com/ms/example/_git/repo'),
                'https://ms@dev.azure.com/ms/example/_git/repo');
        });

        test('Returns an HTTPS VSTS URL from a SSH ADO URL', () => {
            assert.strictEqual(
                AzureDevOpsHelper.getFormattedRemoteUrl('git@ssh.dev.azure.com:v3/ms/example/repo'),
                'https://ms.visualstudio.com/example/_git/repo');
        });

        test('Returns an HTTPS VSTS URL from a SSH VSTS URL', () => {
            assert.strictEqual(
                AzureDevOpsHelper.getFormattedRemoteUrl('ms@vs-ssh.visualstudio.com:v3/ms/example/repo'),
                'https://ms.visualstudio.com/example/_git/repo');
        });
    });

    suite('getOldFormatBuildDefinitionUrl', () => {
        test('Returns a legacy HTTPS VSTS build definition URL', () => {
            assert.strictEqual(
                AzureDevOpsHelper.getOldFormatBuildDefinitionUrl('ms', 'example', 42),
                'https://ms.visualstudio.com/example/_build?definitionId=42&_a=summary');
        });
    });

    suite('getOldFormatBuildUrl', () => {
        test('Returns a legacy HTTPS VSTS build URL', () => {
            assert.strictEqual(
                AzureDevOpsHelper.getOldFormatBuildUrl('ms', 'example', 42),
                'https://ms.visualstudio.com/example/_build/results?buildId=42&view=results');
        });
    });

    suite('generateDevOpsProjectName', () => {
        test('Returns repository name prefixed by AzurePipelines-', () => {
            assert.strictEqual(
                AzureDevOpsHelper.generateDevOpsProjectName('repository'),
                'AzurePipelines-repository');
        });

        test('Strips owner name from repository name', () => {
            assert.strictEqual(
                AzureDevOpsHelper.generateDevOpsProjectName('owner/repository'),
                'AzurePipelines-repository');
        });

        test('Strips owner name from repository name', () => {
            assert.strictEqual(
                AzureDevOpsHelper.generateDevOpsProjectName('owner/repository'),
                'AzurePipelines-repository');
        });

        test('Strips trailing periods from repository name', () => {
            assert.strictEqual(
                AzureDevOpsHelper.generateDevOpsProjectName('owner/repos.itory...'),
                'AzurePipelines-repos.itory');
        });

        test('Strips trailing underscores from repository name', () => {
            assert.strictEqual(
                AzureDevOpsHelper.generateDevOpsProjectName('owner/repos_itory___'),
                'AzurePipelines-repos_itory');
        });

        test('Strips trailing periods and underscores from repository name', () => {
            assert.strictEqual(
                AzureDevOpsHelper.generateDevOpsProjectName('owner/repos._itory_._._'),
                'AzurePipelines-repos._itory');
        });

        test('Keeps final project name within 64 characters', () => {
            // 70 characters long
            const name = '0123456789012345678901234567890123456789012345678901234567890123456789';
            const projectName = 'AzurePipelines-0123456789012345678901234567890123456789012345678';
            assert.strictEqual(projectName.length, 64);
            assert.strictEqual(
                AzureDevOpsHelper.generateDevOpsProjectName(`owner/${name}`),
                projectName);
        });
    });
});
