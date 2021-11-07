import { Build, BuildDefinition } from '../../model/azureDevOps';
import { Messages } from '../../resources/messages';
import { Organization } from '../../model/models';
import { AzureDevOpsBaseUrl, ReservedHostNames } from '../../resources/constants';
import { RestClient } from '../restClient';
import { RequestPrepareOptions } from '@azure/ms-rest-js';
import { TokenCredentialsBase } from '@azure/ms-rest-nodeauth';
import { sleepForMilliSeconds, stringCompareFunction } from "../../helper/commonHelper";
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

    public async createProject(organizationName: string, projectName: string): Promise<any> {
        let collectionUrl = `https://dev.azure.com/${organizationName}`;

        return this.sendRequest({
            url: `${collectionUrl}/_apis/projects`,
            headers: {
                "Content-Type": "application/json"
            },
            method: "POST",
            queryParameters: {
                "api-version": "5.0"
            },
            body: {
                "name": projectName,
                "visibility": 0,
                "capabilities": {
                    "versioncontrol": { "sourceControlType": "Git" },
                    "processTemplate": { "templateTypeId": "adcc42ab-9882-485e-a3ed-7678f01f66bc" }
                }
            },
            deserializationMapper: null,
            serializationMapper: null
        })
            .then((operation) => {
                if (operation.url) {
                    return this.monitorOperationStatus(operation.url);
                }
                else {
                    throw new Error(util.format(Messages.failedToCreateAzureDevOpsProject, operation.message));
                }
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
                            "properties": "Microsoft.VisualStudio.Services.Account.ServiceUrl.00025394-6065-48ca-87d9-7f5672854ef7"
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

    public async createBuildDefinition(organizationName: string, buildDefinition: BuildDefinition): Promise<any> {
        let url = `${AzureDevOpsBaseUrl}/${organizationName}/${buildDefinition.project.id}/_apis/build/definitions`;

        return this.sendRequest({
            url: url,
            method: "POST",
            headers: {
                "Accept": "application/json;api-version=5.0-preview.7;"
            },
            body: buildDefinition,
            serializationMapper: null,
            deserializationMapper: null
        });
    }

    public async queueBuild(organizationName: string, build: Build): Promise<any> {
        let url = `${AzureDevOpsBaseUrl}/${organizationName}/${build.project.id}/_apis/build/builds`;

        return this.sendRequest({
            url: url,
            method: "POST",
            headers: {
                "Accept": "application/json;api-version=5.2-preview.5;"
            },
            body: build,
            serializationMapper: null,
            deserializationMapper: null
        });
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

    public async getProjectIdFromName(organizationName: string, projectName: string): Promise<string> {
        let url = `${AzureDevOpsBaseUrl}/${organizationName}/_apis/projects/${projectName}`;

        return this.sendRequest({
            url: url,
            method: "GET",
            headers: {
                "Accept": "application/json;api-version=5.2-preview.5;"
            },
            queryParameters: {
                "api-version": "5.0",
                "includeCapabilities": false
            },
            serializationMapper: null,
            deserializationMapper: null
        })
            .then((project) => {
                return project && project.id;
            });
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

    public getOldFormatBuildDefinitionUrl(accountName: string, projectName: string, buildDefinitionId: number) {
        return `https://${accountName}.visualstudio.com/${projectName}/_build?definitionId=${buildDefinitionId}&_a=summary`;
    }

    public getOldFormatBuildUrl(accountName: string, projectName: string, buildId: string) {
        return `https://${accountName}.visualstudio.com/${projectName}/_build/results?buildId=${buildId}&view=results`;
    }

    private getUserData(): Promise<any> {
        return this.getConnectionData()
            .catch(() => {
                return this.createUserProfile()
                    .then(() => {
                        return this.getConnectionData();
                    });
            });
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

    private async monitorOperationStatus(operationUrl: string): Promise<void> {
        let retryCount = 0;
        let operationResult: any;

        while (retryCount < 30) {
            operationResult = await this.getOperationResult(operationUrl);
            let result = operationResult.status.toLowerCase();
            if (result === "succeeded") {
                return;
            }
            else if (result === "failed") {
                throw new Error(util.format(Messages.failedToCreateAzureDevOpsProject, operationResult.detailedMessage));
            }
            else {
                retryCount++;
                await sleepForMilliSeconds(2000);
            }
        }
        throw new Error(util.format(Messages.failedToCreateAzureDevOpsProject,
            (operationResult && operationResult.detailedMessage) || Messages.operationTimedOut));
    }

    private async getOperationResult(operationUrl: string): Promise<any> {
        return this.sendRequest({
            url: operationUrl,
            queryParameters: {
                "api-version": "5.0"
            },
            method: "GET",
            deserializationMapper: null,
            serializationMapper: null
        });
    }

    public getAgentQueues(organizationName: string, projectName: string): Promise<Array<any>> {
        let url = `${AzureDevOpsBaseUrl}/${organizationName}/${projectName}/_apis/distributedtask/queues`;

        return this.sendRequest({
            url: url,
            method: "GET",
            headers: {
                "Accept": "application/json;"
            },
            queryParameters: {
                "api-version": "5.1-preview.1"
            },
            serializationMapper: null,
            deserializationMapper: null
        })
            .then((response) => {
                return response.value;
            });
    }
}
