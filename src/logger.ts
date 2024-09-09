/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License.
*--------------------------------------------------------------------------------------------*/

import { window } from "vscode";

// TODO: How can we write this to disk too so that we can remotely debug issues?
// TODO: Set env var or something to turn logging on/off?

const outputChannel = window.createOutputChannel('Azure Pipelines');
export function log(message: string, event?: string): void {
    let logMessage = `(${new Date().toLocaleString()}) `;

    if (event) {
        logMessage += `[${event}] `;
    }

    logMessage += message;
    outputChannel.appendLine(logMessage);
}
