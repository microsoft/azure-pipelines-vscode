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

    // TODO: Run this before every test?
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
        assert.equal(emptyDocument.languageId, 'azure-pipelines');
        assert.equal(diagnostics.length, 0);
    });

    test ('Given a valid document, there should be no validation errors', function() {
        // Arrange


        // Act


        // Assert
        
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
        assert.equal(invalidDocument.languageId, 'azure-pipelines');
        assert.deepEqual(diagnostics, [{"severity":"Error","message":"Incorrect type. Expected \"object\".","range":[{"line":0,"character":0},{"line":5,"character":0}]}]);
    });

    test ('Manually selecting file type as Azure Pipelines works', function() {
       
        //languageId
        // before manual activation, language id is text or yaml, after manual activation the id should be azure pipelines

    });

    test ('When manually activating an invalid file there should be validation errors', function() {
        // Arrange


        // Act


        // Assert
        
    });

    test ('When manually activating a valid file there should not be validation errors', function() {
        // Arrange


        // Act


        // Assert
        
    });
});

// This suite performs autocomplete tests that look for what options are available for autocompletion
// depending on where we are in a file, what the contents of that file are, and what the schema is.
suite('Autocomplete Tests', function() {
    // empty file, beginning of file, end of file
    // within a broken file, within a working file(in terms of validation results)

    test ('First Test', function() {
        
    });
})

async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
