import { PipelineTemplate, TargetResourceType, WizardInputs, WebAppKind, BuildFramework } from '../model/models';
import * as fs from 'fs';
import * as Mustache from 'mustache';
import * as path from 'path';
import * as Q from 'q';
import { BuildDetector } from './buildDetector/buildDetector';
import { TemplateProvider } from './templateProvider/templateProvider';
import { WeightProvider } from './weightProvider';
import { TreeAnalysisHelper } from './treeAnalysisHelper';

export async function analyzeRepoAndListAppropriatePipeline(repoPath: string): Promise<PipelineTemplate[]> {
    // TO-DO: To populate the possible templates on the basis of azure target resource.
    let templateList = simpleWebAppTemplates;

    var treeAnalyser: TreeAnalysisHelper = new TreeAnalysisHelper(repoPath);
    let analysisResult = await treeAnalyser.analyseRepo();

    var detector: BuildDetector = new BuildDetector();
    var templateProvider : TemplateProvider = new TemplateProvider();
    var weightProvider: WeightProvider = new WeightProvider();

    var detectedTargets: Array<BuildFramework> = detector.getDetectedBuildFrameworks(analysisResult);
    detectedTargets = weightProvider.AssignAndSortByWeights(detectedTargets);

    templateList = templateList.concat(templateProvider.getTemplatesForBuildTargets(detectedTargets));
    // add all possible templates as we could not detect the appropriate onesı
    return templateList;
}

export async function renderContent(templateFilePath: string, context: WizardInputs): Promise<string> {
    let deferred: Q.Deferred<string> = Q.defer();
    fs.readFile(templateFilePath, { encoding: "utf8" }, async (error, data) => {
        if (error) {
            throw new Error(error.message);
        }
        else {
            let fileContent = Mustache.render(data, context);
            deferred.resolve(fileContent);
        }
    });

    return deferred.promise;
}

const simpleWebAppTemplates: Array<PipelineTemplate> = [
    {
        label: 'Simple application to Windows Web App',
        path: path.join(path.dirname(path.dirname(__dirname)), 'configure/templates/simpleWebApp.yml'),
        language: 'none',
        targetType: TargetResourceType.WebApp,
        targetKind: WebAppKind.WindowsApp
    }
];

const functionTemplates: Array<PipelineTemplate> = [
    {
        label: 'Python Function App to Linux Azure Function',
        path: path.join(path.dirname(path.dirname(__dirname)), 'configure/templates/pythonLinuxFunctionApp.yml'),
        language: 'python',
        targetType: TargetResourceType.WebApp,
        targetKind: WebAppKind.FunctionAppLinux
    },
    {
        label: 'Node.js Function App to Windows Azure Function',
        path: path.join(path.dirname(path.dirname(__dirname)), 'configure/templates/nodejsWindowsFunctionApp.yml'),
        language: 'node',
        targetType: TargetResourceType.WebApp,
        targetKind: WebAppKind.FunctionApp
    },
    {
        label: '.NET Core Function App to Windows Azure Function',
        path: path.join(path.dirname(path.dirname(__dirname)), 'configure/templates/dotnetcoreWindowsFunctionApp.yml'),
        language: 'dotnet',
        targetType: TargetResourceType.WebApp,
        targetKind: WebAppKind.FunctionApp
    },
]