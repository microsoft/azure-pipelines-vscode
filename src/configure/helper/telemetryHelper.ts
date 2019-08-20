import { IActionContext, ITelemetryReporter } from "vscode-azureextensionui";

import { extensionVariables } from "../model/models";
import { TelemetryKeys } from '../resources/telemetryKeys';
import * as logger from '../../logger';

const uuid = require('uuid/v4');

export class TelemetryHelper {
    private actionContext: IActionContext;
    private telemetryReporter: ITelemetryReporter;
    private journeyId: string;
    private command: string;
    constructor(actionContext: IActionContext, command: string) {
        this.actionContext = actionContext;
        this.telemetryReporter = extensionVariables.reporter;
        this.journeyId = uuid();
        this.command = command;
        this.setTelemetry(TelemetryKeys.Command, command);
        this.setTelemetry(TelemetryKeys.JourneyId, this.journeyId);
    }

    public setTelemetry(key: string, value: string) {
        if (key) {
            this.actionContext.telemetry.properties[key] = value;
        }
    }

    public setResult(result: 'Succeeded' | 'Failed' | 'Canceled', error?: Error) {
        this.actionContext.telemetry.properties.result = result;
        if (error) {
            this.actionContext.telemetry.properties.error = error.stack;
            this.actionContext.telemetry.properties.errorMessage = error.message;
        }
    }

    public setCurrentStep(stepName: string) {
        this.actionContext.telemetry.properties.cancelStep = stepName;
    }

    public logError(layer: string, tracePoint: string, error: Error) {
        this.telemetryReporter.sendTelemetryEvent(
            tracePoint,
            {
                'journeyId': this.journeyId,
                'command': this.command,
                'error': JSON.stringify(error),
                'layer': layer
            });

            logger.log(JSON.stringify(error));
    }

    public logInfo(layer: string, tracePoint: string, data: string) {
        this.telemetryReporter.sendTelemetryEvent(
            tracePoint,
            {
                'journeyId': this.journeyId,
                'command': this.command,
                'data': data,
                'layer': layer
            });
    }
}