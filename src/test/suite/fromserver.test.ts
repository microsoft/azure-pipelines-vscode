/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License.
*--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as vscode from 'vscode';

// This suite performs validation tests that look at validating yaml files.
// The tests are looking at if there are any file validation errors, and if there are, what are they.
// 
// These tests need to ensure validation errors are propagated to the ui, we do not need to test
// every type and permutation of validation errors, that should be handled in unit tests.
const extensionId = 'ms-azure-devops.azure-pipelines';

suite ('Extension Setup Tests', function() {
    this.timeout(20000);

    test("Extension is active", async () => {
        // Arrange and Act
        await sleep(2000);
        const started = vscode.extensions.getExtension(extensionId).isActive;

        // Assert
        assert.equal(started, true);
    });
});

// Helpers
// 1. Workspace configuration settings are not as expected
//    console.log('workspace configuration: ' + JSON.stringify(vscode.workspace.getConfiguration()));
// 2. 

suite('Validation Tests From Server', async function() {
    this.timeout(1000000);

    test ('Validate all files from server', async function () {
        const validFiles: vscode.Uri[] = await vscode.workspace.findFiles('**/extracted/*.yml');
        //const validFiles: vscode.Uri[] = await vscode.workspace.findFiles('extracted/JobCancelTimeoutInMinutes_FromImpliedJob_LegacyQueue.0.yml');

        const promises = validFiles.map(async function(testFile) {
            await testFileIsValid(testFile);
        });
        await Promise.all(promises);
    });
});

async function testFileIsValid(file: vscode.Uri) {
    // Arrange and Act
    const emptyDocument: vscode.TextDocument = await vscode.workspace.openTextDocument(file);
    await vscode.window.showTextDocument(emptyDocument);
    await sleep(1000); // Give it time to show the validation errors, if any
    const diagnostics: vscode.Diagnostic[] = vscode.languages.getDiagnostics(file);

    // Assert
    assert.equal(emptyDocument.languageId, 'azure-pipelines');
    assert.equal(diagnostics.length, 0, 'File: ' + file.path + ' Error: ' +  JSON.stringify(diagnostics));
}

async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
