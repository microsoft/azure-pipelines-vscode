import * as vscode from 'vscode';
import * as assert from 'assert';
import { getDocUri, activate } from '../helper';

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
suite('Autocomplete Tests', () => {
    // empty file, beginning of file, end of file, middle of file
    // within a broken file, within a working file(in terms of validation results)

    test('When I use intellisense on a task then I am shown task names', async () => {
        // Arrange
        const docUri = getDocUri('autocomplete.yml');

        // Act
        const completionsList = await getCompletions(docUri, new vscode.Position(15, 12));

        // Assert

        // We expect a lot of tasks
        assert.ok(completionsList.items.length >= 100);

        // All of them should be task names
        assert.ok(completionsList.items.every(item => (item.label as string).match(/^[\w-]+@\d+$/)));
    });
});

async function getCompletions(
    docUri: vscode.Uri,
    position: vscode.Position,
    triggerCharacter?: string,
): Promise<vscode.CompletionList> {
    await activate(docUri);

    // Executing the command `vscode.executeCompletionItemProvider` to simulate triggering completion
    // NOTE: This returns *all* completions without filtering, unlike editor.action.triggerSuggest
    return await vscode.commands.executeCommand(
        'vscode.executeCompletionItemProvider',
        docUri,
        position,
        triggerCharacter
    );
}
