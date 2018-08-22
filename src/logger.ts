/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

// TODO: How can we write this to disk too so that we can remotely debug issues?
export function log(message: string, event?: string){
    let logMessage = `(${new Date().toLocaleString()}) `;

    if (event) {
        logMessage += `[${event}] `;
    }

    logMessage += `${message}`;

    console.log(logMessage);
}
