import { IActionContext, ITelemetryReporter } from "vscode-azureextensionui";

import { extensionVariables } from "../model/models";
import { TracePoints } from "../resources/tracePoints";

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
        this.setTelemetry(TracePoints.Command, command);
        this.setTelemetry(TracePoints.JourneyId, this.journeyId);
    }

    public setTelemetry(key: string, value: string) {
        if (key) {
            this.actionContext.telemetry.properties[key] = value;
        }
    }

    public setError(error: Error) {
        this.actionContext.telemetry.properties.error = error.stack;
        this.actionContext.telemetry.properties.errorMessage = error.message;
    }

    public setResult(result: 'Succeeded' | 'Failed' | 'Canceled', error?: Error, currentStep?: string) {
        this.actionContext.telemetry.properties.result = result;
        if (result === "Failed" && error) {
            this.setError(error);
        }
        else if(result === 'Canceled' && currentStep) {
            this.setCurrentStep(currentStep);
        }
    }

    public setCurrentStep(stepName: string) {
        this.actionContext.telemetry.properties.cancelStep = stepName;
    }

    public logError(tracePoint: string, error: Error) {
        this.telemetryReporter.sendTelemetryEvent(
            tracePoint,
            {
                'journeyId': this.journeyId,
                'command': this.command,
                'error': `Error: ${error.name}, Error.Message: ${error.message}, Error.Stack: ${error.stack}`
            });
    }

    public logData(tracePoint: string, data: string) {
        this.telemetryReporter.sendTelemetryEvent(
            tracePoint,
            {
                'journeyId': this.journeyId,
                'command': this.command,
                'data': data
            });
    }
}