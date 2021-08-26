import { Messages } from '../../resources/messages';
import { Organization } from '../../model/models';
import { ReservedHostNames } from '../../resources/constants';
import { RestClient } from '../restClient';
import { RequestPrepareOptions } from '@azure/ms-rest-js';
import { TokenCredentialsBase } from '@azure/ms-rest-nodeauth';
import { stringCompareFunction } from "../../helper/commonHelper";
import { telemetryHelper } from '../../../helpers/telemetryHelper';
import * as Q from 'q';
import * as util from 'util';

export class AzureDevOpsClient {
    private restClient: RestClient;
    private listOrgPromise: Promise<Organization[]>;

    constructor(credentials: TokenCredentialsBase) {
        this.restClient = new RestClient(credentials);
        this.listOrgPromise = this.listOrganizations();
    }

    public async sendRequest(requestPrepareOptions: RequestPrepareOptions): Promise<any> {
        if (requestPrepareOptions.headers) {
            requestPrepareOptions.headers['X-TFS-Session'] = telemetryHelper.getJourneyId();
        }
        else {
            requestPrepareOptions.headers = { 'X-TFS-Session': telemetryHelper.getJourneyId() };
        }

        return this.restClient.sendRequest(requestPrepareOptions);
    }

    public async createOrganization(organizationName: string): Promise<any> {
        return this.sendRequest({
            url: "https://app.vsaex.visualstudio.com/_apis/HostAcquisition/collections",
            headers: {
                "Content-Type": "application/json"
            },
            method: "POST",
            queryParameters: {
                "collectionName": organizationName,
                "api-version": "4.0-preview.1",
                "preferredRegion": "CUS"
            },
            deserializationMapper: null,
            serializationMapper: null
        });
    }

    public async listOrganizations(forceRefresh?: boolean): Promise<Organization[]> {
        if (!this.listOrgPromise || forceRefresh) {
            this.listOrgPromise = this.getUserData()
                .then((connectionData) => {
                    return this.sendRequest({
                        url: "https://app.vssps.visualstudio.com/_apis/accounts",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        method: "GET",
                        queryParameters: {
                            "memberId": connectionData.authenticatedUser.id,
                            "api-version": "5.0",
                        },
                        deserializationMapper: null,
                        serializationMapper: null
                    });
                })
                .then((organizations) => {
                    let organizationList: Array<Organization> = organizations.value;
                    organizationList = organizationList.sort((org1, org2) => stringCompareFunction(org1.accountName, org2.accountName));
                    return organizationList;
                });
        }

        return this.listOrgPromise;
    }

    public async validateOrganizationName(organizationName: string): Promise<string> {
        let deferred = Q.defer<string>();
        let accountNameRegex = new RegExp(/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$|^[a-zA-Z]$/);

        if (!organizationName || /^\\s/.test(organizationName) || /\\s$/.test(organizationName) || organizationName.indexOf("-") === 0 || !accountNameRegex.test(organizationName)) {
            deferred.resolve(Messages.organizationNameStaticValidationMessage);
        }
        else if (ReservedHostNames.indexOf(organizationName) >= 0) {
            deferred.resolve(util.format(Messages.organizationNameReservedMessage, organizationName));
        }
        else {
            let url = `https://app.vsaex.visualstudio.com/_apis/HostAcquisition/NameAvailability/${organizationName}`;

            this.sendRequest({
                url: url,
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "api-version=5.0-preview.1"
                },
                method: "GET",
                deserializationMapper: null,
                serializationMapper: null
            })
                .then((response) => {
                    if (response.name === organizationName && !response.isAvailable) {
                        deferred.resolve(util.format(Messages.organizationNameReservedMessage, organizationName));
                    }
                    deferred.resolve("");
                })
                .catch(() => {
                    deferred.resolve("");
                });
        }
        return deferred.promise;
    }

    public async getOrganizationIdFromName(organizationName: string) {
        let organization = (await this.listOrgPromise).find((org) => {
            return org.accountName.toLowerCase() === organizationName.toLowerCase();
        });

        if(!organizationName) {
            organization = (await this.listOrganizations(true)).find((org) => {
                return org.accountName.toLowerCase() === organizationName.toLowerCase();
            });

            if (!organization) {
                throw new Error(Messages.cannotFindOrganizationWithName);
            }
        }

        return organization.accountId;
    }

    private async getUserData(): Promise<any> {
        try {
            return this.getConnectionData();
        } catch {
            await this.createUserProfile();
            return await this.getConnectionData();
        }
    }

    private getConnectionData(): Promise<any> {
        return this.sendRequest({
            url: "https://app.vssps.visualstudio.com/_apis/connectiondata",
            headers: {
                "Content-Type": "application/json"
            },
            method: "GET",
            deserializationMapper: null,
            serializationMapper: null
        });
    }

    private createUserProfile(): Promise<any> {
        return this.sendRequest({
            url: "https://app.vssps.visualstudio.com/_apis/_AzureProfile/CreateProfile",
            headers: {
                "Content-Type": "application/json"
            },
            method: "POST",
            deserializationMapper: null,
            serializationMapper: null
        });
    }
}
