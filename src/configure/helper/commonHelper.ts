import * as vscode from 'vscode';
import { URI } from 'vscode-uri';
import * as util from 'util';
import { Messages } from '../../messages';
import * as logger from '../../logger';

export async function sleepForMilliSeconds(timeInMs: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, timeInMs);
    });
}

export function generateRandomPassword(length: number = 20): string {
    var characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#%^*()-+";
    var charTypeSize = new Array(26, 26, 10, 10);
    var charTypeStartIndex = new Array(0, 26, 52, 62);
    var password = "";
    for (var x = 0; x < length; x++) {
        var i = Math.floor(Math.random() * charTypeSize[x % 4]);
        password += characters.charAt(i + charTypeStartIndex[x % 4]);
    }
    return password;
}

export async function executeFunctionWithRetry<T>(
    func: () => Promise<T>,
    retryCount: number = 20,
    retryIntervalTimeInSec: number = 2,
    errorMessage?: string): Promise<T> {
        let internalError = null;
        for (; retryCount > 0; retryCount--) {
            try {
                return func();
            } catch (error) {
                internalError = error;
                logger.log(JSON.stringify(error));
                await sleepForMilliSeconds(retryIntervalTimeInSec * 1000);
            }
        }

        throw errorMessage ? errorMessage.concat(util.format(Messages.retryFailedMessage, retryCount, JSON.stringify(internalError))): util.format  (Messages.retryFailedMessage, retryCount, JSON.stringify(internalError));
}

export async function getAvailableFileName(fileName: string, repoPath: URI): Promise<string> {
    const files = (await vscode.workspace.fs.readDirectory(repoPath)).map(entries => entries[0]);
    if (!files.includes(fileName)) {
        return fileName;
    }

    for (let i = 1; i < 100; i++) {
        const incrementalFileName = getIncrementalFileName(fileName, i);
        if (!files.includes(incrementalFileName)) {
            return incrementalFileName;
        }
    }

    throw new Error(Messages.noAvailableFileNames);
}

function getIncrementalFileName(fileName: string, count: number): string {
    const periodIndex = fileName.indexOf('.');
    return fileName.substring(0, periodIndex).concat(` (${count})`, fileName.substring(periodIndex));
}
