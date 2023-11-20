import * as vscode from 'vscode';

import { configurePipeline } from './configure';
import { telemetryHelper } from '../helpers/telemetryHelper';

export function activateConfigurePipeline(): void {
    vscode.commands.registerCommand('azure-pipelines.configure-pipeline', async () => {
        await telemetryHelper.callWithTelemetryAndErrorHandling('azurePipelines.configure-pipeline', async () => {
            await configurePipeline();
        });
    });
}
