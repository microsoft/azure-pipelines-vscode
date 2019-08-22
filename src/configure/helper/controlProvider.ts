import { QuickPickItem, InputBoxOptions } from 'vscode';
import { IAzureQuickPickOptions } from 'vscode-azureextensionui';
import { telemetryHelper } from '../helper/telemetryHelper'
import { extensionVariables } from '../model/models';
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
}