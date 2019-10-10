import { Language, BuildTarget } from "../model/models"

export class WeightProvider {
    frameworkOrder: Map<Language, number>;

    constructor() {
        this.InitializeWeights();
    }

    public AssignAndSortByWeights(buildTargets: Array<BuildTarget>): Array<BuildTarget> {
        var _buildTargets = this.AssignWeights(buildTargets);
        _buildTargets.sort((a, b) => {
            return a.weight - b.weight;
        });
        return _buildTargets;
    }

    public AssignWeights(buildTargets : Array<BuildTarget>) : Array<BuildTarget>  {
        
        for(var i = 0; i < buildTargets.length; i++) {
            buildTargets[i].weight = this.GetWeight(buildTargets[i]);
        }

        return buildTargets;
    }

    private GetWeight(buildTarget: BuildTarget) : number {
        return this.frameworkOrder[buildTarget.language];
    }

    private InitializeWeights() {
        this.frameworkOrder[Language.Javascript] = 2000;
        this.frameworkOrder[Language.DotNetCore] = 1900;
        this.frameworkOrder[Language.Python] = 1800;
        this.frameworkOrder[Language.Any] = 1700;
    }
}