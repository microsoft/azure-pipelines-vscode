import * as path from 'path';


export class FunctionAppDetector {

    constructor() {

    }

    public GetAzureFunctionApps(files: Array<string>, language: string): Array<FunctionApp> {
        if(language == 'dotnetcore') {
            return this.GetAzureFunctionAppsForDotNetCore(files);
        } 

        return this.GetAzureFunctionAppsAny(files);
    }

    public GetAzureFunctionAppsAny(files: Array<string>): Array<FunctionApp> {

        var hostJsonFiles = files.filter((val) => { return val.endsWith("host.json") });
        var functionJsonFiles = files.filter((val) => { return val.endsWith("function.json") });
        var functionAppObjects: Array<FunctionApp> = [];

        for(var i = 0; i < hostJsonFiles.length; i++) {
            var hostJsonDirectory = path.dirname(hostJsonFiles[i]);
            var functionJsonFilesForSpecificHostJson = functionJsonFiles.filter((val) => { return val.indexOf(hostJsonDirectory) != -1; });
            
            if(functionJsonFilesForSpecificHostJson.length == 0) {
                continue;
            }

            var functionAppObject: FunctionApp = {
                hostJsonFilePath : hostJsonFiles[i],
                functionJsonFilePaths: functionJsonFilesForSpecificHostJson
            }
            functionAppObjects.push(functionAppObject);
        }   
        return functionAppObjects;
    }

    public GetAzureFunctionAppsForDotNetCore(files: Array<string>): Array<FunctionApp> {
        return [];
    }
}

export interface FunctionApp {
    hostJsonFilePath: string;
    functionJsonFilePaths: Array<string>;
}