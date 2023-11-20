import { v4 as uuid } from 'uuid';
import { WebSiteManagementClient, WebSiteManagementModels } from '@azure/arm-appservice';
import { TokenCredentialsBase } from '@azure/ms-rest-nodeauth';

import { WebAppKind, ValidatedSite } from '../../model/models';

export class AppServiceClient {
    private webSiteManagementClient: WebSiteManagementClient;

    constructor(credentials: TokenCredentialsBase, subscriptionId: string) {
        this.webSiteManagementClient = new WebSiteManagementClient(credentials, subscriptionId);
    }

    public async getAppServices(filterForResourceKind: WebAppKind): Promise<WebSiteManagementModels.Site[]> {
        const sites = await this.webSiteManagementClient.webApps.list();
        return sites.filter(site => site.kind === filterForResourceKind);
    }

    public async getAppServiceConfig(site: ValidatedSite): Promise<WebSiteManagementModels.SiteConfigResource> {
        return this.webSiteManagementClient.webApps.getConfiguration(site.resourceGroup, site.name);
    }

    public async updateScmType(site: ValidatedSite): Promise<WebSiteManagementModels.SiteConfigResource> {
        const siteConfig = await this.getAppServiceConfig(site);
        siteConfig.scmType = ScmType.VSTSRM;
        return this.webSiteManagementClient.webApps.updateConfiguration(site.resourceGroup, site.name, siteConfig);
    }

    public async getAppServiceMetadata(site: ValidatedSite): Promise<WebSiteManagementModels.StringDictionary> {
        return this.webSiteManagementClient.webApps.listMetadata(site.resourceGroup, site.name);
    }

    public async updateAppServiceMetadata(site: ValidatedSite, metadata: WebSiteManagementModels.StringDictionary): Promise<WebSiteManagementModels.StringDictionary> {
        return this.webSiteManagementClient.webApps.updateMetadata(site.resourceGroup, site.name, metadata);
    }

    public async publishDeploymentToAppService(site: ValidatedSite, buildDefinitionUrl: string, releaseDefinitionUrl: string, triggeredBuildUrl: string): Promise<WebSiteManagementModels.Deployment> {
        // create deployment object
        const deploymentId = uuid();
        const deployment = this.createDeploymentObject(deploymentId, buildDefinitionUrl, releaseDefinitionUrl, triggeredBuildUrl);
        return this.webSiteManagementClient.webApps.createDeployment(site.resourceGroup, site.name, deploymentId, deployment);
    }

    private createDeploymentObject(deploymentId: string, buildDefinitionUrl: string, releaseDefinitionUrl: string, triggeredBuildUrl: string): WebSiteManagementModels.Deployment {
        const message: DeploymentMessage = {
            type: "CDDeploymentConfiguration",
            message: "Successfully set up continuous delivery from VS Code and triggered deployment to Azure Web App.",
            VSTSRM_BuildDefinitionWebAccessUrl: `${buildDefinitionUrl}`,
            VSTSRM_ConfiguredCDEndPoint: '',
            VSTSRM_BuildWebAccessUrl: `${triggeredBuildUrl}`,
        };

        return {
            id: deploymentId,
            status: 4,
            author: 'VSTS',
            deployer: 'VSTS',
            message: JSON.stringify(message),
        };
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
