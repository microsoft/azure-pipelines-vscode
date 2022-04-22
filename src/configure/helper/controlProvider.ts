import { InputBoxOptions, QuickPickItem, QuickPickOptions, window } from 'vscode';
import { telemetryHelper } from '../../helpers/telemetryHelper';
import { TelemetryKeys } from '../../helpers/telemetryKeys';
import { UserCancelledError } from './userCancelledError';

export async function showQuickPick<T extends QuickPickItem>(listName: string, listItems: T[] | Thenable<T[]>, options: QuickPickOptions, itemCountTelemetryKey?: string): Promise<T> {
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

export async function showInputBox(inputName: string, options: InputBoxOptions): Promise<string> {
    telemetryHelper.setTelemetry(TelemetryKeys.CurrentUserInput, inputName);
    return window.showInputBox({
        ignoreFocusOut: true,
        ...options
    });
}

export async function showInformationBox(informationIdentifier: string, informationMessage: string, ...actions: string[]): Promise<string> {
    telemetryHelper.setTelemetry(TelemetryKeys.CurrentUserInput, informationIdentifier);
    if (!!actions && actions.length > 0) {
        let result = await window.showInformationMessage(informationMessage, ...actions);
        if (!result) {
            throw new UserCancelledError();
        }

        return result;
    }
    else {
        return window.showInformationMessage(informationMessage, ...actions);
    }

}
