import { v4 as uuid } from 'uuid';
import { ResourceManagementModels } from '@azure/arm-resources';
import { WebSiteManagementClient, WebSiteManagementModels } from '@azure/arm-appservice';
import { TokenCredentialsBase } from '@azure/ms-rest-nodeauth';

import { AzureResourceClient } from './azureResourceClient';
import { WebAppKind, ParsedAzureResourceId } from '../../model/models';
import { Messages } from '../../../messages';

export class AppServiceClient extends AzureResourceClient {

    private static resourceType = 'Microsoft.Web/sites';
    private webSiteManagementClient: WebSiteManagementClient;
    private tenantId: string;
    private portalUrl: string;

    constructor(credentials: TokenCredentialsBase, tenantId: string, portalUrl: string, subscriptionId: string) {
        super(credentials, subscriptionId);
        this.webSiteManagementClient = new WebSiteManagementClient(credentials, subscriptionId);
        this.tenantId = tenantId;
        this.portalUrl = portalUrl;
    }

    public async getAppServiceResource(resourceId: string): Promise<ResourceManagementModels.GenericResource> {
        let parsedResourceId: ParsedAzureResourceId = new ParsedAzureResourceId(resourceId);
        return await this.webSiteManagementClient.webApps.get(parsedResourceId.resourceGroup, parsedResourceId.resourceName);
    }

    public async GetAppServices(filterForResourceKind: WebAppKind): Promise<ResourceManagementModels.ResourceListResult> {
        let resourceList = await this.getResourceList(AppServiceClient.resourceType);
        if (!!filterForResourceKind) {
            resourceList = resourceList.filter(resource => resource.kind === filterForResourceKind);
        }

        return resourceList;
    }

    public async getDeploymentCenterUrl(resourceId: string): Promise<string> {
        return `${this.portalUrl}/#@${this.tenantId}/resource/${resourceId}/vstscd`;
    }

    public async getAzurePipelineUrl(resourceId: string): Promise<string> {
        let metadata = await this.getAppServiceMetadata(resourceId);
        if (metadata.properties['VSTSRM_BuildDefinitionWebAccessUrl']) {
            return metadata.properties['VSTSRM_BuildDefinitionWebAccessUrl'];
        }

        throw new Error(Messages.cannotFindPipelineUrlInMetaDataException);
    }

    public async getAppServiceConfig(resourceId: string): Promise<WebSiteManagementModels.SiteConfigResource> {
        let parsedResourceId: ParsedAzureResourceId = new ParsedAzureResourceId(resourceId);
        return this.webSiteManagementClient.webApps.getConfiguration(parsedResourceId.resourceGroup, parsedResourceId.resourceName);
    }

    public async updateScmType(resourceId: string): Promise<WebSiteManagementModels.SiteConfigResource> {
        let siteConfig = await this.getAppServiceConfig(resourceId);
        siteConfig.scmType = ScmType.VSTSRM;
        let parsedResourceId: ParsedAzureResourceId = new ParsedAzureResourceId(resourceId);
        return this.webSiteManagementClient.webApps.updateConfiguration(parsedResourceId.resourceGroup, parsedResourceId.resourceName, siteConfig);
    }

    public async getAppServiceMetadata(resourceId: string): Promise<WebSiteManagementModels.StringDictionary> {
        let parsedResourceId: ParsedAzureResourceId = new ParsedAzureResourceId(resourceId);
        return this.webSiteManagementClient.webApps.listMetadata(parsedResourceId.resourceGroup, parsedResourceId.resourceName);
    }

    public async updateAppServiceMetadata(resourceId: string, metadata: WebSiteManagementModels.StringDictionary): Promise<WebSiteManagementModels.StringDictionary> {
        let parsedResourceId: ParsedAzureResourceId = new ParsedAzureResourceId(resourceId);
        return this.webSiteManagementClient.webApps.updateMetadata(parsedResourceId.resourceGroup, parsedResourceId.resourceName, metadata);
    }

    public async publishDeploymentToAppService(resourceId: string, buildDefinitionUrl: string, releaseDefinitionUrl: string, triggeredBuildUrl: string): Promise<WebSiteManagementModels.Deployment> {
        let parsedResourceId: ParsedAzureResourceId = new ParsedAzureResourceId(resourceId);

        // create deployment object
        let deploymentId = uuid();
        let deployment = this.createDeploymentObject(deploymentId, buildDefinitionUrl, releaseDefinitionUrl, triggeredBuildUrl);
        return this.webSiteManagementClient.webApps.createDeployment(parsedResourceId.resourceGroup, parsedResourceId.resourceName, deploymentId, deployment);
    }

    private createDeploymentObject(deploymentId: string, buildDefinitionUrl: string, releaseDefinitionUrl: string, triggeredBuildUrl: string): WebSiteManagementModels.Deployment {
        let deployment: WebSiteManagementModels.Deployment = {
            id: deploymentId,
            status: 4,
            author: 'VSTS',
            deployer: 'VSTS'
        };

        let deploymentMessage: DeploymentMessage = {
            type: "CDDeploymentConfiguration",
            message: "Successfully set up continuous delivery from VS Code and triggered deployment to Azure Web App.",
            VSTSRM_BuildDefinitionWebAccessUrl: `${buildDefinitionUrl}`,
            VSTSRM_ConfiguredCDEndPoint: '',
            VSTSRM_BuildWebAccessUrl: `${triggeredBuildUrl}`,
        };
        deployment.message = JSON.stringify(deploymentMessage);
        return deployment;
    }
}

export enum ScmType {
    VSTSRM = 'VSTSRM',
    NONE = 'NONE'
}

interface DeploymentMessage {
    type: string;
    message: string;
    VSTSRM_BuildDefinitionWebAccessUrl: string;
    VSTSRM_ConfiguredCDEndPoint: string;
    VSTSRM_BuildWebAccessUrl: string;
}
