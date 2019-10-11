import { GenericLanguageDetector } from "./GenericLanguageDetector";
import { BuildTarget, BuildFramework } from "../../../model/models";
import { FunctionAppDetector, FunctionApp } from "../resourceDetectors/functionAppDetector";
import { PythonRequirementsParser } from "./PythonRequirementsParser";

export class PythonDetector extends GenericLanguageDetector {
    
    static WellKnownTypes = class {
        static AzureFunctionApp: string = "azurefunctionpython";
        static WebApp: string = "azurewebapppython";
    };
    
    static Settings  = class {
        static WorkingDirectory: string = "workingDirectory";
        static Version: string = "python.version";
        static WebFramework: string = "python.webFramework";
        static DjangoSettings: string = "python.django.settings";
        static FlaskProject: string = "python.flask.project";
    };

    static WebFrameworks = class {
        static Django: string = "django";
        static Bottle: string = "bottle";
        static Flask: string = "flask";
    }

    static id: string = "python";


    constructor() {
        super();
    }


    public getDetectedBuildFramework(files: Array<string>): BuildFramework {

        if(!this.LooksLikePython(files)) {
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

        if(this.LooksLikeDjango(files)) {
            var settings: Map<string, any> = {} as Map<string, any>;
            settings = this.SetDjangoSettings(files, settings);
            result.push({
                type: PythonDetector.WellKnownTypes.WebApp,
                path: "",
                settings: settings
            });
        }

        let requirementsFiles = files.filter((val) => {
            return val.endsWith("requirements.txt");
        });

        let packages: Array<string> = [];

        //Revisit, why need for loop
        for(var i = 0; i < requirementsFiles.length; i++) {
            let requirementsFileParser: PythonRequirementsParser = new PythonRequirementsParser(requirementsFiles[i]);
            packages = packages.concat(requirementsFileParser.getPackages());    
        }

        if(this.LooksLikeFlask(packages)) {
            var settings: Map<string, any> = {} as Map<string, any>;
            settings = this.SetFlaskSettings(files, settings);
            result.push({
                type: PythonDetector.WellKnownTypes.WebApp,
                path: "",
                settings: settings
            });
        }

        if(this.LooksLikeBottle(packages)) {
            var settings: Map<string, any> = {} as Map<string, any>;
            settings = this.SetBottleSettings(files, settings);
            result.push({
                type: PythonDetector.WellKnownTypes.WebApp,
                path: "",
                settings: settings
            });
        }

        return result;
    }

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

    private LooksLikePython(files: Array<string>): boolean {
        return files.some((a) => {return a.endsWith(".py");});
    }

    private LooksLikeDjango(files: Array<string>): boolean {
        // could fail if filename is, for ex: asd\manage.py in unix
        return files.some((a) => { return a.endsWith("manage.py"); })
    }

    private SetDjangoSettings(files: Array<string>, settings: Map<string, any>): Map<string, any> {
        settings[PythonDetector.Settings.WebFramework] = PythonDetector.WebFrameworks.Django;
        settings[PythonDetector.Settings.WorkingDirectory] = files.filter((val) => {
            return val.endsWith("manage.py");
        });
        return settings;
    }

    private LooksLikeFlask(packageNames: Array<string>): boolean {
        return packageNames.map((val) => {return val.toLowerCase();}).indexOf("flask") != -1;
    }

    private SetFlaskSettings(files: Array<string>, settings: Map<string, any>): Map<string, any> {
        settings[PythonDetector.Settings.WebFramework] = PythonDetector.WebFrameworks.Flask;
        return settings;
    }

    private LooksLikeBottle(packageNames: Array<string>): boolean {
        return packageNames.map((val) => {return val.toLowerCase();}).indexOf("bottle") != -1;
    }

    private SetBottleSettings(files: Array<string>, settings: Map<string, any>): Map<string, any> {
        settings[PythonDetector.Settings.WebFramework] = PythonDetector.WebFrameworks.Bottle;
        return settings;
    }
}