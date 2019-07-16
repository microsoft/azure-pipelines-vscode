import { ResourceListResult, GenericResource } from 'azure-arm-resource/lib/resource/models';
import { ServiceClientCredentials } from 'ms-rest';

import { AzureResourceClient } from './azureResourceClient';
import { Messages } from '../../messages';
import { WebAppKind } from '../../model/models';

export class AppServiceClient extends AzureResourceClient {

    private static apiVersion = '2019-05-01';
    private static resourceType = 'Microsoft.Web/sites';
    constructor(credentials: ServiceClientCredentials, subscriptionId: string) {
        super(credentials, subscriptionId);
    }

    public async getAppServiceResource(resourceId): Promise<GenericResource> {
        if (!resourceId) {
            throw new Error(Messages.resourceIdMissing);
        }

        return await this.getResource(resourceId, AppServiceClient.apiVersion);
    }

    public async GetAppServices(filterForResourceKind: WebAppKind): Promise<ResourceListResult> {
        let resourceList: ResourceListResult = await this.getResourceList(AppServiceClient.resourceType);

        if (!!filterForResourceKind) {
            let filteredResourceList: ResourceListResult = [];
            resourceList.forEach((resource) => {
                if (resource.kind === filterForResourceKind) {
                    filteredResourceList.push(resource);
                }
            });

            resourceList = filteredResourceList;
        }

        return resourceList;
    }
}
