import { WizardInputs } from "../model/models";
import { AzureResourceClient } from "../clients/azure/azureResourceClient";

export interface Configurer {
    validatePermissions(): Promise<any>;
    createPreRequisites(inputs: WizardInputs): Promise<void>;
    createPipelineFile(): Promise<any>;
    createAndQueuePipeline(inputs: WizardInputs): Promise<any>;
    postPipelineCreationSteps(inputs: WizardInputs, azureClient: AzureResourceClient): Promise<void>;
}
