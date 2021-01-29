import { ResourceManagementClient, ResourceManagementModels } from '@azure/arm-resources';
import { TokenCredentialsBase } from '@azure/ms-rest-nodeauth';

export class AzureResourceClient {

    private azureRmClient: ResourceManagementClient;

    constructor(credentials: TokenCredentialsBase, subscriptionId: string) {
        this.azureRmClient = new ResourceManagementClient(credentials, subscriptionId);
    }

    public async getResourceList(resourceType: string, followNextLink: boolean = true): Promise<ResourceManagementModels.ResourceListResult> {
        let resourceListResult: ResourceManagementModels.ResourceListResult = await this.azureRmClient.resources.list({ filter: `resourceType eq '${resourceType}'` });

        if (followNextLink) {
            let nextLink: string = resourceListResult.nextLink;
            while (!!nextLink) {
                let nextResourceListResult = await this.azureRmClient.resources.listNext(nextLink);
                resourceListResult = resourceListResult.concat(nextResourceListResult);
                nextLink = nextResourceListResult.nextLink;
            }
        }

        return resourceListResult;
    }

    public async getResource(resourceId: string, apiVersion: string): Promise<ResourceManagementModels.GenericResource> {
        let resource: ResourceManagementModels.GenericResource = await this.azureRmClient.resources.getById(resourceId, apiVersion);
        return resource;
    }
}
