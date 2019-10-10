import { JavascriptDetector } from './languageDetectors/JavascriptDetector';
import { BuildFramework } from '../../model/models';
import { PythonDetector } from './languageDetectors/PythonDetector';

export class BuildDetector {
    buildDetector: Array<any> = [
        new JavascriptDetector(),
        new PythonDetector()
    ]

    constructor() {

    }

    public getDetectedBuildFrameworks(files: any) : Array<BuildFramework> {
        var result: Array<BuildFramework> = [];
        
        for(var i = 0; i < this.buildDetector.length; i++) {
            var detectedBuildFramework = this.buildDetector[i].getDetectedBuildFramework(files); 
            if(!!detectedBuildFramework) {
                result = result.concat(detectedBuildFramework);
            }
        }

        return result;
    }

}