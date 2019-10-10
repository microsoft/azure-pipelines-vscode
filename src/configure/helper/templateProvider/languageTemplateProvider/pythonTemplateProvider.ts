import { BuildTarget, PipelineTemplate, TargetResourceType, WebAppKind, BuildFramework } from "../../../model/models";
import * as path from 'path';
import * as fs from 'fs';
import { GenericTemplateProvider } from "./GenericTemplateProvider";
import { PythonDetector } from "../../buildDetector/languageDetectors/PythonDetector";

export class PythonTemplateProvider extends GenericTemplateProvider {
    definitions: any;

    constructor() {
        super();
        this.loadDefinitions();
    }

    public getTemplates(buildFramework: BuildFramework): Array<PipelineTemplate> {
        var result: Array<PipelineTemplate> = [];
        
        if(buildFramework.buildTargets.some(a => a.type == PythonDetector.WellKnownTypes.WebApp)) {
            result = result.concat(this.definitions["webApp"]);
        }

        if(buildFramework.buildTargets.some(a => a.type == PythonDetector.WellKnownTypes.AzureFunctionApp)) {
            result = result.concat(this.definitions["functionApp"]);
        }

        return result;
    }

    private loadDefinitions() {
        var dir = path.dirname(path.dirname(path.dirname(__dirname)));
        var fullPath = path.join(dir, "templates", "templateDefinitions", "python.json");
        
        this.definitions = JSON.parse(fs.readFileSync(fullPath).toString());
    }
}