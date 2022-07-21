import { RequestPrepareOptions } from '@azure/ms-rest-js';
import { TokenCredentialsBase } from '@azure/ms-rest-nodeauth';
import { ConnectionData } from 'azure-devops-node-api/interfaces/LocationsInterfaces';
import * as util from 'util';

import { RestClient } from '../restClient';
import { Organization, OrganizationAvailability } from '../../model/models';
import { ReservedHostNames } from '../../resources/constants';
import { Messages } from '../../../messages';
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

    public async createOrganization(organizationName: string): Promise<void> {
        return this.sendRequest({
            url: "https://app.vsaex.visualstudio.com/_apis/HostAcquisition/collections",
            headers: {
                "Content-Type": "application/json"
            },
            method: "POST",
            queryParameters: {
                "collectionName": organizationName,
                "api-version": "5.0-preview.2",
                "preferredRegion": "CUS"
            },
        });
    }

    public async listOrganizations(forceRefresh?: boolean): Promise<Organization[]> {
        if (this.organizations && !forceRefresh) {
            return this.organizations;
        }

        const connectionData = await this.getUserData();
        const response = await this.sendRequest<{ value: Organization[] }>({
            url: "https://app.vssps.visualstudio.com/_apis/accounts",
            headers: {
                "Content-Type": "application/json"
            },
            method: "GET",
            queryParameters: {
                "memberId": connectionData.authenticatedUser.id,
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

    public async validateOrganizationName(organizationName: string): Promise<string> {
        let accountNameRegex = new RegExp(/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$|^[a-zA-Z]$/);

        if (!organizationName || /^\\s/.test(organizationName) || /\\s$/.test(organizationName) || organizationName.indexOf("-") === 0 || !accountNameRegex.test(organizationName)) {
            return Messages.organizationNameStaticValidationMessage;
        } else if (ReservedHostNames.indexOf(organizationName) >= 0) {
            return util.format(Messages.organizationNameReservedMessage, organizationName);
        } else {
            const url = `https://app.vsaex.visualstudio.com/_apis/HostAcquisition/NameAvailability/${organizationName}`;

            try {
                const response = await this.sendRequest<OrganizationAvailability>({
                    url,
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "api-version=5.0-preview.1"
                    },
                    method: "GET",
                });

                if (response.name === organizationName && !response.isAvailable) {
                    return util.format(Messages.organizationNameReservedMessage, organizationName);
                }
                return "";
            } catch (e) {
                return "";
            }
        }
    }

    public async getOrganizationIdFromName(organizationName: string) {
        let organizations = await this.listOrganizations();
        let organization = organizations.find((org) => {
            return org.accountName.toLowerCase() === organizationName.toLowerCase();
        });

        if(!organizationName) {
            organizations = await this.listOrganizations(true);
            organization = organizations.find((org) => {
                return org.accountName.toLowerCase() === organizationName.toLowerCase();
            });

            if (!organization) {
                throw new Error(Messages.cannotFindOrganizationWithName);
            }
        }

        return organization.accountId;
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
