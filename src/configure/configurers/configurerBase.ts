import { WizardInputs } from "../model/models";
import { AzureResourceClient } from "../clients/azure/azureResourceClient";

export interface Configurer {
    validatePermissions(): Promise<void>;
    getInputs(inputs: WizardInputs): Promise<void>;
    createPreRequisites(inputs: WizardInputs): Promise<void>;
    getPathToPipelineFile(inputs: WizardInputs): Promise<string>;
    createAndQueuePipeline(inputs: WizardInputs): Promise<string>;
    executePostPipelineCreationSteps(inputs: WizardInputs, azureClient: AzureResourceClient): Promise<void>;
    browseQueuedPipeline(): Promise<void>;
}
