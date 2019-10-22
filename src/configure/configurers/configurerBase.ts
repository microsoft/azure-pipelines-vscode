import { WizardInputs } from "../model/models";
import { AzureResourceClient } from "../clients/azure/azureResourceClient";
import { LocalGitRepoHelper } from "../helper/LocalGitRepoHelper";

export interface Configurer {
    validatePermissions(): Promise<void>;
    getInputs(inputs: WizardInputs): Promise<void>;
    createPreRequisites(inputs: WizardInputs): Promise<void>;
    getPathToPipelineFile(inputs: WizardInputs): Promise<string>;
    checkInPipelineFileToRepository(inputs: WizardInputs, localGitRepoHelper: LocalGitRepoHelper): Promise<string>;
    createAndQueuePipeline(inputs: WizardInputs): Promise<string>;
    executePostPipelineCreationSteps(inputs: WizardInputs, azureClient: AzureResourceClient): Promise<void>;
    browseQueuedPipeline(): Promise<void>;
}