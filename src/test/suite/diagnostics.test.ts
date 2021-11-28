/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License.
*--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as vscode from 'vscode';
import { getDocUri, activate } from '../helper';

// This suite performs validation tests that look at validating yaml files.
// The tests are looking at if there are any file diagnostics, and if there are, what are they.
//
// These tests need to ensure diagnostics are propagated to the ui, we do not need to test
// every type and permutation of diagnostics, that should be handled in unit tests.

// Helpers
// 1. Workspace configuration settings are not as expected
//    console.log('workspace configuration: ' + JSON.stringify(vscode.workspace.getConfiguration()));
// 2.

suite('Diagnostics Tests', () => {
    test('Given an empty document, there should be no diagnostics', async () => {
        // Arrange
        const emptyFile = getDocUri('emptyfile.yml');

        // Act
        const diagnostics = await getDiagnostics(emptyFile);

        // Assert
        assert.strictEqual(diagnostics.length, 0);
    });

    test('Given a valid document, there should be no diagnostics', async () => {
        // Arrange
        const validFile = getDocUri('validfile.yml');

        // Act
        const diagnostics = await getDiagnostics(validFile);

        // Assert
        assert.strictEqual(diagnostics.length, 0);
    });

    test('Given an invalid document, there should be diagnostics', async () => {
        // Arrange
        const invalidFile = getDocUri('invalidfile.yml');

        // Act
        const diagnostics = await getDiagnostics(invalidFile);

        // Assert
        assert.strictEqual(diagnostics.length, 1);
        assert.strictEqual(diagnostics[0].message, 'Incorrect type. Expected "object".');
        assert.strictEqual(diagnostics[0].severity, vscode.DiagnosticSeverity.Warning);
        assert.deepStrictEqual(diagnostics[0].range, toRange(0, 0, 5, 0));
    });

    test('Manually selecting file type as Azure Pipelines works', async () => {
        // TODO: Write this test. I have not been able to find a way to manually set the file type through the vscode api.

    });

    test('When manually activating an invalid file there should be diagnostics', async () => {
        // TODO: Write this test. I have not been able to find a way to manually set the file type through the vscode api.

    });

    test('When manually activating a valid file there should not be diagnostics', async () => {
        // TODO: Write this test. I have not been able to find a way to manually set the file type through the vscode api.

    });
});

async function getDiagnostics(docUri: vscode.Uri): Promise<vscode.Diagnostic[]> {
    await activate(docUri);

    return vscode.languages.getDiagnostics(docUri);
}

function toRange(sLine: number, sChar: number, eLine: number, eChar: number) {
    const start = new vscode.Position(sLine, sChar);
    const end = new vscode.Position(eLine, eChar);
    return new vscode.Range(start, end);
}
