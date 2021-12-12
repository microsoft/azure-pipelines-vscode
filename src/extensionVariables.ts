import { window } from 'vscode';

import { AzureAccount } from './configure/model/models';

// TODO: This probably shouldn't be a class we pass around,
// but rather two getter functions with caching.
class ExtensionVariables {
    public azureAccountExtensionApi: AzureAccount;
    public outputChannel = window.createOutputChannel('Azure Pipelines');
}

const extensionVariables = new ExtensionVariables();
export { extensionVariables };
