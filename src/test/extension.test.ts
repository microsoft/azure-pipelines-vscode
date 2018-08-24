import * as assert from 'assert';
import * as vscode from 'vscode';
// import * as myExtension from '../extension';

// This suite performs validation tests that look at validating yaml files.
// The tests are looking at if there are any file validation errors, and if there are, what are they.
// 
// These tests need to ensure validation errors are propagated to the ui, we do not need to test
// every type and permutation of validation errors, that should be handled in unit tests.
suite ('Extension Setup Tests', function() {
    this.timeout(20000);

    // TODO: Run this before every test?
    test("Extension is active", async () => {
        await sleep(2000);

        // Arrange and Act
        const started = vscode.extensions.getExtension("ms-azure-devops.azure-pipelines").isActive;
        console.log('pipelines extension started: ' + started);

        // TODO: It's not active because we haven't chosen a file to activate it?

        // Assert
        assert.equal(started, true);
    });
});

async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

suite('Validation Tests', function() {
    test ('Given an empty document, there should be no validation errors', function() {
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
});

// This suite performs autocomplete tests that look for what options are available for autocompletion
// depending on where we are in a file, what the contents of that file are, and what the schema is.
suite('Autocomplete Tests', function() {
    // empty file, beginning of file, end of file
    // within a broken file, within a working file(in terms of validation results)

    test ('First Test', function() {
        
    });
})
