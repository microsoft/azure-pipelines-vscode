import { JavascriptDetector } from './languageDetectors/JavascriptDetector';
import { BuildTarget } from '../../model/models';

export class BuildDetector {
    buildDetector: Array<any> = [
        new JavascriptDetector()
    ]

    constructor() {

    }

    public getDetectedBuildTargets(files: any) : Array<BuildTarget> {
        var result: Array<BuildTarget> = [];
        
        for(var i = 0; i < this.buildDetector.length; i++) {
            var detectedBuildTargets = this.buildDetector[i].getDetectedBuildTargets(files); 
            result = result.concat(detectedBuildTargets);
        }

        return result;
    }

}