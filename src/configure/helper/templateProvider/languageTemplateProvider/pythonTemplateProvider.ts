import { BuildTarget, PipelineTemplate, TargetResourceType, WebAppKind } from "../../../model/models";
import * as path from 'path';
import { GenericTemplateProvider } from "./GenericTemplateProvider";
import { PythonDetector } from "../../buildDetector/languageDetectors/PythonDetector";

export class PythonTemplateProvider extends GenericTemplateProvider {
    pythonWebAppTemplates = [];

    pythonFunctionAppTemplate = [
        {
            label: 'Python Function App to Linux Azure Function',
            path: path.join(path.dirname(path.dirname(__dirname)), 'configure/templates/pythonLinuxFunctionApp.yml'),
            language: 'python',
            targetType: TargetResourceType.WebApp,
            targetKind: WebAppKind.FunctionAppLinux
        }
    ];

    constructor() {
        super();
    }

    public getTemplates(buildTargets: Array<BuildTarget>): Array<PipelineTemplate> {
        var result: Array<PipelineTemplate> = [];
        
        if(buildTargets.some(a => a.type == PythonDetector.WellKnownTypes.WebApp)) {
            result = result.concat(this.pythonWebAppTemplates);
        }

        if(buildTargets.some(a => a.type == PythonDetector.WellKnownTypes.AzureFunctionApp)) {
            result = result.concat(this.pythonFunctionAppTemplate);
        }

        return result;
    }
}