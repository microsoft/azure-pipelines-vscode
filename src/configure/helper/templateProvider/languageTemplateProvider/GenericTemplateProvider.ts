import { BuildTarget, PipelineTemplate, BuildFramework } from "../../../model/models";

export class GenericTemplateProvider {
    constructor() {

    }

    public getTemplates(buildFramework: BuildFramework): Array<PipelineTemplate> {
        return [];
    }

    public GetTemplate(templateId: string) {
        
    }
}