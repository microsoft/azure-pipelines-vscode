import * as vscode from 'vscode';
import TelemetryReporter from 'vscode-extension-telemetry';

import { TelemetryKeys } from '../resources/telemetryKeys';
import * as logger from '../../logger';
import { parseError } from './parseError';
import { Messages } from '../resources/messages';

const uuid = require('uuid/v4');

const extensionName = 'ms-azure-devops.azure-pipelines';
const packageJSON = vscode.extensions.getExtension(extensionName).packageJSON;
const extensionVersion = packageJSON.version;
const aiKey = packageJSON.aiKey;

interface TelemetryProperties {
    [key: string]: string;
}

interface TelemetryOptions {
    suppressIfSuccessful: boolean;
}

class TelemetryHelper {
    private journeyId: string;
    private command: string;
    private properties: TelemetryProperties;
    private options: TelemetryOptions;

    private static reporter = new TelemetryReporter(extensionName, extensionVersion, aiKey);

    public initialize(command: string, properties: TelemetryProperties = {}) {
        this.journeyId = uuid();
        this.command = command;
        this.properties = properties;
        this.options = {
            suppressIfSuccessful: false,
        };
        this.setTelemetry(TelemetryKeys.JourneyId, this.journeyId);
        this.setTelemetry(TelemetryKeys.Result, Result.Succeeded);
    }

    public getJourneyId(): string {
        return this.journeyId;
    }

    public setOptions(options: Partial<TelemetryOptions>): void {
        this.options = {
            ...this.options,
            ...options,
        };
    }

    public setTelemetry(key: string, value: string): void {
        this.properties[key] = value;
    }

    public setCurrentStep(stepName: string): void {
        this.properties.cancelStep = stepName;
    }

    public logError(layer: string, tracePoint: string, error: Error): void {
        this.handleError(error);
        TelemetryHelper.reporter.sendTelemetryEvent(
            tracePoint,
            {
                ...this.properties,
                'journeyId': this.journeyId,
                'command': this.command,
                'layer': layer
            });
    }

    public logInfo(layer: string, tracePoint: string, info: string): void {
        TelemetryHelper.reporter.sendTelemetryEvent(
            tracePoint,
            {
                ...this.properties,
                'journeyId': this.journeyId,
                'command': this.command,
                'layer': layer,
                'info': info
            });
    }

    // Executes the given function, timing how long it takes.
    // This *does NOT* send any telemetry and must be called within the context
    // of an ongoing `callWithTelemetryAndErrorHandling` session to do anything useful.
    // Helpful for reporting fine-grained timing of individual functions.
    // TODO: Rename to something with less potential for confusion, like 'time' or 'timeFunction'?
    public async executeFunctionWithTimeTelemetry<T>(callback: () => Promise<T>, telemetryKey: string): Promise<T> {
        const startTime = Date.now();
        try {
            return callback();
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
    public async callWithTelemetryAndErrorHandling<T>(callback: () => Promise<T>): Promise<T | void> {
        try {
            return this.executeFunctionWithTimeTelemetry(callback, 'duration');
        } catch (error) {
            this.handleError(error);
        } finally {
            if (!(this.options.suppressIfSuccessful && this.properties.result === Result.Succeeded)) {
                TelemetryHelper.reporter.sendTelemetryEvent(
                    this.command,
                    {
                        ...this.properties,
                        journeyId: this.journeyId,
                    }
                )
            }
        }
    }

    private handleError(error: any): void {
        const parsedError = parseError(error);
        if (parsedError.isUserCancelledError) {
            this.setTelemetry(TelemetryKeys.Result, Result.Canceled);
        } else {
            this.setTelemetry(TelemetryKeys.Result, Result.Failed);
            this.setTelemetry('error', parsedError.errorType);
            this.setTelemetry('errorMessage', parsedError.message);
            this.setTelemetry('stack', parsedError.stack ?? '');
            if (this.options.suppressIfSuccessful) {
                this.setTelemetry('suppressTelemetry', 'true');
            }

            logger.log(parsedError.message);
            vscode.window.showErrorMessage(Messages.errorOccurred);
        }
    }
}

export const telemetryHelper = new TelemetryHelper();

enum Result {
    'Succeeded' = 'Succeeded',
    'Failed' = 'Failed',
    'Canceled' = 'Canceled'
}
