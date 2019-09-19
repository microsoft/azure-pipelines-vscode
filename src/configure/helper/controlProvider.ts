import { InputBoxOptions, QuickPickItem, window } from 'vscode';
import { IAzureQuickPickOptions, UserCancelledError } from 'vscode-azureextensionui';
import { telemetryHelper } from '../helper/telemetryHelper';
import { extensionVariables } from '../model/models';
import {Messages} from '../resources/messages';
import { TelemetryKeys } from '../resources/telemetryKeys';

export class ControlProvider {
    public async showQuickPick<T extends QuickPickItem>(listName: string, listItems: T[] | Thenable<T[]>, options: IAzureQuickPickOptions, itemCountTelemetryKey?: string): Promise<T> {
        try {
            telemetryHelper.setTelemetry(TelemetryKeys.CurrentUserInput, listName);
            return await extensionVariables.ui.showQuickPick(listItems, options);
        }
        finally {
            if (itemCountTelemetryKey) {
                telemetryHelper.setTelemetry(itemCountTelemetryKey, (await listItems).length.toString());
            }
        }
    }

    public async showInputBox(inputName: string, options: InputBoxOptions): Promise<string> {
        telemetryHelper.setTelemetry(TelemetryKeys.CurrentUserInput, inputName);
        return await extensionVariables.ui.showInputBox(options);
    }

    public async showInformationBox(informationIdentifier: string, informationMessage: string, ...actions: string[]): Promise<string> {
        telemetryHelper.setTelemetry(TelemetryKeys.CurrentUserInput, informationIdentifier);
        if (!!actions && actions.length > 0) {
            let result = await window.showInformationMessage(informationMessage, ...actions);
            if (!result) {
                throw new UserCancelledError(Messages.userCancelledExcecption);
            }

            return result;
        }
        else {
            return await window.showInformationMessage(informationMessage, ...actions);
        }

    }
}
