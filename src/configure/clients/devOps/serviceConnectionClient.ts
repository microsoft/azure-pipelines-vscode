import * as azdev from 'azure-devops-node-api';
import { AadApplication } from '../../model/models';
import { AzureDevOpsBaseUrl } from "../../resources/constants";

export class ServiceConnectionClient {
    private connection: azdev.WebApi;
    private organizationName: string;
    private projectName: string;

    constructor(organizationName: string, projectName: string, connection: azdev.WebApi) {
        this.connection = connection;
        this.organizationName = organizationName;
        this.projectName = projectName;
    }

    public async createGitHubServiceConnection(endpointName: string, gitHubPat: string): Promise<any> {
        const url = `${AzureDevOpsBaseUrl}/${this.organizationName}/${this.projectName}/_apis/serviceendpoint/endpoints`;

        return this.connection.rest.create(url, {
            "administratorsGroup": null,
            "authorization": {
                "parameters": {
                    "accessToken": gitHubPat
                },
                "scheme": "PersonalAccessToken"
            },
            "description": "",
            "groupScopeId": null,
            "name": endpointName,
            "operationStatus": null,
            "readersGroup": null,
            "type": "github",
            "url": "http://github.com"
        }, {
            acceptHeader: "application/json;api-version=5.1-preview.2;excludeUrls=true",
            additionalHeaders: {
                "Content-Type": "application/json",
            },
        });
    }

    public async createAzureServiceConnection(endpointName: string, tenantId: string, subscriptionId: string, scope: string, aadApp: AadApplication): Promise<any> {
        const url = `${AzureDevOpsBaseUrl}/${this.organizationName}/${this.projectName}/_apis/serviceendpoint/endpoints`;

        return this.connection.rest.create(url, {
            "administratorsGroup": null,
            "authorization": {
                "parameters": {
                    "authenticationType": "spnKey",
                    "scope": scope,
                    "serviceprincipalid": aadApp.appId,
                    "serviceprincipalkey": aadApp.secret,
                    "tenantid": tenantId
                },
                "scheme": "ServicePrincipal"
            },
            "data": {
                "creationMode": "Manual",
                "subscriptionId": subscriptionId,
                "subscriptionName": subscriptionId
            },
            "description": "",
            "groupScopeId": null,
            "name": endpointName,
            "operationStatus": null,
            "readersGroup": null,
            "type": "azurerm",
            "url": "https://management.azure.com/"
        }, {
            acceptHeader: "application/json;api-version=5.1-preview.2;excludeUrls=true",
            additionalHeaders: {
                "Content-Type": "application/json",
            },
        });
    }

    public async getEndpointStatus(endpointId: string): Promise<any> {
        const url = `${AzureDevOpsBaseUrl}/${this.organizationName}/${this.projectName}/_apis/serviceendpoint/endpoints/${endpointId}`;

        return this.connection.rest.get(url, {
            acceptHeader: "application/json;api-version=5.1-preview.2;excludeUrls=true",
            additionalHeaders: {
                "Content-Type": "application/json",
            },
        });
    }

    public async authorizeEndpointForAllPipelines(endpointId: string): Promise<any> {
        const url = `${AzureDevOpsBaseUrl}/${this.organizationName}/${this.projectName}/_apis/pipelines/pipelinePermissions/endpoint/${endpointId}`;

        return this.connection.rest.update(url, {
            "allPipelines": {
                "authorized": true,
                "authorizedBy": null,
                "authorizedOn": null
            },
            "pipelines": null,
            "resource": {
                "id": endpointId,
                "type": "endpoint"
            }
        }, {
            acceptHeader: "application/json;api-version=5.1-preview.1;excludeUrls=true;enumsAsNumbers=true;msDateFormat=true;noArrayWrap=true",
            additionalHeaders: {
                "Content-Type": "application/json",
            },
        });
    }
}
