import { BuildTarget, PipelineTemplate } from "../../../model/models";

export class GenericTemplateProvider {
    constructor() {

    }

    public getTemplates(buildTargets: Array<BuildTarget>): Array<PipelineTemplate> {
        return [];
    }
}