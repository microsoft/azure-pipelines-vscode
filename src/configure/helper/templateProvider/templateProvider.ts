import { BuildTarget, Language, PipelineTemplate } from "../../model/models";
import { JavascriptTemplateProvider } from "./languageTemplateProvider/javascriptTemplateProvider";
import { GenericTemplateProvider } from "./languageTemplateProvider/GenericTemplateProvider";

export class TemplateProvider {

    constructor() {

    }

    public getTemplatesForBuildTargets(buildTargets: Array<BuildTarget>): Array<PipelineTemplate> {
        var templateList: Array<PipelineTemplate> = [];

        for(var i = 0; i < buildTargets.length; i++) {
            var provider = this.getTemplateProvider(buildTargets[i].language);
            templateList.concat(provider.getTemplates(buildTargets));    
        }

        return templateList;
    }

    public getTemplateProvider(lang: Language) {
        switch(lang) {
            case Language.Javascript:
                return new JavascriptTemplateProvider();
            default:
                return new GenericTemplateProvider();
        }
    }
}