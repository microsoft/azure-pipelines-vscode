import * as vscode from 'vscode';
import * as assert from 'assert';

function getWorkspaceFolder() {
    return vscode.workspace.workspaceFolders?.[0] ?? assert.fail('No workspace folder');
}

suite('Language configuration', () => {
    suite('Filename patterns', () => {
        const trackedUris: vscode.Uri[] = [];

        async function assertFileIsAzurePipelines(...pathComponents: string[]): Promise<void> {
            const uri = vscode.Uri.joinPath(getWorkspaceFolder().uri, ...pathComponents);
            await vscode.workspace.fs.writeFile(uri, new Uint8Array());
            trackedUris.push(uri);

            const doc = await vscode.workspace.openTextDocument(uri);
            assert.strictEqual(doc.languageId, 'azure-pipelines');
        }

        suiteTeardown(async () => {
            await Promise.all(trackedUris.map(uri => vscode.workspace.fs.delete(uri)));
        });

        for (const extension of ['yml', 'yaml']) {
            test(`Detects azure-pipelines.${extension}`, async () => {
                await assertFileIsAzurePipelines(`azure-pipelines.${extension}`);
            });

            test(`Detects .azure-pipelines.${extension}`, async () => {
                await assertFileIsAzurePipelines(`.azure-pipelines.${extension}`);
            });

            test(`Detects azure-pipelines/anything.${extension}`, async () => {
                await assertFileIsAzurePipelines('azure-pipelines', `anything.${extension}`);
            });

            test(`Detects .azure-pipelines/anything.${extension}`, async () => {
                await assertFileIsAzurePipelines('.azure-pipelines', `anything.${extension}`);
            });

            test(`Detects .pipelines/anything.${extension}`, async () => {
                await assertFileIsAzurePipelines('.pipelines', `anything.${extension}`);
            });
        }
    });
});
