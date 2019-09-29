import { Configurer } from "./configurerBase";
import { WizardInputs } from "../model/models";

export class GitHubWorkflowConfigurer implements Configurer {
    public async validatePermissions(): Promise<void> {
        return;
    }

    public async createPreRequisites(inputs: WizardInputs): Promise<void> {
        throw new Error("Method not implemented.");
    }

    public async createPipelineFile(): Promise<any> {
        throw new Error("Method not implemented.");
    }

    public async createAndQueuePipeline(inputs: WizardInputs): Promise<any> {
        throw new Error("Method not implemented.");
    }

    public async postPipelineCreationSteps(): Promise<void> {
        throw new Error("Method not implemented.");
    }
}
