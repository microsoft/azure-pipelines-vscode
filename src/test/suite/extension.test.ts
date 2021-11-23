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

// Workspace state is sticky (yuck),
// so make sure we clear the open editors after every test
teardown(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
});

suite ('Extension Setup Tests', function() {
    this.timeout(20000);

    test("Extension is active", async () => {
        // Arrange
        const files = await vscode.workspace.findFiles('validfile.yml');

        // Act
        await vscode.window.showTextDocument(files[0]);
        await sleep(3000);
        const activated = vscode.extensions.getExtension(extensionId).isActive;

        // Assert
        assert.strictEqual(activated, true);
    });
});

// Helpers
// 1. Workspace configuration settings are not as expected
//    console.log('workspace configuration: ' + JSON.stringify(vscode.workspace.getConfiguration()));
// 2.

suite('Validation Tests', function() {
    this.timeout(20000);

    test ('Given an empty document, there should be no validation errors', async () => {
        // Arrange
        const emptyFiles: vscode.Uri[] = await vscode.workspace.findFiles('emptyfile.yml');
        const emptyFile: vscode.Uri = emptyFiles[0];

        // Act
        const emptyDocument: vscode.TextDocument = await vscode.workspace.openTextDocument(emptyFile);
        await vscode.window.showTextDocument(emptyDocument);
        await sleep(3000); // Give it time to show the validation errors, if any
        const diagnostics: vscode.Diagnostic[] = vscode.languages.getDiagnostics(emptyFile);

        // Assert
        assert.strictEqual(emptyDocument.languageId, 'azure-pipelines');
        assert.strictEqual(diagnostics.length, 0);
    });

    test ('Given a valid document, there should be no validation errors', async () => {
        // Arrange
        const emptyFiles: vscode.Uri[] = await vscode.workspace.findFiles('validfile.yml');
        const emptyFile: vscode.Uri = emptyFiles[0];

        // Act
        const emptyDocument: vscode.TextDocument = await vscode.workspace.openTextDocument(emptyFile);
        await vscode.window.showTextDocument(emptyDocument);
        await sleep(3000); // Give it time to show the validation errors, if any
        const diagnostics: vscode.Diagnostic[] = vscode.languages.getDiagnostics(emptyFile);

        // Assert
        assert.strictEqual(emptyDocument.languageId, 'azure-pipelines');
        assert.strictEqual(diagnostics.length, 0);
    });

    test ('Given an invalid document, there should be validation errors', async function() {
        // Arrange
        const invalidfiles: vscode.Uri[] = await vscode.workspace.findFiles('invalidfile.yml');
        const invalidfile: vscode.Uri = invalidfiles[0];

        // Act
        const invalidDocument: vscode.TextDocument = await vscode.workspace.openTextDocument(invalidfile);
        await vscode.window.showTextDocument(invalidDocument);
        await sleep(3000); // Give it time to show the validation errors, if any
        const diagnostics: vscode.Diagnostic[] = vscode.languages.getDiagnostics(invalidfile);

        // Assert
        assert.strictEqual(invalidDocument.languageId, 'azure-pipelines');
        assert.strictEqual(diagnostics.length, 1);
        assert.strictEqual(diagnostics[0].range.start.line, 0);
        assert.strictEqual(diagnostics[0].range.start.character, 0);
        assert.strictEqual(diagnostics[0].range.end.line, 5);
        assert.strictEqual(diagnostics[0].range.end.character, 0);

        //assert.deepEqual(diagnostics, [{"severity":"Error","message":"Incorrect type. Expected \"object\".","range":[{"line":0,"character":0},{"line":5,"character":0}]}]);
    });

    test ('Manually selecting file type as Azure Pipelines works', function() {
        // TODO: Write this test. I have not been able to find a way to manually set the file type through the vscode api.

    });

    test ('When manually activating an invalid file there should be validation errors', async () => {
        // TODO: Write this test. I have not been able to find a way to manually set the file type through the vscode api.

    });

    test ('When manually activating a valid file there should not be validation errors', function() {
        // TODO: Write this test. I have not been able to find a way to manually set the file type through the vscode api.

    });
});

// This suite performs autocomplete tests that look for what options are available for autocompletion
// depending on where we are in a file, what the contents of that file are, and what the schema is.
//
// https://github.com/Microsoft/vscode/issues/23814
// ALso useful:
// https://github.com/Microsoft/vscode/issues/111
// https://github.com/ipatalas/ngComponentUtility/blob/master/test/providers/componentCompletionProvider.test.ts
//
// TODO: Do we need to create a proper completion item provider? How does the language server tie in right now?
// It may be impossible to check the completion items in the UI and we might have to check them in the server.
// Or we can take the first suggestion and make sure it works... then we know the options are in the list.
// Then for the specific recommendations we test that in the completion provider.
//
suite('Autocomplete Tests', function() {
    this.timeout(30000);
    // empty file, beginning of file, end of file, middle of file
    // within a broken file, within a working file(in terms of validation results)

    test ('When I use intellisense then the correct options are shown for task names', async () => {
        // Arrange
        const emptyFiles: vscode.Uri[] = await vscode.workspace.findFiles('autocomplete.yml');
        const emptyFile: vscode.Uri = emptyFiles[0];

        // Act
        const autoCompleteDoc: vscode.TextDocument = await vscode.workspace.openTextDocument(emptyFile);
        const editor: vscode.TextEditor = await vscode.window.showTextDocument(autoCompleteDoc);
        await sleep(3000); // Give it time to show the validation errors, if any

        await setCursorPosition(editor, 15, 12);
        await triggerIntellisense();
        await acceptSuggestion();

        // Assert
        const diagnostics: vscode.Diagnostic[] = vscode.languages.getDiagnostics(emptyFile);
        const documentTextArr: string[] = autoCompleteDoc.getText().split('\n');

        assert.strictEqual(autoCompleteDoc.languageId, 'azure-pipelines');
        assert.strictEqual(diagnostics.filter(diagnostic =>
            diagnostic.severity !== vscode.DiagnosticSeverity.Hint).length, 0);
        assert.strictEqual(documentTextArr[15], '- task: npmAuthenticate@0');
    });
})

// Set the zero-indexed cursor position for the editor.
// To figure out the coordinates open the target document and look in the bottom right,
// then subtract one to each.
async function setCursorPosition(editor: vscode.TextEditor, line: number, column: number) {
    editor.selection = new vscode.Selection(line, column, line, column);
    await sleep(500);
}

// Trigger intellisense in the UI.
// Make sure you already set the desired cursor position.
async function triggerIntellisense() {
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
    await sleep(500);
}

// After you have called triggerIntellisense you can use this to accept the suggestion from intellisense.
async function acceptSuggestion() {
    await vscode.commands.executeCommand('acceptSelectedSuggestion');
    await sleep(500);
}

async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
