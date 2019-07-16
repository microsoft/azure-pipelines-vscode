import * as util from 'util';

import { AzureDevOpsClient } from '../../clients/devOps/azureDevOpsClient';
import { ServiceConnectionClient } from '../../clients/devOps/serviceConnectionClient';
import { Messages } from '../../messages';

export class ServiceConnectionHelper {
    private serviceConnectionClient: ServiceConnectionClient;

    public constructor(organizationName: string, projectName: string, azureDevOpsClient: AzureDevOpsClient) {
        this.serviceConnectionClient = new ServiceConnectionClient(organizationName, projectName, azureDevOpsClient);
    }

    public async createGitHubServiceConnection(name: string, gitHubPat: string): Promise<string> {
        let response = await this.serviceConnectionClient.createGitHubServiceConnection(name, gitHubPat);
        let endpointId: string = response.id;
        await this.waitForGitHubEndpointToBeReady(endpointId);
        await this.serviceConnectionClient.authorizeEndpointForAllPipelines(endpointId)
            .then((response) => {
                if (response.allPipelines.authorized !== true) {
                    throw new Error(Messages.couldNotAuthorizeEndpoint);
                }
            });

        return endpointId;
    }

    public async createAzureServiceConnection(name: string, tenantId: string, subscriptionId: string, scope?: string, ): Promise<string> {
        let response = await this.serviceConnectionClient.createAzureServiceConnection(name, tenantId, subscriptionId, scope);
        let endpointId = response.id;
        await this.waitForEndpointToBeReady(endpointId);
        await this.serviceConnectionClient.authorizeEndpointForAllPipelines(endpointId)
            .then((response) => {
                if (response.allPipelines.authorized !== true) {
                    throw new Error(Messages.couldNotAuthorizeEndpoint);
                }
            });

        return endpointId;
    }

    private async waitForEndpointToBeReady(endpointId: string): Promise<void> {
        let retryCount = 1;
        while (1) {
            let response = await this.serviceConnectionClient.getEndpointStatus(endpointId);
            let operationStatus = response.operationStatus;

            if (operationStatus.state.toLowerCase() === "ready") {
                break;
            }

            if (!(retryCount < 20) || operationStatus.state.toLowerCase() === "failed") {
                throw Error(util.format(Messages.unableToCreateAzureServiceConnection, operationStatus.state, operationStatus.statusMessage));
            }

            await this.sleepForMilliSeconds(2000);
            retryCount++;
        }
    }

    private async waitForGitHubEndpointToBeReady(endpointId: string): Promise<void> {
        let retryCount = 1;
        while (1) {
            let response = await this.serviceConnectionClient.getEndpointStatus(endpointId);
            let isReady: boolean = response.isReady;

            if (isReady === true) {
                break;
            }

            if (!(retryCount < 20)) {
                throw Error(util.format(Messages.unableToCreateGitHubServiceConnection, isReady));
            }

            await this.sleepForMilliSeconds(2000);
            retryCount++;
        }
    }

    private async sleepForMilliSeconds(timeInMs: number) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, timeInMs);
        });
    }
}
