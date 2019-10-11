import { PipelineTemplate, BuildFramework } from "../../../model/models";
import { GenericTemplateProvider } from "./GenericTemplateProvider";
import { NodeJSDetector } from "../../buildDetector/languageDetectors/NodeJSDetector";
import { TemplateIds } from "../../templateIds";

export class NodeJSTemplateProvider extends GenericTemplateProvider {

    constructor() {
        super();
        super.loadDefinitions("node.json");
    }

    public getTemplates(buildFramework: BuildFramework): Array<PipelineTemplate> {
        var result: Array<PipelineTemplate> = [];
        
        if(buildFramework.buildTargets.some(a => a.type == NodeJSDetector.WellKnownTypes.WebApp)) {
            let nodeWebApps = buildFramework.buildTargets.filter((target) => {
                return target.type == NodeJSDetector.WellKnownTypes.WebApp;
            })

            for(let webapp of nodeWebApps) {
                if(webapp.settings[NodeJSDetector.Settings.WebFramework] == NodeJSDetector.WebFrameworks.Gulp) {
                    result.push(this.definitions[TemplateIds.Node.Gulp]);
                }
                
                if(webapp.settings[NodeJSDetector.Settings.WebFramework] == NodeJSDetector.WebFrameworks.Grunt) {
                    result.push(this.definitions[TemplateIds.Node.Grunt]);
                }
            }
            result.push(this.definitions[TemplateIds.Node.Angular]);
            result.push(this.definitions[TemplateIds.Node.Webpack]);
        }

        if(buildFramework.buildTargets.some(a => a.type == NodeJSDetector.WellKnownTypes.AzureFunctionApp)) {
            result.push(this.definitions[TemplateIds.Node.FunctionApp]);
        }
        
        return result;
    }
}
