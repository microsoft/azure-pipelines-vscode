import * as vscode from 'vscode';

import { configurePipeline } from './configure';
import { telemetryHelper } from '../helpers/telemetryHelper';

export async function activateConfigurePipeline(): Promise<void> {
    vscode.commands.registerCommand('azure-pipelines.configure-pipeline', async () => {
        await telemetryHelper.callWithTelemetryAndErrorHandling('azurePipelines.configure-pipeline', async () => {
            await configurePipeline();
        });
    });
}
