import { PipelineTemplate, BuildFramework } from "../../../model/models";
import * as path from 'path';
import { GenericTemplateProvider } from "./GenericTemplateProvider";
import { NodeJSDetector } from "../../buildDetector/languageDetectors/NodeJSDetector";
import * as fs from "fs";

export class NodeJSTemplateProvider extends GenericTemplateProvider {
    
    definitions: any;

    constructor() {
        super();
        this.loadDefinitions();
    }

    public getTemplates(buildFramework: BuildFramework): Array<PipelineTemplate> {
        var result: Array<PipelineTemplate> = [];
        
        if(buildFramework.buildTargets.some(a => a.type == NodeJSDetector.WellKnownTypes.WebApp)) {
            result = result.concat(this.definitions.webApp);
        }

        if(buildFramework.buildTargets.some(a => a.type == NodeJSDetector.WellKnownTypes.AzureFunctionApp)) {
            result = result.concat(this.definitions.functionApp);
        }
        
        return result;
    }

    private loadDefinitions() {
        var dir = path.dirname(path.dirname(path.dirname(__dirname)));
        var fullPath = path.join(dir, "templates", "templateDefinitions", "node.json");
        
        this.definitions = JSON.parse(fs.readFileSync(fullPath).toString());
    }
}
