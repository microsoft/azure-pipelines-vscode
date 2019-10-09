import { PipelineTemplate, WizardInputs, RepositoryProvider, TargetResourceType, WebAppKind } from '../model/models';
import * as fs from 'fs';
import * as Mustache from 'mustache';
import * as path from 'path';
import * as Q from 'q';
import { Messages } from '../resources/messages';
import { GenericResource } from 'azure-arm-resource/lib/resource/models';

export async function analyzeRepoAndListAppropriatePipeline(repoPath: string, repositoryProvider: RepositoryProvider, targetResource?: GenericResource): Promise<PipelineTemplate[]> {
    let analysisResult = await analyzeRepo(repoPath);

    let templateList: { [key: string]: PipelineTemplate[] } = {};
    switch(repositoryProvider) {
        case RepositoryProvider.AzureRepos:
            templateList = pipelineTemplates;
            break;
        case RepositoryProvider.Github:
            templateList = githubWorklowTemplates;
            break;
        default:
            throw new Error(Messages.cannotIdentifyRespositoryDetails);
    }

    let templateResult: PipelineTemplate[] = [];
    switch(analysisResult.language) {
        case SupportedLanguage.NODE:
            templateResult = templateList[SupportedLanguage.NODE];
            break;
        case SupportedLanguage.NONE:
        default:
            break;
    }

    if (templateList['none']) {
        templateResult = templateResult.concat(templateList['none']);
    }

    templateResult = targetResource && !!targetResource.type ? templateResult.filter((template) => !template.targetType || template.targetType.toLowerCase() === targetResource.type.toLowerCase()): templateResult;
    templateResult = targetResource && !!targetResource.kind ? templateResult.filter((template) => !template.targetKind || template.targetKind.toLowerCase() === targetResource.kind.toLowerCase()): templateResult;
    return templateResult;
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

async function analyzeRepo(repoPath: string): Promise<AnalysisResult> {
    let deferred: Q.Deferred<AnalysisResult> = Q.defer();
    fs.readdir(repoPath, (err, files: string[]) => {
        let result = {
            language: err ? SupportedLanguage.NONE : isNodeRepo(files) ? SupportedLanguage.NODE : SupportedLanguage.NONE
            // isContainerApplication: isDockerRepo(files)
        };
        deferred.resolve(result);
    });

    return deferred.promise;
}

function isNodeRepo(files: string[]): boolean {
    let nodeFilesRegex = '\\.ts$|\\.js$|package\\.json$|node_modules';
    return files.some((file) => {
        let result = new RegExp(nodeFilesRegex).test(file.toLowerCase());
        return result;
    });
}

export class AnalysisResult {
    public language: SupportedLanguage;
    // public isContainerized: boolean;
}

export enum SupportedLanguage {
    NODE = 'node',
    NONE = 'none'
}

let pipelineTemplates: { [key: string]: PipelineTemplate[] } =
{
    'none': [
        {
            label: 'Simple application to Windows Web App',
            path: path.join(path.dirname(path.dirname(__dirname)), 'configure/templates/azurePipelineTemplates/simpleWebApp.yml'),
            language: SupportedLanguage.NONE,
            targetType: TargetResourceType.WebApp,
            targetKind: WebAppKind.WindowsApp
        }
    ],
    'node': [
        {
            label: 'Node.js with npm to Windows Web App',
            path: path.join(path.dirname(path.dirname(__dirname)), 'configure/templates/azurePipelineTemplates/nodejs.yml'),
            language: SupportedLanguage.NODE,
            targetType: TargetResourceType.WebApp,
            targetKind: WebAppKind.WindowsApp
        },
        {
            label: 'Node.js with Gulp to Windows Web App',
            path: path.join(path.dirname(path.dirname(__dirname)), 'configure/templates/azurePipelineTemplates/nodejsWithGulp.yml'),
            language: SupportedLanguage.NODE,
            targetType: TargetResourceType.WebApp,
            targetKind: WebAppKind.WindowsApp
        },
        {
            label: 'Node.js with Grunt to Windows Web App',
            path: path.join(path.dirname(path.dirname(__dirname)), 'configure/templates/azurePipelineTemplates/nodejsWithGrunt.yml'),
            language: SupportedLanguage.NODE,
            targetType: TargetResourceType.WebApp,
            targetKind: WebAppKind.WindowsApp
        },
        {
            label: 'Node.js with Angular to Windows Web App',
            path: path.join(path.dirname(path.dirname(__dirname)), 'configure/templates/azurePipelineTemplates/nodejsWithAngular.yml'),
            language: SupportedLanguage.NODE,
            targetType: TargetResourceType.WebApp,
            targetKind: WebAppKind.WindowsApp
        },
        {
            label: 'Node.js with Webpack to Windows Web App',
            path: path.join(path.dirname(path.dirname(__dirname)), 'configure/templates/azurePipelineTemplates/nodejsWithWebpack.yml'),
            language: SupportedLanguage.NODE,
            targetType: TargetResourceType.WebApp,
            targetKind: WebAppKind.WindowsApp
        }
    ]
};

let githubWorklowTemplates: { [key: string]: PipelineTemplate[] } = {
    'node': [
        {
            label: 'Node.js with npm to Linux Web App',
            path: path.join(path.dirname(path.dirname(__dirname)), 'configure/templates/githubWorkflowTemplates/nodejs.yml'),
            language: SupportedLanguage.NODE,
            targetType: TargetResourceType.WebApp,
            targetKind: WebAppKind.LinuxApp
        }
    ]
};
