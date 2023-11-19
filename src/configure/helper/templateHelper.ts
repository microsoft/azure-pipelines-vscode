import { PipelineTemplate, TargetResourceType, WebAppKind } from '../model/models';
import * as fs from 'fs/promises';
import Mustache from 'mustache';
import * as path from 'path';
import * as vscode from 'vscode';
import { URI } from 'vscode-uri';

export async function analyzeRepoAndListAppropriatePipeline(repoUri: URI): Promise<PipelineTemplate[]> {
    // TO-DO: To populate the possible templates on the basis of azure target resource.
    let templateList = simpleWebAppTemplates;
    const analysisResult = await analyzeRepo(repoUri);

    if (analysisResult.isNodeApplication) {
        // add all node application templates
        templateList = nodeTemplates.concat(templateList);
    }

    if (analysisResult.isPythonApplication) {
        templateList = pythonTemplates.concat(templateList);
    }

    if (analysisResult.isFunctionApplication) {
        templateList = functionTemplates.concat(templateList);
    }

    if (analysisResult.isDotnetApplication) {
        templateList = dotnetTemplates.concat(templateList);
    }

    // add all possible templates as we could not detect the appropriate onesı
    return templateList;
}

export async function renderContent(templateFilePath: string, branch: string, resource: string | undefined, azureServiceConnection: string | undefined): Promise<string> {
    const data = await fs.readFile(templateFilePath, { encoding: "utf8" });
    return Mustache.render(data, {
        branch,
        resource,
        azureServiceConnection,
    });
}

async function analyzeRepo(repoUri: URI): Promise<{ isNodeApplication: boolean, isFunctionApplication: boolean, isPythonApplication: boolean, isDotnetApplication: boolean }> {
    let contents: [string, vscode.FileType][];
    try {
        contents = await vscode.workspace.fs.readDirectory(repoUri);
    } catch {
        return {
            isNodeApplication: true,
            isFunctionApplication: true,
            isPythonApplication: true,
            isDotnetApplication: true,
        };
    }

    const files = contents.filter(file => file[1] !== vscode.FileType.Directory).map(file => file[0]);

    return {
        isNodeApplication: isNodeRepo(files),
        isFunctionApplication: isFunctionApp(files),
        isPythonApplication: isPythonRepo(files),
        isDotnetApplication: isDotnetApplication(files),
        // isContainerApplication: isDockerRepo(files)
    };

}

function isNodeRepo(files: string[]): boolean {
    const nodeFilesRegex = /\.ts$|\.js$|package\.json$|node_modules/;
    return files.some((file) => nodeFilesRegex.test(file.toLowerCase()));
}

function isFunctionApp(files: string[]): boolean {
    return files.some((file) => file.toLowerCase().endsWith("host.json"));
}

function isPythonRepo(files: string[]): boolean {
    return files.some((file) => path.extname(file).toLowerCase() === '.py');
}

function isDotnetApplication(files: string[]): boolean {
    return files.some((file) => ['.sln', '.csproj', '.fsproj'].includes(path.extname(file).toLowerCase()));
}

const nodeTemplates: Array<PipelineTemplate> = [
    {
        label: 'Node.js with npm to Windows Web App',
        path: path.join(__dirname, 'configure/templates/nodejsWindowsWebApp.yml'),
        language: 'node',
        target: {
            type: TargetResourceType.WebApp,
            kind: WebAppKind.WindowsApp,
        },
    },
    {
        label: 'Node.js with Angular to Windows Web App',
        path: path.join(__dirname, 'configure/templates/nodejsWindowsWebAppAngular.yml'),
        language: 'node',
        target: {
            type: TargetResourceType.WebApp,
            kind: WebAppKind.WindowsApp,
        },
    },
    {
        label: 'Node.js with Gulp to Windows Web App',
        path: path.join(__dirname, 'configure/templates/nodejsWindowsWebAppGulp.yml'),
        language: 'node',
        target: {
            type: TargetResourceType.WebApp,
            kind: WebAppKind.WindowsApp,
        },
    },
    {
        label: 'Node.js with Grunt to Windows Web App',
        path: path.join(__dirname, 'configure/templates/nodejsWindowsWebAppGrunt.yml'),
        language: 'node',
        target: {
            type: TargetResourceType.WebApp,
            kind: WebAppKind.WindowsApp,
        },
    },
    {
        label: 'Node.js with Webpack to Windows Web App',
        path: path.join(__dirname, 'configure/templates/nodejsWindowsWebAppWebpack.yml'),
        language: 'node',
        target: {
            type: TargetResourceType.WebApp,
            kind: WebAppKind.WindowsApp,
        },
    }
];

const pythonTemplates: Array<PipelineTemplate> = [
    {
        label: 'Python to Linux Web App on Azure',
        path: path.join(__dirname, 'configure/templates/pythonLinuxWebApp.yml'),
        language: 'python',
        target: {
            type: TargetResourceType.WebApp,
            kind: WebAppKind.LinuxApp,
        },
    },
    {
        label: 'Build and Test Python Django App',
        path: path.join(__dirname, 'configure/templates/pythonDjango.yml'),
        language: 'python',
        target: {
            type: TargetResourceType.None,
        },
    }
];

const dotnetTemplates: Array<PipelineTemplate> = [
    {
        label: '.NET Web App to Windows on Azure',
        path: path.join(__dirname, 'configure/templates/dotnetWindowsWebApp.yml'),
        language: 'dotnet',
        target: {
            type: TargetResourceType.WebApp,
            kind: WebAppKind.WindowsApp,
        },
    },
    {
        label: '.NET Web App to Linux on Azure',
        path: path.join(__dirname, 'configure/templates/dotnetLinuxWebApp.yml'),
        language: 'dotnet',
        target: {
            type: TargetResourceType.WebApp,
            kind: WebAppKind.LinuxApp,
        },
    }
]

const simpleWebAppTemplates: Array<PipelineTemplate> = [
    {
        label: 'Simple application to Windows Web App',
        path: path.join(__dirname, 'configure/templates/simpleWebApp.yml'),
        language: 'none',
        target: {
            type: TargetResourceType.WebApp,
            kind: WebAppKind.WindowsApp,
        },
    }
];

const functionTemplates: Array<PipelineTemplate> = [
    {
        label: 'Python Function App to Linux Azure Function',
        path: path.join(__dirname, 'configure/templates/pythonLinuxFunctionApp.yml'),
        language: 'python',
        target: {
            type: TargetResourceType.WebApp,
            kind: WebAppKind.FunctionAppLinux,
        },
    },
    {
        label: 'Node.js Function App to Linux Azure Function',
        path: path.join(__dirname, 'configure/templates/nodejsLinuxFunctionApp.yml'),
        language: 'node',
        target: {
            type: TargetResourceType.WebApp,
            kind: WebAppKind.FunctionAppLinux,
        },
    },
    {
        label: '.NET Function App to Windows Azure Function',
        path: path.join(__dirname, 'configure/templates/dotnetWindowsFunctionApp.yml'),
        language: 'dotnet',
        target: {
            type: TargetResourceType.WebApp,
            kind: WebAppKind.FunctionApp,
        },
    },
]
