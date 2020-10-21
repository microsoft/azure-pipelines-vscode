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
        const parsedError = parseError(error);
        TelemetryHelper.reporter.sendTelemetryEvent(
            tracePoint,
            {
                'journeyId': this.journeyId,
                'command': this.command,
                'layer': layer,
                'error': JSON.stringify(parsedError)
            });

        logger.log(JSON.stringify(parsedError));
    }

    public logInfo(layer: string, tracePoint: string, info: string): void {
        TelemetryHelper.reporter.sendTelemetryEvent(
            tracePoint,
            {
                'journeyId': this.journeyId,
                'command': this.command,
                'layer': layer,
                'info': info
            });
    }

    // https://github.com/microsoft/vscode-azuretools/blob/5999c2ad4423e86f22d2c648027242d8816a50e4/ui/src/callWithTelemetryAndErrorHandling.ts
    public async callWithTelemetryAndErrorHandling<T>(callback: (properties: TelemetryProperties) => Promise<T>, durationKey: string = 'duration'): Promise<T | void> {
        const startTime = Date.now();
        try {
            return callback(this.properties);
        } catch (error) {
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
        } finally {
            this.setTelemetry(durationKey, ((Date.now() - startTime) / 1000).toString());
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
}

export const telemetryHelper = new TelemetryHelper();

enum Result {
    'Succeeded' = 'Succeeded',
    'Failed' = 'Failed',
    'Canceled' = 'Canceled'
}
