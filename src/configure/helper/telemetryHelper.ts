import { IActionContext, ITelemetryReporter, parseError } from "vscode-azureextensionui";

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
            let parsedError = parseError(error);
            this.actionContext.telemetry.properties.error = JSON.stringify(parsedError);
            this.actionContext.telemetry.properties.errorMessage = parsedError.message;
        }
    }

    public setCurrentStep(stepName: string) {
        this.actionContext.telemetry.properties.cancelStep = stepName;
    }

    public logError(layer: string, tracePoint: string, error: Error) {
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

    public logInfo(layer: string, tracePoint: string, info: string) {
        this.telemetryReporter.sendTelemetryEvent(
            tracePoint,
            {
                'journeyId': this.journeyId,
                'command': this.command,
                'layer': layer,
                'info': info
            });
    }
}