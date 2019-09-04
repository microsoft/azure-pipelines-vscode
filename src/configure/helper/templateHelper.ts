import { PipelineTemplate, TargetResourceType, WizardInputs } from '../model/models';
import * as fs from 'fs';
import * as Mustache from 'mustache';
import * as path from 'path';
import * as Q from 'q';

export async function analyzeRepoAndListAppropriatePipeline(repoPath: string): Promise<PipelineTemplate[]> {
    // TO-DO: To populate the possible templates on the basis of azure target resource.
    let templateList = simpleWebAppTemplates;
    let analysisResult = await analyzeRepo(repoPath);


    if (analysisResult.isNodeApplication) {
        // add all node application templates
        templateList = nodeTemplates.concat(templateList);
    }

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

async function analyzeRepo(repoPath: string): Promise<{ isNodeApplication: boolean }> {
    let deferred: Q.Deferred<{ isNodeApplication: boolean }> = Q.defer();
    fs.readdir(repoPath, (err, files: string[]) => {
        let result = {
            isNodeApplication: err ? true : isNodeRepo(files)
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

const nodeTemplates: Array<PipelineTemplate> = [
    {
        label: 'Node.js with npm to Windows Web App',
        path: path.join(path.dirname(path.dirname(__dirname)), 'configure/templates/nodejs.yml'),
        language: 'node',
        targetType: TargetResourceType.WindowsWebApp
    },
    {
        label: 'Node.js with Gulp to Windows Web App',
        path: path.join(path.dirname(path.dirname(__dirname)), 'configure/templates/nodejsWithGulp.yml'),
        language: 'node',
        targetType: TargetResourceType.WindowsWebApp
    },
    {
        label: 'Node.js with Grunt to Windows Web App',
        path: path.join(path.dirname(path.dirname(__dirname)), 'configure/templates/nodejsWithGrunt.yml'),
        language: 'node',
        targetType: TargetResourceType.WindowsWebApp
    },
    {
        label: 'Node.js with Angular to Windows Web App',
        path: path.join(path.dirname(path.dirname(__dirname)), 'configure/templates/nodejsWithAngular.yml'),
        language: 'node',
        targetType: TargetResourceType.WindowsWebApp
    },
    {
        label: 'Node.js with Webpack to Windows Web App',
        path: path.join(path.dirname(path.dirname(__dirname)), 'configure/templates/nodejsWithWebpack.yml'),
        language: 'node',
        targetType: TargetResourceType.WindowsWebApp
    }
];

const simpleWebAppTemplates: Array<PipelineTemplate> = [
    {
        label: 'Simple application to Windows Web App',
        path: path.join(path.dirname(path.dirname(__dirname)), 'configure/templates/simpleWebApp.yml'),
        language: 'none',
        targetType: TargetResourceType.WindowsWebApp
    }
];