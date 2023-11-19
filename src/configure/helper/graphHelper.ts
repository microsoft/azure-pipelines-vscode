import { v4 as uuid } from 'uuid';
import { AadApplication } from '../model/models';
import { generateRandomPassword, executeFunctionWithRetry } from './commonHelper';
import * as Messages from '../../messages';
import { RestClient } from '../clients/restClient';
import { TokenCredentials } from '@azure/ms-rest-js';
import { TokenCredentialsBase } from '@azure/ms-rest-nodeauth';
import * as util from 'util';
import { AzureSession } from '../../typings/azure-account.api';

// TODO: Replace this class with @microsoft/microsoft-graph-client and @azure/arm-authorization
// client.api("/applications").post()
// client.api("/servicePrincipals").post()
// new AuthorizationManagementClient().roleAssignments.create()
// Disable ESLint rules because there won't be any investment into this file; see above.
/* eslint-disable */
export class GraphHelper {

    private static contributorRoleId = "b24988ac-6180-42a0-ab88-20f7382dd24c";
    private static retryTimeIntervalInSec = 2;
    private static retryCount = 20;

    public static async createSpnAndAssignRole(session: AzureSession, aadAppName: string, scope: string): Promise<AadApplication> {
        const accessToken = await this.getGraphToken(session);
        const tokenCredentials = new TokenCredentials(accessToken);
        const graphClient = new RestClient(tokenCredentials);
        const tenantId = session.tenantId;
        let aadApp: AadApplication;

        return this.createAadApp(graphClient, aadAppName, tenantId)
        .then((aadApplication) => {
            aadApp = aadApplication;
            return this.createSpn(graphClient, aadApp.appId, tenantId);
        })
        .then((spn) => {
            aadApp.objectId = spn.objectId;
            return this.createRoleAssignment(session.credentials2, scope, aadApp.objectId);
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
        let spnLengthAllowed = 92;
        const guid = uuid();
        projectName = projectName.replace(/[^a-zA-Z0-9_-]/g, "");
        accountName = accountName.replace(/[^a-zA-Z0-9_-]/g, "");
        const spnName = accountName + "-" + projectName + "-" + guid;
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

    private static async getGraphToken(session: AzureSession): Promise<string> {
        const { activeDirectoryGraphResourceId } = session.environment;
        if (activeDirectoryGraphResourceId === undefined) {
            throw new Error(util.format(Messages.acquireAccessTokenFailed, "Active Directory Graph resource ID is undefined."));
        }

        return new Promise((resolve, reject) => {
            const credentials = session.credentials2;
            credentials.authContext.acquireToken(activeDirectoryGraphResourceId, session.userId, credentials.clientId, function (err, tokenResponse) {
                if (err) {
                    reject(new Error(util.format(Messages.acquireAccessTokenFailed, err.message)));
                } else if (tokenResponse.error) {
                    reject(new Error(util.format(Messages.acquireAccessTokenFailed, tokenResponse.error)));
                } else {
                    // This little casting workaround here allows us to not have to import adal-node
                    // just for the typings. Really it's on adal-node for making the type
                    // TokenResponse | ErrorResponse, even though TokenResponse has the same
                    // error properties as ErrorResponse.
                    resolve((tokenResponse as any).accessToken);
                }
            });
        });
    }

    private static async createAadApp(graphClient: RestClient, name: string, tenantId: string): Promise<AadApplication> {
        const secret = generateRandomPassword(20);
        const startDate = new Date(Date.now());

        return graphClient.sendRequest<any>({
            url: `https://graph.windows.net/${tenantId}/applications`,
            queryParameters: {
                "api-version": "1.6"
            },
            method: "POST",
            body: {
                "availableToOtherTenants": false,
                "displayName": name,
                "homepage": "https://" + name,
                "passwordCredentials": [
                    {
                        "startDate": startDate,
                        "endDate": new Date(startDate.getFullYear() + 1, startDate.getMonth()),
                        "value": secret
                    }
                ]
            }
        })
        .then((data) => {
            return <AadApplication>{
                appId: data.appId,
                secret: secret
            };
        });
    }

    private static async createSpn(graphClient: RestClient, appId: string, tenantId: string): Promise<any> {
        const createSpnPromise = () => {
            return graphClient.sendRequest<any>({
                url: `https://graph.windows.net/${tenantId}/servicePrincipals`,
                queryParameters: {
                    "api-version": "1.6"
                },
                method: "POST",
                body: {
                    "appId": appId,
                    "accountEnabled": "true"
                }
            });
        };

        return executeFunctionWithRetry(
            createSpnPromise,
            GraphHelper.retryCount,
            GraphHelper.retryTimeIntervalInSec,
            Messages.azureServicePrincipalFailedMessage);
    }

    private static async createRoleAssignment(credentials: TokenCredentialsBase, scope: string, objectId: string): Promise<any> {
        const restClient = new RestClient(credentials);
        const createRoleAssignmentPromise = () => {
            return restClient.sendRequest<any>({
                url: `https://management.azure.com/${scope}/providers/Microsoft.Authorization/roleAssignments/${uuid()}`,
                queryParameters: {
                    "api-version": "2021-04-01-preview" // So we have access to the "principalType" property
                },
                method: "PUT",
                body: {
                    "properties": {
                        "roleDefinitionId": `${scope}/providers/Microsoft.Authorization/roleDefinitions/${this.contributorRoleId}`,
                        "principalId": objectId,
                        "principalType": "ServicePrincipal", // Makes the assignment work for newly-created service principals
                    }
                }
            });
        };

        return executeFunctionWithRetry(
            createRoleAssignmentPromise,
            GraphHelper.retryCount,
            GraphHelper.retryTimeIntervalInSec,
            Messages.roleAssignmentFailedMessage);
    }
}
