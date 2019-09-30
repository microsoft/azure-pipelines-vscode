import * as path from 'path';
import Q = require('q');
import * as utils from 'util';
import * as vscode from 'vscode';
import { Configurer } from "./configurerBase";
import { AzureDevOpsClient } from "../clients/devOps/azureDevOpsClient";
import { AzureDevOpsHelper } from "../helper/devOps/azureDevOpsHelper";
import { TargetResourceType, WizardInputs, AzureSession } from "../model/models";
import { ServiceConnectionHelper } from '../helper/devOps/serviceConnectionHelper';
import { Messages } from '../resources/messages';
import { GraphHelper } from '../helper/graphHelper';
import { telemetryHelper } from '../helper/telemetryHelper';
import { TracePoints } from '../resources/tracePoints';
import { UniqueResourceNameSuffix } from '../configure';
import { AppServiceClient } from '../clients/azure/appServiceClient';
import { AzureResourceClient } from '../clients/azure/azureResourceClient';
import { TelemetryKeys } from '../resources/telemetryKeys';
import { Build } from '../model/azureDevOps';
import { LocalGitRepoHelper } from '../helper/LocalGitRepoHelper';

const Layer = 'AzurePipelineConfigurer';

export class AzurePipelineConfigurer implements Configurer {
    private azureDevOpsHelper: AzureDevOpsHelper;
    private azureDevOpsClient: AzureDevOpsClient;
    private queuedPipeline: Build;

    constructor(azureSession: AzureSession, subscriptionId: string) {
        this.azureDevOpsClient = new AzureDevOpsClient(azureSession.credentials);
        this.azureDevOpsHelper = new AzureDevOpsHelper(this.azureDevOpsClient);
    }

    public async validatePermissions(): Promise<any> {
        throw new Error("Method not implemented.");
    }

    public async createPreRequisites(inputs: WizardInputs): Promise<void> {
        let serviceConnectionHelper = new ServiceConnectionHelper(inputs.organizationName, inputs.project.name, this.azureDevOpsClient);
        // TODO: show notification while setup is being done.
        // ?? should SPN created be scoped to resource group of target azure resource.
        inputs.targetResource.serviceConnectionId = await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: utils.format(Messages.creatingAzureServiceConnection, inputs.targetResource.subscriptionId)
            },
            async () => {
                try {
                    let scope = inputs.targetResource.resource.id;
                    let aadAppName = GraphHelper.generateAadApplicationName(inputs.organizationName, inputs.project.name);
                    let aadApp = await GraphHelper.createSpnAndAssignRole(inputs.azureSession, aadAppName, scope);
                    let serviceConnectionName = `${inputs.targetResource.resource.name}-${UniqueResourceNameSuffix}`;
                    return await serviceConnectionHelper.createAzureServiceConnection(serviceConnectionName, inputs.azureSession.tenantId, inputs.targetResource.subscriptionId, scope, aadApp);
                }
                catch (error) {
                    telemetryHelper.logError(Layer, TracePoints.AzureServiceConnectionCreateFailure, error);
                    throw error;
                }
            });

        throw new Error("Method not implemented.");
    }

    public async getPathToPipelineFile(inputs: WizardInputs) {
        return path.join(inputs.sourceRepository.localPath, await LocalGitRepoHelper.GetAvailableFileName('azure-pipelines.yml', inputs.sourceRepository.localPath));
    }

    public async createAndQueuePipeline(inputs: WizardInputs): Promise<any> {
        this.queuedPipeline = await vscode.window.withProgress<Build>({ location: vscode.ProgressLocation.Notification, title: Messages.configuringPipelineAndDeployment }, async () => {
            try {
                let pipelineName = `${inputs.targetResource.resource.name}-${UniqueResourceNameSuffix}`;
                return await this.azureDevOpsHelper.createAndRunPipeline(pipelineName, inputs);
            }
            catch (error) {
                telemetryHelper.logError(Layer, TracePoints.CreateAndQueuePipelineFailed, error);
                throw error;
            }
        });

        return this.queuedPipeline;
    }

    public async postPipelineCreationSteps(inputs: WizardInputs, azureResourceClient: AzureResourceClient): Promise<void> {
        if (inputs.targetResource.resource.type === TargetResourceType.WebApp) {
            try {
                // update SCM type
                let updateScmPromise = (azureResourceClient as AppServiceClient).updateScmType(inputs.targetResource.resource.id);

                let buildDefinitionUrl = this.azureDevOpsClient.getOldFormatBuildDefinitionUrl(inputs.organizationName, inputs.project.id, this.queuedPipeline.definition.id);
                let buildUrl = this.azureDevOpsClient.getOldFormatBuildUrl(inputs.organizationName, inputs.project.id, this.queuedPipeline.id);

                // update metadata of app service to store information about the pipeline deploying to web app.
                let updateMetadataPromise = new Promise<void>(async (resolve) => {
                    let metadata = await (azureResourceClient as AppServiceClient).getAppServiceMetadata(inputs.targetResource.resource.id);
                    metadata["properties"] = metadata["properties"] ? metadata["properties"] : {};
                    metadata["properties"]["VSTSRM_ProjectId"] = `${inputs.project.id}`;
                    metadata["properties"]["VSTSRM_AccountId"] = await this.azureDevOpsClient.getOrganizationIdFromName(inputs.organizationName);
                    metadata["properties"]["VSTSRM_BuildDefinitionId"] = `${this.queuedPipeline.definition.id}`;
                    metadata["properties"]["VSTSRM_BuildDefinitionWebAccessUrl"] = `${buildDefinitionUrl}`;
                    metadata["properties"]["VSTSRM_ConfiguredCDEndPoint"] = '';
                    metadata["properties"]["VSTSRM_ReleaseDefinitionId"] = '';

                    (azureResourceClient as AppServiceClient).updateAppServiceMetadata(inputs.targetResource.resource.id, metadata);
                    resolve();
                });

                // send a deployment log with information about the setup pipeline and links.
                let updateDeploymentLogPromise = (azureResourceClient as AppServiceClient).publishDeploymentToAppService(
                    inputs.targetResource.resource.id,
                    buildDefinitionUrl,
                    buildDefinitionUrl,
                    buildUrl);

                    Q.all([updateScmPromise, updateMetadataPromise, updateDeploymentLogPromise])
                    .then(() => {
                        telemetryHelper.setTelemetry(TelemetryKeys.UpdatedWebAppMetadata, 'true');
                    })
                    .catch((error) => {
                        telemetryHelper.setTelemetry(TelemetryKeys.UpdatedWebAppMetadata, 'false');
                        throw error;
                    });
            }
            catch (error) {
                telemetryHelper.logError(Layer, TracePoints.PostDeploymentActionFailed, error);
            }
        }
    }

    public async browseQueuedPipeline(): Promise<void> {
        vscode.window.showInformationMessage(Messages.pipelineSetupSuccessfully, Messages.browsePipeline)
            .then((action: string) => {
                if (action && action.toLowerCase() === Messages.browsePipeline.toLowerCase()) {
                    telemetryHelper.setTelemetry(TelemetryKeys.BrowsePipelineClicked, 'true');
                    vscode.env.openExternal(vscode.Uri.parse(this.queuedPipeline._links.web.href));
                }
            });
    }
}
