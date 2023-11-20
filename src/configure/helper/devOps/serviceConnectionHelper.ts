import * as azdev from 'azure-devops-node-api';
import * as util from 'util';

import { sleepForMilliSeconds } from '../commonHelper';
import { ServiceConnectionClient } from '../../clients/devOps/serviceConnectionClient';
import { AadApplication } from '../../model/models';
import * as Messages from '../../../messages';

export class ServiceConnectionHelper {
    private serviceConnectionClient: ServiceConnectionClient;

    public constructor(connection: azdev.WebApi, project: string) {
        this.serviceConnectionClient = new ServiceConnectionClient(connection, project);
    }

    public async createGitHubServiceConnection(name: string, gitHubPat: string): Promise<string> {
        const connection = await this.serviceConnectionClient.createGitHubServiceConnection(name, gitHubPat);
        const endpointId = connection.id;
        await this.waitForEndpointToBeReady(endpointId);
        const authorizationResponse = await this.serviceConnectionClient.authorizeEndpointForAllPipelines(endpointId);
        if (!authorizationResponse.allPipelines.authorized) {
            throw new Error(Messages.couldNotAuthorizeEndpoint);
        }

        return endpointId;
    }

    public async createAzureServiceConnection(name: string, tenantId: string, subscriptionId: string, scope: string, aadApp: AadApplication): Promise<string> {
        const connection = await this.serviceConnectionClient.createAzureServiceConnection(name, tenantId, subscriptionId, scope, aadApp);
        const endpointId: string = connection.id;
        await this.waitForEndpointToBeReady(endpointId);
        const authorizationResponse = await this.serviceConnectionClient.authorizeEndpointForAllPipelines(endpointId);
        if (!authorizationResponse.allPipelines.authorized) {
            throw new Error(Messages.couldNotAuthorizeEndpoint);
        }

        return endpointId;
    }

    private async waitForEndpointToBeReady(endpointId: string): Promise<void> {
        for (let attempt = 0; attempt < 30; attempt++) {
            const connection = await this.serviceConnectionClient.getEndpointStatus(endpointId);

            if (connection.isReady) {
                return;
            }

            const { operationStatus } = connection;
            if (operationStatus.state.toLowerCase() === "failed") {
                throw Error(util.format(Messages.unableToCreateServiceConnection, connection.type, operationStatus.state, operationStatus.statusMessage));
            }

            await sleepForMilliSeconds(2000);
        }

        throw Error(util.format(Messages.timedOutCreatingServiceConnection));
    }
}
