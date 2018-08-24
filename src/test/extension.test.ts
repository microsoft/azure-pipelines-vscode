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

suite('Validation Tests', function() {
    test ('Given an empty document, there should be no validation errors', async () => {
        // load an empty document
        // mark it as an azure pipelines file
        // check for validation errors, shouldn't be any




        //const extension = await vscode.extensions.getExtension(extensionId);





         // TODO: What is the workspace that is loaded when the extension runs? Should we create one?

        const emptyFile: vscode.Uri = await vscode.workspace.findFiles('emptyfile.yml')[0];
        const emptyDocument: vscode.TextDocument = await vscode.workspace.openTextDocument(emptyFile);
        //const visibleDocument: vscode.TextEditor = await vscode.window.showTextDocument(emptyDocument); // KEEP THIS

        // TODO: This should be azure pipelines.
        console.log(emptyDocument.languageId);

        // Check the type of the current text document
        const diagnostics: vscode.Diagnostic[] = vscode.languages.getDiagnostics(emptyFile);
        console.log(JSON.stringify(diagnostics));

        // Check the type of the current text document
            


        // Check validation errors for current document, check the name of what is set by the server?
        //visibleDocument.selection


        // The file should already be identified as an azure pipelines file, can we validate that?


        // Now make sure there are no validation errors



        // Arrange


        // Act


        // Assert

    });

    test ('Given a valid document, there should be no validation errors', function() {
        // Arrange


        // Act


        // Assert
        
    });

    test ('Given an invalid document, there should be validation errors', function() {
        // Arrange


        // Act


        // Assert
        
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
