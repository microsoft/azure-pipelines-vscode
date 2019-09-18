import { IActionContext, ITelemetryReporter, parseError } from "vscode-azureextensionui";

import { extensionVariables } from "../model/models";
import { TelemetryKeys } from '../resources/telemetryKeys';
import * as logger from '../../logger';

const uuid = require('uuid/v4');

class TelemetryHelper {
    private actionContext: IActionContext;
    private telemetryReporter: ITelemetryReporter;
    private journeyId: string;
    private command: string;

    public initialize(actionContext: IActionContext, command: string): void {
        this.actionContext = actionContext;
        this.telemetryReporter = extensionVariables.reporter;
        this.journeyId = uuid();
        this.command = command;
        this.setTelemetry(TelemetryKeys.JourneyId, this.journeyId);
    }

    public getJourneyId(): string {
        return this.journeyId;
    }

    public setTelemetry(key: string, value: string): void {
        if (key) {
            this.actionContext.telemetry.properties[key] = value;
        }
    }

    public setResult(result: Result, error?: Error): void {
        this.actionContext.telemetry.properties.result = result;
        if (error) {
            let parsedError = parseError(error);
            this.actionContext.telemetry.properties.error = JSON.stringify(parsedError);
            this.actionContext.telemetry.properties.errorMessage = parsedError.message;
        }
    }

    public setCurrentStep(stepName: string): void {
        this.actionContext.telemetry.properties.cancelStep = stepName;
    }

    public logError(layer: string, tracePoint: string, error: Error): void {
        let parsedError = parseError(error);
        this.telemetryReporter.sendTelemetryEvent(
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
        this.telemetryReporter.sendTelemetryEvent(
            tracePoint,
            {
                'journeyId': this.journeyId,
                'command': this.command,
                'layer': layer,
                'info': info
            });
    }

    public async executeFunctionWithTimeTelemetry<T>(callback: () => T, telemetryKey: string): Promise<T> {
        let startTime = Date.now();
        try {
            return await callback();
        }
        finally {
            this.setTelemetry(telemetryKey, ((Date.now() - startTime) / 1000).toString());
        }
    }
}
export let telemetryHelper = new TelemetryHelper();

export enum Result {
    'Succeeded' = 'Succeeded',
    'Failed' = 'Failed',
    'Canceled' = 'Canceled'
}
