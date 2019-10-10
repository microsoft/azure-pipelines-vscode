import { PipelineTemplate, BuildFramework } from "../../../model/models";
import { GenericTemplateProvider } from "./GenericTemplateProvider";
import { PythonDetector } from "../../buildDetector/languageDetectors/PythonDetector";
import { TemplateIds } from "../../templateIds";

export class PythonTemplateProvider extends GenericTemplateProvider {
   
    constructor() {
        super();
        super.loadDefinitions("python.json");
    }

    public getTemplates(buildFramework: BuildFramework): Array<PipelineTemplate> {
        var result: Array<PipelineTemplate> = [];
        
        if(buildFramework.buildTargets.some(a => a.type == PythonDetector.WellKnownTypes.WebApp)) {
            // TODO:
        }

        if(buildFramework.buildTargets.some(a => a.type == PythonDetector.WellKnownTypes.AzureFunctionApp)) {
            result.push(this.definitions[TemplateIds.Python.FunctionApp]);
        }

        return result;
    }
}