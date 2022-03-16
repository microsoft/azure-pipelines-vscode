import * as vscode from 'vscode';

import { configurePipeline } from './configure';
import { telemetryHelper } from '../helpers/telemetryHelper';

export async function activateConfigurePipeline(): Promise<void> {
    vscode.commands.registerCommand('azure-pipelines.configure-pipeline', async () => {
        telemetryHelper.initialize('configure-pipeline');
        await telemetryHelper.callWithTelemetryAndErrorHandling(async () => {
            await configurePipeline();
        });
    });
}
