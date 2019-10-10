import { PipelineTemplate, BuildFramework } from "../../model/models";
import { JavascriptTemplateProvider } from "./languageTemplateProvider/JavascriptTemplateProvider";
import { GenericTemplateProvider } from "./languageTemplateProvider/GenericTemplateProvider";
import { PythonTemplateProvider } from "./languageTemplateProvider/PythonTemplateProvider";
import { JavascriptDetector } from "../buildDetector/languageDetectors/JavascriptDetector";
import { PythonDetector } from "../buildDetector/languageDetectors/PythonDetector";

export class TemplateProvider {

    constructor() {

    }

    public getTemplatesForBuildTargets(buildFrameworks: Array<BuildFramework>): Array<PipelineTemplate> {
        var templateList: Array<PipelineTemplate> = [];

        for(var i = 0; i < buildFrameworks.length; i++) {
            var provider = this.getTemplateProvider(buildFrameworks[i].id);
            templateList = templateList.concat(provider.getTemplates(buildFrameworks[i].buildTargets));    
        }

        return templateList;
    }

    public getTemplateProvider(buildFramework: string) {
        switch(buildFramework) {
            case JavascriptDetector.id:
                return new JavascriptTemplateProvider();
            case PythonDetector.id:
                return new PythonTemplateProvider();
            default:
                return new GenericTemplateProvider();
        }
    }
}