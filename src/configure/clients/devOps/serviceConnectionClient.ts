import * as azdev from 'azure-devops-node-api';
import { AadApplication } from '../../model/models';

// Definitive interface at https://github.com/microsoft/azure-devops-node-api/blob/master/api/interfaces/ServiceEndpointInterfaces.ts,
// but it isn't exported :(.
interface ServiceConnection {
    allPipelines: {
        authorized: boolean;
    }
    id: string;
    isReady: boolean;
    type: string;
    operationStatus: {
        state: string;
        statusMessage: string;
    };
}

export class ServiceConnectionClient {
    constructor(private connection: azdev.WebApi, private project: string) {
    }

    public async createGitHubServiceConnection(endpointName: string, gitHubPat: string): Promise<ServiceConnection> {
        const url = `${this.connection.serverUrl}/${this.project}/_apis/serviceendpoint/endpoints`;

        const response = await this.connection.rest.create<ServiceConnection>(url, {
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

        if (response.result) {
            return response.result;
        } else {
            throw new Error(`Failed to create GitHub service connection: ${response.statusCode}`);
        }
    }

    public async createAzureServiceConnection(endpointName: string, tenantId: string, subscriptionId: string, scope: string, aadApp: AadApplication): Promise<ServiceConnection> {
        const url = `${this.connection.serverUrl}/${this.project}/_apis/serviceendpoint/endpoints`;

        const response = await this.connection.rest.create<ServiceConnection>(url, {
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

        if (response.result) {
            return response.result;
        } else {
            throw new Error(`Failed to create Azure service connection: ${response.statusCode}`);
        }
    }

    public async getEndpointStatus(endpointId: string): Promise<ServiceConnection> {
        const url = `${this.connection.serverUrl}/${this.project}/_apis/serviceendpoint/endpoints/${endpointId}`;

        const response = await this.connection.rest.get<ServiceConnection>(url, {
            acceptHeader: "application/json;api-version=5.1-preview.2;excludeUrls=true",
            additionalHeaders: {
                "Content-Type": "application/json",
            },
        });

        if (response.result) {
            return response.result;
        } else {
            throw new Error(`Failed to get service connection status: ${response.statusCode}`);
        }
    }

    // TODO: Authorize individual pipelines instead of all pipelines.
    public async authorizeEndpointForAllPipelines(endpointId: string): Promise<ServiceConnection> {
        const url = `${this.connection.serverUrl}/${this.project}/_apis/pipelines/pipelinePermissions/endpoint/${endpointId}`;

        const response = await this.connection.rest.update<ServiceConnection>(url, {
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

        if (response.result) {
            return response.result;
        } else {
            throw new Error(`Failed to authorize service connection: ${response.statusCode}`);
        }
    }
}
