import * as assert from 'assert';
import { getRepositoryDetailsFromRemoteUrl, isAzureReposUrl } from '../../helpers/azureDevOpsHelper';

suite('Azure DevOps Helpers', () => {
    suite('isAzureReposUrl', () => {
        test('Returns true for dev.azure.com URLs', () => {
            assert.ok(isAzureReposUrl('https://dev.azure.com/organization/project/_git/repo'));
        });

        test('Returns true for visualstudio.com URLs', () => {
            assert.ok(isAzureReposUrl('https://organization.visualstudio.com/project/_git/repo'));
        });

        test('Returns true for SSH dev.azure.com URLs', () => {
            assert.ok(isAzureReposUrl('git@ssh.dev.azure.com:v3/organization/project/repo'));
        });

        test('Returns true for SSH visualstudio.com URLs', () => {
            assert.ok(isAzureReposUrl('organization@vs-ssh.visualstudio.com:v3/organization/project/repo'));
        });

        test('Returns false for other URLs', () => {
            assert.ok(!isAzureReposUrl('https://azure.com/organization/project/_git/repo'));
            assert.ok(!isAzureReposUrl('https://visualstudio.com/project/_git/repo'));
            assert.ok(!isAzureReposUrl('https://github.com/owner/repo.git'));
        });
    });

    suite('getRepositoryDetailsFromRemoteUrl', () => {
        test('Returns correct details for dev.azure.com URLs', () => {
            const details = getRepositoryDetailsFromRemoteUrl('https://dev.azure.com/organization/project/_git/repo');
            assert.strictEqual(details.organizationName, 'organization');
            assert.strictEqual(details.projectName, 'project');
            assert.strictEqual(details.repositoryName, 'repo');
        });

        test('Returns correct details for shorthand dev.azure.com URLs', () => {
            const details = getRepositoryDetailsFromRemoteUrl('https://dev.azure.com/organization/_git/repo');
            assert.strictEqual(details.organizationName, 'organization');
            assert.strictEqual(details.projectName, 'repo');
            assert.strictEqual(details.repositoryName, 'repo');
        });

        test('Returns correct details for visualstudio.com URLs', () => {
            const details = getRepositoryDetailsFromRemoteUrl('https://organization.visualstudio.com/project/_git/repo');
            assert.strictEqual(details.organizationName, 'organization');
            assert.strictEqual(details.projectName, 'project');
            assert.strictEqual(details.repositoryName, 'repo');
        });

        test('Returns correct details for shorthand visualstudio.com URLs', () => {
            const details = getRepositoryDetailsFromRemoteUrl('https://organization.visualstudio.com/_git/repo');
            assert.strictEqual(details.organizationName, 'organization');
            assert.strictEqual(details.projectName, 'repo');
            assert.strictEqual(details.repositoryName, 'repo');
        });

        test('Returns correct details for DefaultCollection visualstudio.com URLs', () => {
            const details = getRepositoryDetailsFromRemoteUrl('https://organization.visualstudio.com/DeFaUlTcOlLeCtIoN/project/_git/repo');
            assert.strictEqual(details.organizationName, 'organization');
            assert.strictEqual(details.projectName, 'project');
            assert.strictEqual(details.repositoryName, 'repo');
        });

        test('Returns correct details for shorthand DefaultCollection visualstudio.com URLs', () => {
            const details = getRepositoryDetailsFromRemoteUrl('https://organization.visualstudio.com/DeFaUlTcOlLeCtIoN/_git/repo');
            assert.strictEqual(details.organizationName, 'organization');
            assert.strictEqual(details.projectName, 'repo');
            assert.strictEqual(details.repositoryName, 'repo');
        });

        test('Returns correct details for SSH dev.azure.com URLs', () => {
            const details = getRepositoryDetailsFromRemoteUrl('git@ssh.dev.azure.com:v3/organization/project/repo');
            assert.strictEqual(details.organizationName, 'organization');
            assert.strictEqual(details.projectName, 'project');
            assert.strictEqual(details.repositoryName, 'repo');
        });

        test('Returns correct details for SSH visualstudio.com URLs', () => {
            const details = getRepositoryDetailsFromRemoteUrl('organization@vs-ssh.visualstudio.com:v3/organization/project/repo');
            assert.strictEqual(details.organizationName, 'organization');
            assert.strictEqual(details.projectName, 'project');
            assert.strictEqual(details.repositoryName, 'repo');
        });

        test('Throws error for invalid URLs', () => {
            assert.throws(() => {
                getRepositoryDetailsFromRemoteUrl('https://invalid.url/organization/project/_git/repo');
            }, "The repo isn't hosted with Azure Repos");

            assert.throws(() => {
                getRepositoryDetailsFromRemoteUrl('https:/dev.azure.com/DefaultCollection/organization/project/_git/repo');
            }, /Failed to determine Azure Repo details/);

            assert.throws(() => {
                getRepositoryDetailsFromRemoteUrl('https://organization.visualstudio.com/invalid');
            }, /Failed to determine Azure Repo details/);
        });
    });
});
