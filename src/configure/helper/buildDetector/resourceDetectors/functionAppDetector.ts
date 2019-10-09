import { ResourceDetectionModal, Language, Resource } from "../../../model/models";


export class FunctionAppDetector {
    id: Resource = Resource.FunctionApp;

    constructor() {

    }

    public TryDetect(files: Array<string>, language: Language): ResourceDetectionModal {
        if(language == Language.DotNetCore) {
            return this.TryDetectDotNetCoreFunctionApp(files);
        } 

        return this.TryDetectAny(files);
    }

    public TryDetectAny(files: Array<string>): ResourceDetectionModal {

        var result: ResourceDetectionModal = null;

        if(files.some(a => a.toLowerCase() == "host.json") && files.some(a => a.toLowerCase() == "function.json")) {
            result = {
                resource: this.id,
                settings: {}
            } as ResourceDetectionModal;    
        }

        return result;
    }

    public TryDetectDotNetCoreFunctionApp(files: Array<string>): ResourceDetectionModal {

        return {} as ResourceDetectionModal;
    }
}