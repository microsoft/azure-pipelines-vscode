import * as assert from 'assert';
import { isAzureReposUrl, getFormattedRemoteUrl, getRepositoryDetailsFromRemoteUrl, getOldFormatBuildDefinitionUrl, getOldFormatBuildUrl } from '../../../configure/helper/devOps/azureDevOpsHelper';

suite('Azure DevOps Helper', () => {
    suite('isAzureReposUrl', () => {
        test('Returns true for HTTPS ADO URLs', () => {
            assert.ok(isAzureReposUrl('https://dev.azure.com/ms/example/_git/repo'));
        });

        test('Returns true for HTTPS ADO URLs with leading organization', () => {
            assert.ok(isAzureReposUrl('https://ms@dev.azure.com/ms/example/_git/repo'));
        });

        test('Returns true for SSH ADO URLs', () => {
            assert.ok(isAzureReposUrl('git@ssh.dev.azure.com:v3/ms/example/repo'));
        });

        test('Returns true for legacy HTTPS VSTS URLs', () => {
            assert.ok(isAzureReposUrl('https://ms.visualstudio.com/example/_git/repo'));
        });

        test('Returns true for legacy HTTPS VSTS URLs with DefaultCollection', () => {
            assert.ok(isAzureReposUrl('https://ms.visualstudio.com/DefaultCollection/example/_git/repo'));
        });

        test('Returns true for legacy SSH VSTS URLs', () => {
            assert.ok(isAzureReposUrl('ms@vs-ssh.visualstudio.com:v3/ms/example/repo'));
        });

        test('Returns false for non-ADO HTTPS URLs', () => {
            assert.strictEqual(
                isAzureReposUrl('https://dev.azure.coms/ms/example/_git/repo'),
                false);
        });

        test('Returns false for non-ADO SSH URLs', () => {
            assert.strictEqual(
                isAzureReposUrl('git@dev.azure.com:v3/ms/example/repo'),
                false);
        });

        test('Returns false for non-VSTS HTTPS URLs', () => {
            assert.strictEqual(
                isAzureReposUrl('https://ms.visualstudio.coms/example/_git/repo'),
                false);
        });

        test('Returns false for non-VSTS SSH URLs', () => {
            assert.strictEqual(
                isAzureReposUrl('ms@ssh.visualstudio.com:v3/ms/example/repo'),
                false);
        });
    });

    suite('getRepositoryIdFromUrl', () => {
        test('Returns details from an HTTPS ADO URL', () => {
            assert.deepStrictEqual(
                getRepositoryDetailsFromRemoteUrl('https://dev.azure.com/ms/example/_git/repo'),
                {
                    organizationName: 'ms',
                    projectName: 'example',
                    repositoryName: 'repo',
                });
        });

        test('Returns details from an HTTPS ADO URL with leading organization', () => {
            assert.deepStrictEqual(
                getRepositoryDetailsFromRemoteUrl('https://ms@dev.azure.com/ms/example/_git/repo'),
                {
                    organizationName: 'ms',
                    projectName: 'example',
                    repositoryName: 'repo',
                });
        });

        test('Returns details from a SSH ADO URL', () => {
            assert.deepStrictEqual(
                getRepositoryDetailsFromRemoteUrl('git@ssh.dev.azure.com:v3/ms/example/repo'),
                {
                    organizationName: 'ms',
                    projectName: 'example',
                    repositoryName: 'repo',
                });
        });

        test('Returns details from a legacy HTTPS VSTS URL', () => {
            assert.deepStrictEqual(
                getRepositoryDetailsFromRemoteUrl('https://ms.visualstudio.com/example/_git/repo'),
                {
                    organizationName: 'ms',
                    projectName: 'example',
                    repositoryName: 'repo',
                });
        });

        test('Returns details from a legacy HTTPS VSTS URL with DefaultCollection', () => {
            assert.deepStrictEqual(
                getRepositoryDetailsFromRemoteUrl('https://ms.visualstudio.com/DefaultCollection/example/_git/repo'),
                {
                    organizationName: 'ms',
                    projectName: 'example',
                    repositoryName: 'repo',
                });
        });

        test('Returns details from a legacy SSH VSTS URL', () => {
            assert.deepStrictEqual(
                getRepositoryDetailsFromRemoteUrl('ms@vs-ssh.visualstudio.com:v3/ms/example/repo'),
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
                getFormattedRemoteUrl('https://dev.azure.com/ms/example/_git/repo'),
                'https://dev.azure.com/ms/example/_git/repo');
        });

        test('Returns HTTPS ADO URLs with leading organization as-is', () => {
            assert.strictEqual(
                getFormattedRemoteUrl('https://ms@dev.azure.com/ms/example/_git/repo'),
                'https://ms@dev.azure.com/ms/example/_git/repo');
        });

        test('Returns an HTTPS VSTS URL from a SSH ADO URL', () => {
            assert.strictEqual(
                getFormattedRemoteUrl('git@ssh.dev.azure.com:v3/ms/example/repo'),
                'https://ms.visualstudio.com/example/_git/repo');
        });

        test('Returns an HTTPS VSTS URL from a SSH VSTS URL', () => {
            assert.strictEqual(
                getFormattedRemoteUrl('ms@vs-ssh.visualstudio.com:v3/ms/example/repo'),
                'https://ms.visualstudio.com/example/_git/repo');
        });
    });

    suite('getOldFormatBuildDefinitionUrl', () => {
        test('Returns a legacy HTTPS VSTS build definition URL', () => {
            assert.strictEqual(
                getOldFormatBuildDefinitionUrl('ms', 'example', 42),
                'https://ms.visualstudio.com/example/_build?definitionId=42&_a=summary');
        });
    });

    suite('getOldFormatBuildUrl', () => {
        test('Returns a legacy HTTPS VSTS build URL', () => {
            assert.strictEqual(
                getOldFormatBuildUrl('ms', 'example', 42),
                'https://ms.visualstudio.com/example/_build/results?buildId=42&view=results');
        });
    });
});
