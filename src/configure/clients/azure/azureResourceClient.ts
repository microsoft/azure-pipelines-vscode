import { ResourceListResult, GenericResource } from 'azure-arm-resource/lib/resource/models';
import { ServiceClientCredentials } from 'ms-rest';
import * as ResourceManagementClient from 'azure-arm-resource/lib/resource/resourceManagementClient';

export class AzureResourceClient {

    private azureRmClient: ResourceManagementClient.ResourceManagementClient;

    constructor(credentials: ServiceClientCredentials, subscriptionId: string) {
        this.azureRmClient = new ResourceManagementClient.ResourceManagementClient(credentials, subscriptionId);
    }

    public async getResourceList(resourceType: string, followNextLink: boolean = true): Promise<ResourceListResult> {
        let resourceListResult: ResourceListResult = await this.azureRmClient.resources.list({ filter: `resourceType eq '${resourceType}'` });

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

    public async getResource(resourceId: string, apiVersion: string): Promise<GenericResource> {
        let resource: GenericResource = await this.azureRmClient.resources.getById(resourceId, apiVersion);
        return resource;
    }
}