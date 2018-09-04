/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

export interface DTData {
    count: number;
    value?: (DTTask)[] | null;
}

export interface DTTask {
    id: string;
    name: string;
    version: Version;
    friendlyName: string;
    description: string;
    inputs?: InputsEntity[];
}

export interface Version {
    major: number;
    minor: number;
    patch: number;
    isTest: boolean;
}

export interface InputsEntity {
    aliases?: (string | null)[] | null;
    name: string;
    label: string;
    defaultValue: string;
    required?: boolean | null;
    type: string;
    helpMarkDown: string;
    groupName?: string | null;
    options?: any;
    properties?: Properties | null;
    visibleRule?: string | null;
    validation?: Validation | null;
}

export interface Properties {
    EditableOptions?: string | null;
    MultiSelectFlatList?: string | null;
    Disabled?: string | null;
    EnableManage?: string | null;
    ManageLink?: string | null;
    ManageIcon?: string | null;
    ManageButtonName?: string | null;
    resizable?: string | null;
    editorExtension?: string | null;
    displayFormat?: string | null;
    PopulateDefaultValue?: string | null;
    rows?: string | null;
    maxLength?: string | null;
    DisableManageLink?: string | null;
    MultiSelect?: string | null;
    isVariableOrNonNegativeNumber?: string | null;
}

export interface Validation {
    expression: string;
    message: string;
}

export interface SourceDefinitionsEntity {
    endpoint: string;
    target: string;
    authKey: string;
    selector: string;
    keySelector: string;
}

export interface DataSourceBindingsEntity {
    dataSourceName?: string | null;
    parameters: Parameters;
    endpointId: string;
    target: string;
    resultTemplate?: string | null;
    endpointUrl?: string | null;
    resultSelector?: string | null;
    callbackContextTemplate?: string | null;
    callbackRequiredTemplate?: string | null;
    initialContextTemplate?: string | null;
}

export interface Parameters {
    testPlan?: string | null;
    ResourceGroupName?: string | null;
    WebSiteLocation?: string | null;
    feed?: string | null;
    definition?: string | null;
    project?: string | null;
    buildId?: string | null;
    WebAppKind?: string | null;
    WebAppName?: string | null;
    AzureContainerRegistry?: string | null;
    AzureContainerRegistryLoginServer?: string | null;
    AzureContainerRegistryImage?: string | null;
    namespaces?: string | null;
    DockerNamespace?: string | null;
    DockerRepository?: string | null;
    osTypeSelected?: string | null;
    jenkinsJobType?: string | null;
    storageAccount?: string | null;
    ResourceType?: string | null;
    location?: string | null;
    storageAccountName?: string | null;
    AppInsightsResourceGroupName?: string | null;
}

export interface MessageProperties {
    jobid?: string | null;
    taskId?: string | null;
    PlanUrl?: string | null;
    ProjectId?: string | null;
    HubName?: string | null;
    PlanId?: string | null;
    JobId?: string | null;
    TimelineId?: string | null;
    TaskInstanceName?: string | null;
    TaskInstanceId?: string | null;
    AuthToken?: string | null;
}
