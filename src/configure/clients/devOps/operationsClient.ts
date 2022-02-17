import * as azdev from 'azure-devops-node-api';
import * as util from 'util';
import { OperationReference, OperationStatus } from 'azure-devops-node-api/interfaces/common/OperationsInterfaces';
import { sleepForMilliSeconds } from '../../helper/commonHelper';
import { AzureDevOpsBaseUrl } from "../../resources/constants";
import { Messages } from '../../../messages';

export class OperationsClient {
    private connection: azdev.WebApi;
    private organizationName: string;

    constructor(organizationName: string, connection: azdev.WebApi) {
        this.connection = connection;
        this.organizationName = organizationName;
    }

    public async waitForOperationSuccess(operationId: string): Promise<void> {
        const url = `${AzureDevOpsBaseUrl}/${this.organizationName}/_apis/operations/${operationId}`;

        for (let attempt = 0; attempt < 30; attempt++) {
          const response = await this.connection.rest.get<OperationReference>(url, {
              acceptHeader: "application/json;api-version=5.1-preview.1",
              additionalHeaders: {
                  "Content-Type": "application/json",
              },
          });

          if (response.statusCode !== 200) {
            throw new Error(util.format(Messages.failedToCreateAzureDevOpsProject, response.statusCode));
          }

          const operation = response.result;
          if (operation.status === OperationStatus.Succeeded) {
            return;
          }

          if (operation.status === OperationStatus.Failed) {
            // OperationReference is missing some properties so cast it to any
            throw new Error(util.format(Messages.failedToCreateAzureDevOpsProject, (operation as any).detailedMessage));
          }

          await sleepForMilliSeconds(2000);
        }

        throw new Error(util.format(Messages.failedToCreateAzureDevOpsProject, Messages.operationTimedOut));
    }
}
