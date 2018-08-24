//import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
// import * as vscode from 'vscode';
// import * as myExtension from '../extension';

// TODO: When running npm run test we just want integration tests, not unit tests. Move them to separate folders and
// configure each command to only look in those folders.

// This suite performs validation tests that look at validating yaml files.
// The tests are looking at if there are any file validation errors, and if there are, what are they.
// 
// These tests need to ensure validation errors are propagated to the ui, we do not need to test
// every type and permutation of validation errors, that should be handled in unit tests.
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
