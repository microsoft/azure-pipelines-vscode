import { UrlBasedRequestPrepareOptions } from 'ms-rest';

import { AzureDevOpsClient } from './azureDevOpsClient';

export class ServiceConnectionClient {
    private static serviceType = 'tfs';
    private azureDevOpsClient: AzureDevOpsClient;
    private organizationName: string;
    private projectName: string;

    constructor(organizationName: string, projectName: string, azureDevOpsClient: AzureDevOpsClient) {
        this.azureDevOpsClient = azureDevOpsClient;
        this.organizationName = organizationName;
        this.projectName = projectName;
    }

    public async createGitHubServiceConnection(endpointName: string, gitHubPat: string) {
        return this.azureDevOpsClient.sendRequest(<UrlBasedRequestPrepareOptions>
            {
                url: this.azureDevOpsClient.getBaseOrgUrl(this.organizationName, ServiceConnectionClient.serviceType) + `/${this.projectName}/_apis/serviceendpoint/endpoints`,
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json;api-version=5.1-preview.2;excludeUrls=true"
                },
                method: "POST",
                body: {
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
                },
                deserializationMapper: null,
                serializationMapper: null
            });
    }

    public async createAzureServiceConnection(endpointName: string, tenantId: string, subscriptionId: string, scope?: string, ): Promise<any> {
        return this.azureDevOpsClient.sendRequest(<UrlBasedRequestPrepareOptions>{
            url: this.azureDevOpsClient.getBaseOrgUrl(this.organizationName, ServiceConnectionClient.serviceType) + `/${this.projectName}/_apis/serviceendpoint/endpoints`,
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json;api-version=5.1-preview.2;excludeUrls=true"
            },
            method: "POST",
            body: {
                "administratorsGroup": null,
                "authorization": {
                    "parameters": {
                        "authenticationType": "spnKey",
                        "scope": scope,
                        "serviceprincipalid": "",
                        "serviceprincipalkey": "",
                        "tenantid": tenantId
                    },
                    "scheme": "ServicePrincipal"
                },
                "data": {
                    "appObjectId": "",
                    "azureSpnPermissions": "",
                    "azureSpnRoleAssignmentId": "",
                    "creationMode": "Automatic",
                    "environment": "AzureCloud",
                    "scopeLevel": "Subscription",
                    "spnObjectId": "",
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
            },
            deserializationMapper: null,
            serializationMapper: null
        });
    }

    public async getEndpointStatus(endpointId: string): Promise<any> {
        return this.azureDevOpsClient.sendRequest(<UrlBasedRequestPrepareOptions>{
            url: this.azureDevOpsClient.getBaseOrgUrl(this.organizationName, ServiceConnectionClient.serviceType) + `/${this.projectName}/_apis/serviceendpoint/endpoints/${endpointId}`,
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json;api-version=5.1-preview.2;excludeUrls=true"
            },
            method: "Get", 
            deserializationMapper: null,
            serializationMapper: null
        });
    }

    public async authorizeEndpointForAllPipelines(endpointId: string): Promise<any> {
        return this.azureDevOpsClient.sendRequest(<UrlBasedRequestPrepareOptions>{
            url: this.azureDevOpsClient.getBaseOrgUrl(this.organizationName, ServiceConnectionClient.serviceType) + `${this.projectName}/_apis/pipelines/pipelinePermissions/endpoint/${endpointId}`,
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json;api-version=5.1-preview.1;excludeUrls=true;enumsAsNumbers=true;msDateFormat=true;noArrayWrap=true"
            },
            method: "PATCH",
            body: {
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
            },
            deserializationMapper: null,
            serializationMapper: null
        });
    }

}
