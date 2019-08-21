import { QuickPickItem, InputBoxOptions } from 'vscode';
import { IAzureQuickPickOptions } from 'vscode-azureextensionui';
import { extensionVariables } from '../model/models';
import { TelemetryHelper } from './telemetryHelper';
import { TelemetryKeys } from '../resources/telemetryKeys';

export class ControlProvider {
    private telemetryHelper: TelemetryHelper;

    public constructor(telemetryHelper) {
        this.telemetryHelper = telemetryHelper;
    }

    public async showQuickPick<T extends QuickPickItem>(listItems: T[] | Thenable<T[]>, options: IAzureQuickPickOptions, itemCountTelemetryKey?: string): Promise<T> {
        try {
            this.telemetryHelper.setTelemetry(TelemetryKeys.CurrentUserInput, options.placeHolder);
            return await extensionVariables.ui.showQuickPick(listItems, options);
        }
        finally {
            if (itemCountTelemetryKey) {
                this.telemetryHelper.setTelemetry(itemCountTelemetryKey, (await listItems).length.toString());
            }
        }
    }

    public async showInputBox(options: InputBoxOptions): Promise<string> {
        this.telemetryHelper.setTelemetry(TelemetryKeys.CurrentUserInput, options.placeHolder);
        return await extensionVariables.ui.showInputBox(options);
    }
}