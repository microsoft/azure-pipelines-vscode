import { BuildTarget, PipelineTemplate, Language, Resource, TargetResourceType, WebAppKind } from "../../../model/models";
import * as path from 'path';
import { GenericTemplateProvider } from "./GenericTemplateProvider";

export class JavascriptTemplateProvider extends GenericTemplateProvider {
    nodeFunctionAppTemplates = [
        {
            label: 'Node.js Function App to Windows Azure Function',
            path: path.join(path.dirname(path.dirname(__dirname)), 'configure/templates/nodejsWindowsFunctionApp.yml'),
            language: 'node',
            targetType: TargetResourceType.WebApp,
            targetKind: WebAppKind.FunctionApp
        }
    ];

    nodeWebAppTemplate = [
        {
            label: 'Node.js with npm to Windows Web App',
            path: path.join(path.dirname(path.dirname(__dirname)), 'configure/templates/nodejs.yml'),
            language: 'node',
            targetType: TargetResourceType.WebApp,
            targetKind: WebAppKind.WindowsApp
        },
        {
            label: 'Node.js with Gulp to Windows Web App',
            path: path.join(path.dirname(path.dirname(__dirname)), 'configure/templates/nodejsWithGulp.yml'),
            language: 'node',
            targetType: TargetResourceType.WebApp,
            targetKind: WebAppKind.WindowsApp
        },
        {
            label: 'Node.js with Grunt to Windows Web App',
            path: path.join(path.dirname(path.dirname(__dirname)), 'configure/templates/nodejsWithGrunt.yml'),
            language: 'node',
            targetType: TargetResourceType.WebApp,
            targetKind: WebAppKind.WindowsApp
        },
        {
            label: 'Node.js with Angular to Windows Web App',
            path: path.join(path.dirname(path.dirname(__dirname)), 'configure/templates/nodejsWithAngular.yml'),
            language: 'node',
            targetType: TargetResourceType.WebApp,
            targetKind: WebAppKind.WindowsApp
        },
        {
            label: 'Node.js with Webpack to Windows Web App',
            path: path.join(path.dirname(path.dirname(__dirname)), 'configure/templates/nodejsWithWebpack.yml'),
            language: 'node',
            targetType: TargetResourceType.WebApp,
            targetKind: WebAppKind.WindowsApp
        }
    ];

    constructor() {
        super();
    }

    public getTemplates(buildTargets: Array<BuildTarget>): Array<PipelineTemplate> {
        var result: Array<PipelineTemplate> = [];
        
        if(buildTargets.some(a => a.language == Language.Javascript)) {
            result = result.concat(this.nodeWebAppTemplate);
            if(buildTargets.some(a => a.resource == Resource.FunctionApp)) {
                result = result.concat(this.nodeFunctionAppTemplates);
            }
        }
        
        return result;
    }
}