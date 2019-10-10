import { BuildFramework } from "../model/models"
import { JavascriptDetector } from "./buildDetector/languageDetectors/JavascriptDetector";
import { PythonDetector } from "./buildDetector/languageDetectors/PythonDetector";

export class WeightProvider {
    frameworkOrder: Map<string, number> = {} as Map<string, number>;

    constructor() {
        this.InitializeWeights();
    }

    public AssignAndSortByWeights(buildFramework: Array<BuildFramework>): Array<BuildFramework> {
        var _buildFramework = this.AssignWeights(buildFramework);
        _buildFramework.sort((a, b) => {
            return a.weight - b.weight;
        });
        return _buildFramework;
    }

    public AssignWeights(buildFramework : Array<BuildFramework>) : Array<BuildFramework>  {
        
        for(var i = 0; i < buildFramework.length; i++) {
            buildFramework[i].weight = this.GetWeight(buildFramework[i]);
        }

        return buildFramework;
    }

    private GetWeight(buildFramework: BuildFramework) : number {
        return this.frameworkOrder[buildFramework.id];
    }

    private InitializeWeights() {
        this.frameworkOrder[JavascriptDetector.id] = 2000;
        this.frameworkOrder[PythonDetector.id] = 1800;
    }
}