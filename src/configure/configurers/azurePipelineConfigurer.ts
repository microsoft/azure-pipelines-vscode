import * as path from 'path';
import { Configurer } from "./configurerBase";
import { AzureDevOpsClient } from "../clients/devOps/azureDevOpsClient";
import { AzureDevOpsHelper } from "../helper/devOps/azureDevOpsHelper";
import { SupportedLanguage } from '../helper/templateHelper';
import { PipelineTemplate, TargetResourceType, WebAppKind } from "../model/models";
import { ServiceClientCredentials } from 'ms-rest';

export class AzurePipelineConfigurer implements Configurer {
    private azureDevOpsHelper: AzureDevOpsHelper;
    private azureDevOpsClient: AzureDevOpsClient;

    public AzurePipelineConfigurer(credentials: ServiceClientCredentials) {
        this.azureDevOpsClient = new AzureDevOpsClient(credentials);
        this.azureDevOpsHelper = new AzureDevOpsHelper(this.azureDevOpsClient);
    }

    public async validatePermissions(): Promise<any> {
        throw new Error("Method not implemented.");
    }

    public async createPreRequisites(): Promise<any> {
        throw new Error("Method not implemented.");
    }

    public async createPipelineFile(): Promise<any> {
        throw new Error("Method not implemented.");
    }

    public async createPipeline(): Promise<any> {
        throw new Error("Method not implemented.");
    }
}

export const pipelineTemplates: { [key: string]: PipelineTemplate[] } =
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
