import { ResourceDetectionModal, Language, Resource } from "../../../model/models";
import * as path from 'path';


export class FunctionAppDetector {
    id: Resource = Resource.FunctionApp;

    constructor() {

    }

    public TryDetect(files: Array<string>, language: Language): FunctionAppDetectionModal {
        if(language == Language.DotNetCore) {
            return this.TryDetectDotNetCoreFunctionApp(files);
        } 

        return this.TryDetectAny(files);
    }

    public TryDetectAny(files: Array<string>): FunctionAppDetectionModal {

        var result: FunctionAppDetectionModal = null;

        var hostJsonFiles = files.filter((val) => { val.endsWith("host.json") });
        var functionJsonFiles = files.filter((val) => { val.endsWith("function.json") });
        var functionAppObjects: Array<FunctionApp> = [];

        for(var i = 0; i < hostJsonFiles.length; i++) {
            var hostJsonDirectory = path.dirname(hostJsonFiles[i]);
            var functionJsonFilesForSpecificHostJson = functionJsonFiles.filter((val) => val.indexOf(hostJsonDirectory) != -1);
            if(functionJsonFilesForSpecificHostJson.length == 0) continue;
            var functionAppObject: FunctionApp = {
                hostJsonFilePath : hostJsonFiles[i],
                functionJsonFilePaths: functionJsonFilesForSpecificHostJson
            }
            functionAppObjects.push(functionAppObject);
        }   

        result = {
            resource: this.id,
            settings: {},
            functionApps: functionAppObjects
        };

        return result;
    }

    public TryDetectDotNetCoreFunctionApp(files: Array<string>): FunctionAppDetectionModal {

        return {} as FunctionAppDetectionModal;
    }
}

export interface FunctionAppDetectionModal extends ResourceDetectionModal {
    functionApps: Array<FunctionApp>;
}

interface FunctionApp {
    hostJsonFilePath: string;
    functionJsonFilePaths: Array<string>;
}