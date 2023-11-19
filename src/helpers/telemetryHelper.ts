import * as vscode from 'vscode';
import TelemetryReporter from '@vscode/extension-telemetry';

import * as TelemetryKeys from './telemetryKeys';
import * as logger from '../logger';
import { parseError } from './parseError';

import { v4 as uuid } from 'uuid';

const extensionName = 'ms-azure-devops.azure-pipelines';
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
const packageJSON = vscode.extensions.getExtension(extensionName)?.packageJSON; // Guaranteed to exist
const extensionVersion: string = packageJSON.version;
const aiKey: string = packageJSON.aiKey;
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

interface TelemetryProperties {
    [key: string]: string;
}

enum Result {
    Succeeded = 'Succeeded',
    Failed = 'Failed',
    Canceled = 'Canceled'
}


class TelemetryHelper {
    private journeyId: string = uuid();

    private properties: TelemetryProperties = {
        [TelemetryKeys.JourneyId]: this.journeyId,
        [TelemetryKeys.Result]: Result.Succeeded,
    };

    private static reporter = new TelemetryReporter(extensionName, extensionVersion, aiKey);

    public dispose() {
        void TelemetryHelper.reporter.dispose();
    }

    public getJourneyId(): string {
        return this.journeyId;
    }

    public setTelemetry(key: string, value: string): void {
        this.properties[key] = value;
    }

    public setCurrentStep(stepName: string): void {
        this.properties.cancelStep = stepName;
    }

    // Log an error.
    // No custom properties are logged alongside the error.
    // FIXME: This should really be sendTelemetryException but I'm maintaining
    // backwards-compatibility with how it used to be sent, especially because
    // I don't have access to the Application Insights logs :D (winstonliu).
    public logError(layer: string, tracePoint: string, error: Error): void {
        TelemetryHelper.reporter.sendTelemetryErrorEvent(
            tracePoint, {
                [TelemetryKeys.JourneyId]: this.journeyId,
                layer,
                errorMessage: error.message,
                stack: error.stack ?? '',
            }, undefined, ['errorMesage', 'stack']);
    }

    // Executes the given function, timing how long it takes.
    // This *does NOT* send any telemetry and must be called within the context
    // of an ongoing `callWithTelemetryAndErrorHandling` session to do anything useful.
    // Helpful for reporting fine-grained timing of individual functions.
    // TODO: Rename to something with less potential for confusion, like 'time' or 'timeFunction'?
    public async executeFunctionWithTimeTelemetry<T>(callback: () => Promise<T>, telemetryKey: string): Promise<T> {
        const startTime = Date.now();
        try {
            return await callback();
        }
        finally {
            this.setTelemetry(telemetryKey, ((Date.now() - startTime) / 1000).toString());
        }
    }

    // Wraps the given function in a telemetry event.
    // The telemetry event sent ater function execution will contain how long the function took as well as any custom properties
    // supplied through initialize() or setTelemetry().
    // If the function errors, the telemetry event will additionally contain metadata about the error that occurred.
    // https://github.com/microsoft/vscode-azuretools/blob/5999c2ad4423e86f22d2c648027242d8816a50e4/ui/src/callWithTelemetryAndErrorHandling.ts
    public async callWithTelemetryAndErrorHandling<T>(command: string, callback: () => Promise<T>): Promise<T | undefined> {
        try {
            return await this.executeFunctionWithTimeTelemetry(callback, 'duration');
        } catch (error) {
            const parsedError = parseError(error);
            if (parsedError.isUserCancelledError) {
                this.setTelemetry(TelemetryKeys.Result, Result.Canceled);
            } else {
                this.setTelemetry(TelemetryKeys.Result, Result.Failed);
                this.setTelemetry('error', parsedError.errorType);
                this.setTelemetry('errorMessage', parsedError.message);
                this.setTelemetry('stack', parsedError.stack ?? '');

                logger.log(parsedError.message);
                if (parsedError.message.includes('\n')) {
                    void vscode.window.showErrorMessage('An error has occurred. Check the output window for more details.');
                } else {
                    void vscode.window.showErrorMessage(parsedError.message);
                }
            }
        } finally {
            if (this.properties.result === Result.Failed.toString()) {
                TelemetryHelper.reporter.sendTelemetryErrorEvent(
                    command, {
                        ...this.properties,
                        [TelemetryKeys.JourneyId]: this.journeyId,
                    }, undefined, ['error', 'errorMesage', 'stack']);
            } else {
                TelemetryHelper.reporter.sendTelemetryEvent(
                    command, {
                        ...this.properties,
                        [TelemetryKeys.JourneyId]: this.journeyId,
                    });
            }
        }

        return undefined;
    }
}

export const telemetryHelper = new TelemetryHelper();
