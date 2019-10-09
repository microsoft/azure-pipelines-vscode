import { JavascriptDetector } from './languageDetectors/javascriptDetector';
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
            result.concat(this.buildDetector[i].getDetectedBuildTargets(files));
        }

        return result;
    }

}