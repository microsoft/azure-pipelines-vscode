import { extensionVariables } from "./configure/model/models";

/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License.
*--------------------------------------------------------------------------------------------*/

// TODO: How can we write this to disk too so that we can remotely debug issues?
// TODO: Set env var or something to turn logging on/off?

export function log(message: string, event?: string){
    let logMessage = `(${new Date().toLocaleString()}) `;

    if (event) {
        logMessage += `[${event}] `;
    }

    logMessage += `${message}`;
    extensionVariables.outputChannel.appendLine(logMessage);
}
