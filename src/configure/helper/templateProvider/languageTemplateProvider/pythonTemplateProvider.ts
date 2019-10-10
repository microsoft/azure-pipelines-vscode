import { BuildTarget, PipelineTemplate, Language, Resource, TargetResourceType, WebAppKind } from "../../../model/models";
import * as path from 'path';
import { GenericTemplateProvider } from "./GenericTemplateProvider";

export class PythonTemplateProvider extends GenericTemplateProvider{
    pythonFunctionAppTemplate = {
        label: 'Python Function App to Linux Azure Function',
        path: path.join(path.dirname(path.dirname(__dirname)), 'configure/templates/pythonLinuxFunctionApp.yml'),
        language: 'python',
        targetType: TargetResourceType.WebApp,
        targetKind: WebAppKind.FunctionAppLinux
    };

    constructor() {
        super();
    }

    public getTemplates(buildTargets: Array<BuildTarget>): Array<PipelineTemplate> {
        var result: Array<PipelineTemplate> = [];
        
        if(buildTargets.some(a => a.language == Language.Python)) {
            if(buildTargets.some(a => a.resource == Resource.FunctionApp)) {
                result.push(this.pythonFunctionAppTemplate);
            }
        }
        
        return result;
    }
}