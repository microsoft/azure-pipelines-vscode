import { GenericLanguageDetector } from "./GenericLanguageDetector";
import { Language, Resource, BuildTarget } from "../../../model/models";
import { FunctionAppDetector } from "../resourceDetectors/functionAppDetector";

export class PythonDetector extends GenericLanguageDetector {
    id: Language = Language.Python;

    constructor() {
        super();
    }


    public getDetectedBuildTargets(files: Array<string>): Array<BuildTarget> {
        // 1. Check if python
        // 2. Check if python function app
        // 3. Check if python AKS

        if(files.filter(a => {
                return a.endsWith('.py')
            }).length == 0) {
            return Array<BuildTarget>();
        }

        var result: Array<BuildTarget> = [];

        // Since there are python files, it could be a webapp
        result.push({
            language: Language.Python,
            resource: Resource.WebApp,
            settings: {}
        } as BuildTarget);

        var functionAppDetector: FunctionAppDetector = new FunctionAppDetector();
        var detectedResourceTarget = functionAppDetector.TryDetect(files, Language.Python);

        if(detectedResourceTarget != null) {
            var buildTarget: BuildTarget = {
                language: this.id,
                resource: detectedResourceTarget.resource,
                settings: detectedResourceTarget.settings
            } as BuildTarget;

            result.push(buildTarget);
        }

        return result;
    }
}