import { Build, BuildDefinition } from '../../model/azureDevOps';
import { Messages } from '../../resources/messages';
import { DevOpsProject, Organization } from '../../model/models';
import { AzureDevOpsBaseUrl, ReservedHostNames } from '../../resources/constants';
import { RestClient } from '../restClient';
import { ServiceClientCredentials, UrlBasedRequestPrepareOptions } from 'ms-rest';
import { sleepForMilliSeconds, stringCompareFunction } from "../../helper/commonHelper";
import { telemetryHelper } from '../../helper/telemetryHelper';
import * as Q from 'q';
import * as util from 'util';

export class AzureDevOpsClient {
    private restClient: RestClient;
    private listOrgPromise: Promise<Organization[]>;

    constructor(credentials: ServiceClientCredentials) {
        this.restClient = new RestClient(credentials);
        this.listOrgPromise = this.listOrganizations();
    }

    public async sendRequest(urlBasedRequestPrepareOptions: UrlBasedRequestPrepareOptions, isMsaPassthrough?: boolean): Promise<any> {
        if (urlBasedRequestPrepareOptions.headers) {
            urlBasedRequestPrepareOptions.headers['X-TFS-Session'] = telemetryHelper.getJourneyId();
        }
        else {
            urlBasedRequestPrepareOptions.headers = { 'X-TFS-Session': telemetryHelper.getJourneyId() };
        }

        if (isMsaPassthrough) {
            urlBasedRequestPrepareOptions.headers['X-VSS-ForceMsaPassThrough'] = true;
        }

        return this.restClient.sendRequest(urlBasedRequestPrepareOptions);
    }

    public async sendRequestWithMsaOrgCheck(urlBasedRequestPrepareOptions: UrlBasedRequestPrepareOptions, orgName: string): Promise<any> {
        let isMsaPassthrough: boolean = false;
        if (orgName) {
            isMsaPassthrough = (await this.getOrganizationByName(orgName)).isMSAOrg;
        }

        return this.sendRequest(urlBasedRequestPrepareOptions, isMsaPassthrough);
    }

    public async createOrganization(organizationName: string): Promise<any> {
        return this.sendRequest(<UrlBasedRequestPrepareOptions>{
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

        return this.sendRequest(<UrlBasedRequestPrepareOptions>{
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
            this.listOrgPromise = new Promise<Organization[]>(async (resolve) => {
                let [aadUserConnection, msaUserConnection] = await Promise.all([this.getUserData(false), this.getUserData(true)]);
                let [nonMsaOrgs, msaOrgs] = await Promise.all([this.listOrgsInternal(aadUserConnection, false)
                    , this.listOrgsInternal(msaUserConnection, true)]);
                resolve(nonMsaOrgs.concat(msaOrgs));
            });
        }

        return this.listOrgPromise;
    }

    public async listProjects(organizationName: string): Promise<Array<DevOpsProject>> {
        let url = `${AzureDevOpsBaseUrl}/${organizationName}/_apis/projects`;

        let response = await this.sendRequestWithMsaOrgCheck(<UrlBasedRequestPrepareOptions>{
            url: url,
            headers: {
                "Content-Type": "application/json"
            },
            method: "GET",
            queryParameters: {
                "includeCapabilities": "true"
            },
            deserializationMapper: null,
            serializationMapper: null
        }, organizationName);

        let projects: Array<DevOpsProject> = [];
        if (response.value && response.value.length > 0) {
            projects = response.value.map((project) => {
                return { id: project.id, name: project.name };
            });
            projects = projects.sort((proj1, proj2) => stringCompareFunction(proj1.name, proj2.name));
        }
        return projects;
    }

    public async getRepository(organizationName: string, projectName: string, repositoryName: string): Promise<any> {
        let url = `${AzureDevOpsBaseUrl}/${organizationName}/${projectName}/_apis/git/repositories/${repositoryName}`;

        return this.sendRequestWithMsaOrgCheck(<UrlBasedRequestPrepareOptions>{
            url: url,
            headers: {
                "Content-Type": "application/json",
            },
            method: "GET",
            queryParameters: {
                "api-version": "5.0"
            },
            deserializationMapper: null,
            serializationMapper: null
        }, organizationName);
    }

    public async createBuildDefinition(organizationName: string, buildDefinition: BuildDefinition): Promise<any> {
        let url = `${AzureDevOpsBaseUrl}/${organizationName}/${buildDefinition.project.id}/_apis/build/definitions`;

        return this.sendRequestWithMsaOrgCheck(<UrlBasedRequestPrepareOptions>{
            url: url,
            method: "POST",
            headers: {
                "Accept": "application/json;api-version=5.0-preview.7;"
            },
            body: buildDefinition,
            serializationMapper: null,
            deserializationMapper: null
        }, organizationName);
    }

    public async queueBuild(organizationName: string, build: Build): Promise<any> {
        let url = `${AzureDevOpsBaseUrl}/${organizationName}/${build.project.id}/_apis/build/builds`;

        return this.sendRequestWithMsaOrgCheck(<UrlBasedRequestPrepareOptions>{
            url: url,
            method: "POST",
            headers: {
                "Accept": "application/json;api-version=5.2-preview.5;"
            },
            body: build,
            serializationMapper: null,
            deserializationMapper: null
        }, organizationName);
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

            this.sendRequest(<UrlBasedRequestPrepareOptions>{
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

        return this.sendRequestWithMsaOrgCheck(<UrlBasedRequestPrepareOptions>{
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
        }, organizationName)
            .then((project) => {
                return project && project.id;
            });
    }

    public async getOrganizationByName(orgName: string, force?: boolean): Promise<Organization> {
        let organizations = await this.listOrgPromise;
        let organization: Organization = organizations.find(o => o.accountName.toLowerCase() === orgName.toLowerCase());
        if (!organization) {
            throw new Error(Messages.noOrgFoundByName);
        }

        return organization;
    }

    private async listOrgsInternal(connectionData: any, isMsaPassthrough: boolean): Promise<Array<Organization>> {
        return this.sendRequest(<UrlBasedRequestPrepareOptions>{
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
        }, isMsaPassthrough)
            .then((organizations) => {
                let organizationList: Array<Organization> = organizations.value.map((org: Organization) =>
                    <Organization>{ ...org, isMSAOrg: isMsaPassthrough });
                organizationList = organizationList.sort((org1, org2) => stringCompareFunction(org1.accountName, org2.accountName));
                return organizationList;
            });
    }

    private async getUserData(isMsaPassthrough: boolean): Promise<any> {
        try {
            return await this.getConnectionData(isMsaPassthrough);
        } catch (error) {
            await this.createUserProfile(isMsaPassthrough);
            return await this.getConnectionData(isMsaPassthrough);
        }
    }

    private async getConnectionData(isMsaPassthrough: boolean): Promise<any> {
        return this.sendRequest(<UrlBasedRequestPrepareOptions>{
            url: "https://app.vssps.visualstudio.com/_apis/connectiondata",
            headers: {
                "Content-Type": "application/json"
            },
            method: "GET",
            deserializationMapper: null,
            serializationMapper: null
        }, isMsaPassthrough);
    }

    private async createUserProfile(isMsaPassthrough: boolean): Promise<any> {
        return this.sendRequest(<UrlBasedRequestPrepareOptions>{
            url: "https://app.vssps.visualstudio.com/_apis/_AzureProfile/CreateProfile",
            headers: {
                "Content-Type": "application/json"
            },
            method: "POST",
            deserializationMapper: null,
            serializationMapper: null
        }, isMsaPassthrough);
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
        return this.sendRequest(<UrlBasedRequestPrepareOptions>{
            url: operationUrl,
            queryParameters: {
                "api-version": "5.0"
            },
            method: "GET",
            deserializationMapper: null,
            serializationMapper: null
        });
    }

    public async getAgentQueues(organizationName: string, projectName: string): Promise<Array<any>> {
        let url = `${AzureDevOpsBaseUrl}/${organizationName}/${projectName}/_apis/distributedtask/queues`;
        let organization = await this.getOrganizationByName(organizationName);

        return this.sendRequest(<UrlBasedRequestPrepareOptions>{
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
        }, organization.isMSAOrg)
            .then((response) => {
                return response.value;
            });
    }
}
