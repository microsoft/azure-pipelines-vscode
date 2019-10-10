import { BuildTarget, Language, Resource } from "../../../model/models";
import { FunctionAppDetector } from "../resourceDetectors/functionAppDetector";
import { GenericLanguageDetector } from "./GenericLanguageDetector";

export class JavascriptDetector extends GenericLanguageDetector {
    id: Language = Language.Javascript;

    constructor() {
        super();
    }

    public getDetectedBuildTargets(files: Array<string>): Array<BuildTarget> {
        // 1. Check if node
        // 2. Check if node function app
        // 3. Check if node AKS

        if(files.filter(a => {
                return a.endsWith('.js') || a.endsWith('.ts') || a.toLowerCase() == "package.json";
            }).length == 0) {
            return Array<BuildTarget>();
        }

        var result: Array<BuildTarget> = [];

        // Since there are javascript files, it could be a webapp
        result.push({
            language: Language.Javascript,
            resource: Resource.WebApp,
            settings: {}
        } as BuildTarget);

        var functionAppDetector: FunctionAppDetector = new FunctionAppDetector();
        var detectedResourceTarget = functionAppDetector.TryDetect(files, Language.Javascript);

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