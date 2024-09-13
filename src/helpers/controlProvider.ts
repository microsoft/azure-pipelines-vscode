import { InputBoxOptions, QuickPickItem, QuickPickOptions, window } from 'vscode';
import { telemetryHelper } from './telemetryHelper';
import * as TelemetryKeys from './telemetryKeys';

export async function showQuickPick<T extends QuickPickItem>(listName: string, listItems: T[] | Thenable<T[]>, options: QuickPickOptions, itemCountTelemetryKey?: string): Promise<T | undefined> {
    try {
        telemetryHelper.setTelemetry(TelemetryKeys.CurrentUserInput, listName);
        return window.showQuickPick(listItems, {
            ignoreFocusOut: true,
            ...options
        });
    }
    finally {
        if (itemCountTelemetryKey) {
            telemetryHelper.setTelemetry(itemCountTelemetryKey, (await listItems).length.toString());
        }
    }
}

export async function showInputBox(inputName: string, options: InputBoxOptions): Promise<string | undefined> {
    telemetryHelper.setTelemetry(TelemetryKeys.CurrentUserInput, inputName);
    return window.showInputBox({
        ignoreFocusOut: true,
        ...options
    });
}
