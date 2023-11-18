import { RequestPrepareOptions } from '@azure/ms-rest-js';
import { TokenCredentialsBase } from '@azure/ms-rest-nodeauth';
import { ConnectionData } from 'azure-devops-node-api/interfaces/LocationsInterfaces';

import { RestClient } from '../restClient';
import { Organization } from '../../model/models';
import { telemetryHelper } from '../../../helpers/telemetryHelper';

export class OrganizationsClient {
    private restClient: RestClient;
    private organizations?: Organization[];

    constructor(credentials: TokenCredentialsBase) {
        this.restClient = new RestClient(credentials);
    }

    public async sendRequest<T>(requestPrepareOptions: RequestPrepareOptions): Promise<T> {
        if (requestPrepareOptions.headers) {
            requestPrepareOptions.headers['X-TFS-Session'] = telemetryHelper.getJourneyId();
        }
        else {
            requestPrepareOptions.headers = { 'X-TFS-Session': telemetryHelper.getJourneyId() };
        }

        return this.restClient.sendRequest<T>(requestPrepareOptions);
    }

    public async listOrganizations(forceRefresh?: boolean): Promise<Organization[]> {
        if (this.organizations && !forceRefresh) {
            return this.organizations;
        }

        const { authenticatedUser } = await this.getUserData();
        if (authenticatedUser === undefined) {
            return [];
        }

        const response = await this.sendRequest<{ value: Organization[] }>({
            url: "https://app.vssps.visualstudio.com/_apis/accounts",
            headers: {
                "Content-Type": "application/json"
            },
            method: "GET",
            queryParameters: {
                "memberId": authenticatedUser.id,
                "api-version": "7.0",
            },
        });

        this.organizations = response.value.sort((org1, org2) => {
            const account1 = org1.accountName.toLowerCase();
            const account2 = org2.accountName.toLowerCase();
            if (account1 < account2) {
                return -1;
            } else if (account1 > account2) {
                return 1;
            }
            return 0;
        });

        return this.organizations;
    }

    private async getUserData(): Promise<ConnectionData> {
        try {
            return this.getConnectionData();
        } catch {
            await this.createUserProfile();
            return this.getConnectionData();
        }
    }

    private getConnectionData(): Promise<ConnectionData> {
        return this.sendRequest({
            url: "https://app.vssps.visualstudio.com/_apis/connectiondata",
            headers: {
                "Content-Type": "application/json"
            },
            method: "GET",
        });
    }

    // TODO: Need to verify this signature
    private createUserProfile(): Promise<void> {
        return this.sendRequest({
            url: "https://app.vssps.visualstudio.com/_apis/_AzureProfile/CreateProfile",
            headers: {
                "Content-Type": "application/json"
            },
            method: "POST",
        });
    }
}
