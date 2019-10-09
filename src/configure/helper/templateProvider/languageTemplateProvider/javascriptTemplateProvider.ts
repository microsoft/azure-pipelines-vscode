import { BuildTarget, PipelineTemplate, Language, Resource, TargetResourceType, WebAppKind } from "../../../model/models";
import * as path from 'path';
import { GenericTemplateProvider } from "./GenericTemplateProvider";

export class JavascriptTemplateProvider extends GenericTemplateProvider {
    nodeFunctionAppTemplate = {
        label: 'Node.js Function App to Windows Azure Function',
        path: path.join(path.dirname(path.dirname(__dirname)), 'configure/templates/nodejsWindowsFunctionApp.yml'),
        language: 'node',
        targetType: TargetResourceType.WebApp,
        targetKind: WebAppKind.FunctionApp
    };

    constructor() {
        super();
    }

    public getTemplates(buildTargets: Array<BuildTarget>): Array<PipelineTemplate> {
        var result: Array<PipelineTemplate> = [];
        
        if(buildTargets.some(a => a.language == Language.Javascript)) {
            if(buildTargets.some(a => a.resource == Resource.FunctionApp)) {
                result.push(this.nodeFunctionAppTemplate);
            }
        }
        
        return result;
    }
}