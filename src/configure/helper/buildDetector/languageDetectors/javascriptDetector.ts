import { BuildTarget, BuildFramework } from "../../../model/models";
import { FunctionAppDetector, FunctionApp } from "../resourceDetectors/functionAppDetector";
import { GenericLanguageDetector } from "./GenericLanguageDetector";

export class JavascriptDetector extends GenericLanguageDetector {
    
    static WellKnownTypes = class {
        static AzureFunctionApp : string = "azurefunctionappnode";
        static WebApp: string = "azurewebappnode";
    }
    
    static id: string = 'node';
    constructor() {
        super();
    }

    public getDetectedBuildFramework(files: Array<string>): BuildFramework {
        // 1. Check if node
        // 2. Check if node function app
        // 3. Check if node AKS

        if(files.filter(a => {
                return a.endsWith('.js') || a.endsWith('.ts') || a.toLowerCase() == "package.json";
            }).length == 0) {
            return null;
        }

        // Since there are javascript files, it could be a webapp
        var result: Array<BuildTarget> = this.getDetectedWebAppBuildTargets(files);

        var functionAppBuildTargets = this.getDetectedAzureFunctionBuildTargets(files);
        result = result.concat(functionAppBuildTargets);

        return {
            id: JavascriptDetector.id,
            version: "",
            weight: 0,
            buildTargets: result
        } as BuildFramework;
    }

    private getDetectedWebAppBuildTargets(files: Array<string>) : Array<BuildTarget> {
        var result: Array<BuildTarget> = [];

        result.push({
            type: JavascriptDetector.WellKnownTypes.WebApp,
            path: "",
            settings: {} as Map<string, any>
        })
        
        return result;
    }

    private getDetectedAzureFunctionBuildTargets(files: Array<string>) : Array<BuildTarget> {
        var functionAppDetector: FunctionAppDetector = new FunctionAppDetector();
        var detectedResourceTarget: Array<FunctionApp> = functionAppDetector.GetAzureFunctionApps(files, JavascriptDetector.id);
        
        var detectedBuildTargets = detectedResourceTarget.map((val) => {
            return {
                type: JavascriptDetector.WellKnownTypes.AzureFunctionApp,
                path: val.hostJsonFilePath,
                settings: {},
            } as BuildTarget
        });

        return detectedBuildTargets;
    }
}