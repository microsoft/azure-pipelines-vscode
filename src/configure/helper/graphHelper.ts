const uuid = require('uuid/v1');
import { AzureEnvironment } from 'ms-rest-azure';
import { AzureSession, Token, AadApplication } from '../model/models';
import { generateRandomPassword, executeFunctionWithRetry } from './commonHelper';
import { Messages } from '../resources/messages';
import { RestClient } from '../clients/restClient';
import { TokenCredentials, UrlBasedRequestPrepareOptions, ServiceClientCredentials } from 'ms-rest';
import { TokenResponse, MemoryCache, AuthenticationContext } from 'adal-node';
import * as util from 'util';

export class GraphHelper {

    private static contributorRoleId = "b24988ac-6180-42a0-ab88-20f7382dd24c";
    private static retryTimeIntervalInSec = 2;
    private static retryCount = 20;

    public static async createSpnAndAssignRole(session: AzureSession, aadAppName: string, scope: string): Promise<AadApplication> {
        let graphCredentials = await this.getGraphToken(session);
        let tokenCredentials = new TokenCredentials(graphCredentials.accessToken);
        let graphClient = new RestClient(tokenCredentials);
        let tenantId = session.tenantId;
        var aadApp: AadApplication;

        return this.createAadApp(graphClient, aadAppName, tenantId)
        .then((aadApplication) => {
            aadApp = aadApplication;
            return this.createSpn(graphClient, aadApp.appId, tenantId);
        })
        .then((spn) => {
            aadApp.objectId = spn.objectId;
            return this.createRoleAssignment(session.credentials, scope, aadApp.objectId);
        })
        .then(() => {
            return aadApp;
        })
        .catch((error) => {
            let errorMessage = error && error.message;
            if (!errorMessage && error["odata.error"]) {
                errorMessage = error["odata.error"]["message"];
                if (typeof errorMessage === "object") {
                    errorMessage = errorMessage.value;
                }
            }
            throw new Error(errorMessage);
        });
    }

    public static generateAadApplicationName(accountName: string, projectName: string): string {
        var spnLengthAllowed = 92;
        var guid = uuid();
        var projectName = projectName.replace(/[^a-zA-Z0-9_-]/g, "");
        var accountName = accountName.replace(/[^a-zA-Z0-9_-]/g, "");
        var spnName = accountName + "-" + projectName + "-" + guid;
        if (spnName.length <= spnLengthAllowed) {
            return spnName;
        }

        // 2 is subtracted for delimiter '-'
        spnLengthAllowed = spnLengthAllowed - guid.length - 2;
        if (accountName.length > spnLengthAllowed / 2 && projectName.length > spnLengthAllowed / 2) {
            accountName = accountName.substr(0, spnLengthAllowed / 2);
            projectName = projectName.substr(0, spnLengthAllowed - accountName.length);
        }
        else if (accountName.length > spnLengthAllowed / 2 && accountName.length + projectName.length > spnLengthAllowed) {
            accountName = accountName.substr(0, spnLengthAllowed - projectName.length);
        }
        else if (projectName.length > spnLengthAllowed / 2 && accountName.length + projectName.length > spnLengthAllowed) {
            projectName = projectName.substr(0, spnLengthAllowed - accountName.length);
        }

        return accountName + "-" + projectName + "-" + guid;
    }

    private static async getGraphToken(session: AzureSession): Promise<TokenResponse> {
        let refreshTokenResponse = await this.getRefreshToken(session);
        return this.getResourceTokenFromRefreshToken(session.environment, refreshTokenResponse.refreshToken, session.tenantId, (<any>session.credentials).clientId, session.environment.activeDirectoryGraphResourceId);
    }

    private static async getRefreshToken(session: AzureSession): Promise<Token> {
        return new Promise<Token>((resolve, reject) => {
            const credentials: any = session.credentials;
            const environment = session.environment;
            credentials.context.acquireToken(environment.activeDirectoryResourceId, credentials.username, credentials.clientId, function (err: any, result: any) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        session,
                        accessToken: result.accessToken,
                        refreshToken: result.refreshToken
                    });
                }
            });
        });
    }

    private static async getResourceTokenFromRefreshToken(environment: AzureEnvironment, refreshToken: string, tenantId: string, clientId: string, resource: string): Promise<TokenResponse> {
        return new Promise<TokenResponse>((resolve, reject) => {
            const tokenCache = new MemoryCache();
            const context = new AuthenticationContext(`${environment.activeDirectoryEndpointUrl}${tenantId}`, true, tokenCache);
            context.acquireTokenWithRefreshToken(refreshToken, clientId, resource, (err, tokenResponse) => {
                if (err) {
                    reject(new Error(util.format(Messages.acquireTokenFromRefreshTokenFailed, err.message)));
                } else if (tokenResponse.error) {
                    reject(new Error(util.format(Messages.acquireTokenFromRefreshTokenFailed, tokenResponse.error)));
                } else {
                    resolve(<TokenResponse>tokenResponse);
                }
            });
        });
    }

    private static async createAadApp(graphClient: RestClient, name: string, tenantId: string): Promise<AadApplication> {
        let secret = generateRandomPassword(20);
        let startDate = new Date(Date.now());

        return graphClient.sendRequest<any>(<UrlBasedRequestPrepareOptions>{
            url: `https://graph.windows.net/${tenantId}/applications`,
            queryParameters: {
                "api-version": "1.6"
            },
            headers: {
                "Content-Type": "application/json",
            },
            method: "POST",
            body: {
                "availableToOtherTenants": false,
                "displayName": name,
                "homepage": "https://" + name,
                "identifierUris": [
                    "https://" + name
                ],
                "passwordCredentials": [
                    {
                        "startDate": startDate,
                        "endDate": new Date(startDate.getFullYear() + 1, startDate.getMonth()),
                        "value": secret
                    }
                ]
            },
            deserializationMapper: null,
            serializationMapper: null
        })
        .then((data) => {
            return <AadApplication>{
                appId: data.appId,
                secret: secret
            };
        });
    }

    private static async createSpn(graphClient: RestClient, appId: string, tenantId: string): Promise<any> {
        let createSpnPromise = () => {
            return graphClient.sendRequest<any>(<UrlBasedRequestPrepareOptions>{
                url: `https://graph.windows.net/${tenantId}/servicePrincipals`,
                queryParameters: {
                    "api-version": "1.6"
                },
                headers: {
                    "Content-Type": "application/json",
                },
                method: "POST",
                body: {
                    "appId": appId,
                    "accountEnabled": "true"
                },
                deserializationMapper: null,
                serializationMapper: null
            });
        };

        return executeFunctionWithRetry(
            createSpnPromise,
            GraphHelper.retryCount,
            GraphHelper.retryTimeIntervalInSec,
            Messages.azureServicePrincipalFailedMessage);
    }

    private static async createRoleAssignment(credentials: ServiceClientCredentials, scope: string, objectId: string): Promise<any> {
        let restClient = new RestClient(credentials);
        let roleDefinitionId = `${scope}/providers/Microsoft.Authorization/roleDefinitions/${this.contributorRoleId}`;
        let guid = uuid();
        let roleAssignementFunction = () => {
            return restClient.sendRequest<any>(<UrlBasedRequestPrepareOptions>{
                url: `https://management.azure.com/${scope}/providers/Microsoft.Authorization/roleAssignments/${guid}`,
                queryParameters: {
                    "api-version": "2015-07-01"
                },
                headers: {
                    "Content-Type": "application/json",
                },
                method: "PUT",
                body: {
                    "properties": {
                        "roleDefinitionId": roleDefinitionId,
                        "principalId": objectId
                    }
                },
                deserializationMapper: null,
                serializationMapper: null
            });
        };

        return executeFunctionWithRetry(
            roleAssignementFunction,
            GraphHelper.retryCount,
            GraphHelper.retryTimeIntervalInSec,
            Messages.roleAssignmentFailedMessage);
    }
}