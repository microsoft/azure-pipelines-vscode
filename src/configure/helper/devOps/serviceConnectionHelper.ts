import * as azdev from 'azure-devops-node-api';
import * as util from 'util';

import { sleepForMilliSeconds } from '../commonHelper';
import { ServiceConnectionClient } from '../../clients/devOps/serviceConnectionClient';
import { AadApplication } from '../../model/models';
import { Messages } from '../../../messages';

export class ServiceConnectionHelper {
    private serviceConnectionClient: ServiceConnectionClient;

    public constructor(organizationName: string, projectName: string, connection: azdev.WebApi) {
        this.serviceConnectionClient = new ServiceConnectionClient(organizationName, projectName, connection);
    }

    public async createGitHubServiceConnection(name: string, gitHubPat: string): Promise<string> {
        const response = await this.serviceConnectionClient.createGitHubServiceConnection(name, gitHubPat);
        const endpointId: string = response.result.id;
        await this.waitForEndpointToBeReady(endpointId);
        const authorizationResponse = await this.serviceConnectionClient.authorizeEndpointForAllPipelines(endpointId);
        if (authorizationResponse.result.allPipelines.authorized !== true) {
            throw new Error(Messages.couldNotAuthorizeEndpoint);
        }

        return endpointId;
    }

    public async createAzureServiceConnection(name: string, tenantId: string, subscriptionId: string, scope: string, aadApp: AadApplication): Promise<string> {
        const response = await this.serviceConnectionClient.createAzureServiceConnection(name, tenantId, subscriptionId, scope, aadApp);
        const endpointId: string = response.result.id;
        await this.waitForEndpointToBeReady(endpointId);
        const authorizationResponse = await this.serviceConnectionClient.authorizeEndpointForAllPipelines(endpointId);
        if (authorizationResponse.result.allPipelines.authorized !== true) {
            throw new Error(Messages.couldNotAuthorizeEndpoint);
        }

        return endpointId;
    }

    private async waitForEndpointToBeReady(endpointId: string): Promise<void> {
        for (let attempt = 0; attempt < 30; attempt++) {
            const response = await this.serviceConnectionClient.getEndpointStatus(endpointId);
            const operationStatus = response.result.operationStatus;

            if (response.result.isReady) {
                return;
            }

            if (operationStatus?.state.toLowerCase() === "failed") {
                throw Error(util.format(Messages.unableToCreateServiceConnection, response.result.type, operationStatus.state, operationStatus.statusMessage));
            }

            await sleepForMilliSeconds(2000);
        }

        throw Error(util.format(Messages.timedOutCreatingServiceConnection));
    }
}
