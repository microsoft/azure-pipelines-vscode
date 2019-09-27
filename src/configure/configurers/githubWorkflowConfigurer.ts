import * as path from 'path';
import { Configurer } from "./configurerBase";
import { PipelineTemplate, TargetResourceType, WebAppKind } from "../model/models";
import { SupportedLanguage } from "../helper/templateHelper";

export class GitHubWorkflowConfigurer implements Configurer {
    public async validatePermissions(): Promise<void> {
        return;
    }

    public async createPreRequisites(): Promise<any> {
        throw new Error("Method not implemented.");
    }

    public async createPipelineFile(): Promise<any> {
        throw new Error("Method not implemented.");
    }

    public async createPipeline(): Promise<any> {
        throw new Error("Method not implemented.");
    }

}

export const githubWorklowTemplates: { [key: string]: PipelineTemplate[] } = {
    'node': [
        {
            label: 'Node.js with npm to Windows Web App',
            path: path.join(path.dirname(path.dirname(__dirname)), 'configure/templates/githubWorkflowTemplates/nodejs.yml'),
            language: SupportedLanguage.NODE,
            targetType: TargetResourceType.WebApp,
            targetKind: WebAppKind.LinuxApp
        }
    ]
};
