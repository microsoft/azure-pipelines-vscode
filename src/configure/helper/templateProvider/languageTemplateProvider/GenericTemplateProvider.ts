import { PipelineTemplate, BuildFramework } from "../../../model/models";
import * as path from 'path';
import * as fs from 'fs';

export class GenericTemplateProvider {

    definitions: any;

    constructor() {

    }

    public getTemplates(buildFramework: BuildFramework): Array<PipelineTemplate> {
        return [];
    }

    public loadDefinitions(definitionFile: string) {
        var dir = path.dirname(path.dirname(path.dirname(__dirname)));
        var fullPath = path.join(dir, "templates", "templateDefinitions", definitionFile);
        
        this.definitions = JSON.parse(fs.readFileSync(fullPath).toString());
    }
}