import { ResourceListResult, GenericResource } from 'azure-arm-resource/lib/resource/models';
import { ServiceClientCredentials } from 'ms-rest';
import * as ResourceManagementClient from 'azure-arm-resource/lib/resource/resourceManagementClient';
import { TargetResourceType, WebAppKind } from '../../model/models';
import * as utils from 'util';
import { Messages } from '../../resources/messages';

export class AzureResourceClient {

    private azureRmClient: ResourceManagementClient.ResourceManagementClient;

    constructor(credentials: ServiceClientCredentials, subscriptionId: string) {
        this.azureRmClient = new ResourceManagementClient.ResourceManagementClient(credentials, subscriptionId);
    }

    public static validateTargetResourceType(resource: GenericResource): void {
        if (!resource) {
            throw new Error(Messages.azureResourceIsNull);
        }

        switch (resource.type.toLowerCase()) {
            case TargetResourceType.WebApp.toLowerCase():
                switch (resource.kind ? resource.kind.toLowerCase() : '') {
                    case WebAppKind.WindowsApp:
                    case WebAppKind.LinuxApp:
                        return;
                    case WebAppKind.FunctionApp:
                    case WebAppKind.LinuxContainerApp:
                    default:
                        throw new Error(utils.format(Messages.appKindIsNotSupported, resource.kind));
                }
            default:
                throw new Error(utils.format(Messages.resourceTypeIsNotSupported, resource.type));
        }
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
