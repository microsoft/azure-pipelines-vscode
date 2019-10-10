import { GenericLanguageDetector } from "./GenericLanguageDetector";
import { BuildTarget, BuildFramework } from "../../../model/models";
import { FunctionAppDetector, FunctionApp } from "../resourceDetectors/functionAppDetector";

export class PythonDetector extends GenericLanguageDetector {
    
    static WellKnownTypes = class {
        static AzureFunctionApp: string = "azurefunctionpython";
        static WebApp: string = "azurewebapppython";
    };
    
    static id: string = "python";


    constructor() {
        super();
    }


    public getDetectedBuildFramework(files: Array<string>): BuildFramework {
        // 1. Check if python
        // 2. Check if python function app
        // 3. Check if python AKS

        if(files.filter(a => {
                return a.endsWith('.py')
            }).length == 0) {
            return null;
        }

        var result: Array<BuildTarget> = [];

        // Since there are python files, it could be a webapp
        result = result.concat(this.getDetectedWebAppBuildTargets(files));
        result = result.concat(this.getDetectedAzureFunctionBuildTargets(files));
        
        return {
            id: PythonDetector.id,
            version: "",
            weight: 0,
            buildTargets: result
        } as BuildFramework;
    }

    private getDetectedWebAppBuildTargets(files: Array<string>): Array<BuildTarget> {
        var result: Array<BuildTarget> = [];

        result.push({
            type: PythonDetector.WellKnownTypes.WebApp,
            path: "",
            settings: {} as Map<string, any>
        })
        
        return result;
    }

    // private GetWebAppFrameworkSettings(): Map<string, any> {
    //     return Map<string, any>();
    // }

    private getDetectedAzureFunctionBuildTargets(files: Array<string>) : Array<BuildTarget> {
        var functionAppDetector: FunctionAppDetector = new FunctionAppDetector();
        var detectedResourceTarget: Array<FunctionApp> = functionAppDetector.GetAzureFunctionApps(files, PythonDetector.id);
        
        var detectedBuildTargets = detectedResourceTarget.map((val) => {
            return {
                type: PythonDetector.WellKnownTypes.AzureFunctionApp,
                path: val.hostJsonFilePath,
                settings: {}
            } as BuildTarget
        });

        return detectedBuildTargets;
    }
}