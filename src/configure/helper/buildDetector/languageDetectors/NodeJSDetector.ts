import { BuildTarget, BuildFramework } from "../../../model/models";
import { FunctionAppDetector, FunctionApp } from "../resourceDetectors/functionAppDetector";
import { GenericLanguageDetector } from "./GenericLanguageDetector";
import * as path from 'path';

export class NodeJSDetector extends GenericLanguageDetector {
    
    static WellKnownTypes = class {
        static AzureFunctionApp : string = "azurefunctionappnode";
        static WebApp: string = "azurewebappnode";
    }

    static WebFrameworks = class {
        // Could be Test Frameworks that work along with web framework, to be handled
        static Gulp: string = "gulp";
        static Grunt: string = "grunt";
        // TODO
        static Angular: string = "angular";
        static Webpack: string = "webpack";
    }

    static Settings = class {
        static WorkingDirectory: string = "workingDirectory";
        static WebFramework: string = "nodejs.webFramework";
    }
    
    static id: string = 'node';
    constructor() {
        super();
    }

    public getDetectedBuildFramework(files: Array<string>): BuildFramework {
        // 1. Check if node
        // 2. Check if node function app
        // 3. Check if node AKS

        if(!this.LooksLikeNode(files)) {
            return null;
        }

        // Since there are javascript files, it could be a webapp
        var result: Array<BuildTarget> = this.getDetectedWebAppBuildTargets(files);

        var functionAppBuildTargets = this.getDetectedAzureFunctionBuildTargets(files);
        result = result.concat(functionAppBuildTargets);

        return {
            id: NodeJSDetector.id,
            version: "",
            weight: 0,
            buildTargets: result
        } as BuildFramework;
    }

    private getDetectedWebAppBuildTargets(files: Array<string>) : Array<BuildTarget> {
        var result: Array<BuildTarget> = [];
        // TODO: Distinguish between types of WebApp by gulp, grunt, Angular etc.
        
        if(this.LooksLikeGulp(files)) {
            let gulpFiles: Array<string> = files.filter((val) => {
                return val.toLowerCase().endsWith("gulpfile.js");
            });
            for(var i = 0; i < gulpFiles.length; i++) {
                var settings = this.SetGulpSettings(gulpFiles[i]);
                result.push({
                    type: NodeJSDetector.WellKnownTypes.WebApp,
                    path: "",
                    settings: settings
                })
            }
        }

        if(this.LooksLikeGrunt(files)) {
            let gruntFiles: Array<string> = files.filter((val) => {
                return val.toLowerCase().endsWith("gruntfile.js");
            });
            for(var i = 0; i < gruntFiles.length; i++) {
                var settings = this.SetGruntSettings(gruntFiles[i]);
                result.push({
                    type: NodeJSDetector.WellKnownTypes.WebApp,
                    path: "",
                    settings: settings
                })
            }
        }

        return result;
    }

    private getDetectedAzureFunctionBuildTargets(files: Array<string>) : Array<BuildTarget> {
        var functionAppDetector: FunctionAppDetector = new FunctionAppDetector();
        var detectedResourceTarget: Array<FunctionApp> = functionAppDetector.GetAzureFunctionApps(files, NodeJSDetector.id);
        
        var detectedBuildTargets = detectedResourceTarget.map((val) => {
            return {
                type: NodeJSDetector.WellKnownTypes.AzureFunctionApp,
                path: val.hostJsonFilePath,
                settings: {},
            } as BuildTarget
        });

        return detectedBuildTargets;
    }
    
    private LooksLikeNode(files: Array<string>): boolean {
        return files.some((file) => {
            return file.toLowerCase().endsWith("package.json") || file.endsWith(".ts") || file.endsWith(".js");
        })
    }

    private LooksLikeGulp(files: Array<string>): boolean {
        return files.some((file) => {
            return file.toLowerCase().endsWith("gulpfile.js");
        })
    }

    private SetGulpSettings(gulpFile: string, settings: Map<string, any> = null): Map<string, any> {
        if(settings == null) {
            settings = {} as Map<string, any>;
        }
        settings[NodeJSDetector.Settings.WebFramework] = NodeJSDetector.WebFrameworks.Gulp;
        settings[NodeJSDetector.Settings.WorkingDirectory] = path.dirname(gulpFile);    
        return settings;
    }

    private LooksLikeGrunt(files: Array<string>): boolean {
        return files.some((file) => {
            return file.toLowerCase().endsWith("gruntfile.js");
        })
    }

    private SetGruntSettings(gruntFile: string, settings: Map<string, any> = null): Map<string, any> {
        if(settings == null) {
            settings = {} as Map<string, any>;
        }
        settings[NodeJSDetector.Settings.WebFramework] = NodeJSDetector.WebFrameworks.Grunt;
        settings[NodeJSDetector.Settings.WorkingDirectory] = path.dirname(gruntFile);    
        return settings;
    }
}