/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

export class Constants {
    static ExtensionName: string = 'azure-pipelines';
    static UserAgent: string = 'azure-pipelines-vscode-extension';
}

export class CommandNames {
    static CommandPrefix: string = Constants.ExtensionName + ".";

    static DisplayCurrentSchemaFile: string = CommandNames.CommandPrefix + 'DisplayCurrentSchemaFile';
    static LoadLatestTaskSchema: string = CommandNames.CommandPrefix + 'LoadLatestTaskSchema';
    static Signin: string = CommandNames.CommandPrefix + 'Signin';
    static Signout: string = CommandNames.CommandPrefix + 'Signout';
}

export class LogEvents {
    static SkippingDownloadLatestTasks: string = 'SkippingDownloadLatestTasks';
}

export class LogMessages {
    static AccountRequiredToDownloadTasks: string = 'Account name is required to download tasks. Please set azure-pipelines.account setting.';
    static PatRequiredToDownloadTasks: string = 'PAT is required to download tasks. Please set using Signin command.';
}
