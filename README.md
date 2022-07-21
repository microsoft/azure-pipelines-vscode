[![Build Status](https://dev.azure.com/ms/azure-pipelines-vscode/_apis/build/status/CI-and-PR)](https://dev.azure.com/ms/azure-pipelines-vscode/_build/latest?definitionId=11)

# Azure Pipelines for VS Code

[Get it on the VS Code Marketplace!](https://marketplace.visualstudio.com/items?itemName=ms-azure-devops.azure-pipelines)

This VS Code extension adds syntax highlighting and autocompletion for Azure Pipelines YAML to VS Code. It also helps you set up continuous build and deployment for Azure WebApps without leaving VS Code.

## Validation

Basic YAML validation is built in to VS Code, but now you can have syntax highlighting that's aware of the Pipelines YAML schema. This means that you get red squigglies if you say `tasks:` where you meant `task:`. IntelliSense is also schema-aware. Wherever you are in the file, press Ctrl-Space to see what options you have at that point.

By default, the extension will highlight known Azure Pipelines files in the root of your workspace. You can change the language mode at the lower right to work with one file at a time. Click the language picker, then choose "Azure Pipelines". If you have files which should always use this extension, set your user or workspace settings to match those file paths with this extension. For example:

```json
{
    "files.associations": {
        "**/ci/*.yml": "azure-pipelines"
    }
}
```

### Schema auto-detection

Out of the box, the extension has a generic schema file that includes only in-box tasks.
You probably have custom tasks installed in your organization.

To provide the most relevant IntelliSense, the extension will automatically detect and use your organization's schema! All you need to do is follow the instructions when prompted.

> If automatic fetching of the organization schema doesn't work, try signing out and signing back in using the `Azure: Sign Out` and `Azure: Sign In` commands from the VS Code command palette (Ctrl/Cmd + Shift + P).

### Specific schema

If you need to use a specific schema, that is also possible.

1. Visit `https://dev.azure.com/YOUR-ORG-HERE/_apis/distributedtask/yamlschema` and save the output as `my-schema.json`.
2. Edit your workspace's `settings.json` to include this:
```json
{
  "azure-pipelines.customSchemaFile": "./path/to/my-schema.json"
}
```

## Document formatting

Since this extension defines a new file type ("`azure-pipelines`"), any YAML formatter you've installed no longer applies to pipelines documents.
Hat tip to @mgexm and @dotnetcanuck for [sharing how they restored this functionality](https://github.com/microsoft/azure-pipelines-vscode/issues/209#issuecomment-718168926).
We'll demonstrate with the [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) VS Code extension:

Add this to your `settings.json`:
```json
"[azure-pipelines]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
},
```

Both format on save and the `Format document` command should now work!

## Pipeline configuration

![Configure Pipeline Demo](https://raw.githubusercontent.com/microsoft/azure-pipelines-vscode/main/resources/configure-pipeline.gif)

To set up a pipeline, choose *Azure Pipelines: Configure Pipeline* from the command palette (Ctrl/Cmd + Shift + P) or right-click in the file explorer. The guided workflow will generate a starter YAML file defining the build and deploy process.

You can customize the pipeline using all the features offered by [Azure Pipelines.](https://azure.microsoft.com/services/devops/pipelines/).

Once the setup is completed, an automatic CI/CD trigger will fire for every code push. To set this up, the extension will ask for a GitHub PAT with *repo* and *admin:repo_hook* scope.

![GitHub PAT scope](resources/gitHubPatScope.png)

## Telemetry

VS Code collects usage data and sends it to Microsoft to help improve our products and services. Read our [privacy statement](https://go.microsoft.com/fwlink/?LinkID=528096&clcid=0x409) to learn more. If you don’t wish to send usage data to Microsoft, you can set the `telemetry.enableTelemetry` setting to `false`. Learn more in our [FAQ](https://code.visualstudio.com/docs/supporting/faq#_how-to-disable-telemetry-reporting).

## Troubleshooting failures

- **Selected workspace is not a Git repository**: You can configure a pipeline for a Git repository backed by GitHub or Azure Repos. Initialize your workspace as a Git repo, commit your files, and add a remote to GitHub or Azure Repos. Run the following commands to configure git repository:

    `git init`

    `git add *`

    `git commit -m <commit-message>`

    `git remote add <remote-name> <remote-url>`

- **The current branch doesn't have a tracking branch, and the selected repository has no remotes**: You can configure a pipeline for a Git repository backed by GitHub or Azure Repos. To add a new remote Git repository, run `git remote add <remote-name> <remote-url>`

- **Failed to determine Azure Repo details from remote url**: If you're configuring a pipeline for a Git repository backed by Azure Repos, ensure that it has a remote pointing to a valid Azure Repos Git repo URL.

## Extension Development

If you are only working on the extension (i.e. syntax highlighting, configure pipeline, and the language client):
- Run `npm install` to install all necessary dependencies
- Run `npm run watch` to automatically rebuild the extension whenever you make changes
- Run the "Extension" debug configuration to launch a VS Code window using your modified version of the extension

If you are also working on the language server:
- Follow the first two steps above
- Clone the [azure-pipelines-language-server](https://github.com/microsoft/azure-pipelines-language-server) repository alongside this repository
- Run `npm link ../azure-pipelines-language-server/language-server`
- Follow the instructions in the language server README to link the language service to the language server
- Add the `azure-pipelines-language-server` folder to your VS Code workspace
- Run the "Launch Extension & Attach to Server" debug configuration
    - Note: In order to attach to the server, the extension must be activated (in other words, make sure you are editing an Azure Pipelines file)
    - In case the attach request timeouts before the server can start, wait for it to start and then run the "Attach to Server" debug configuration

# Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) if you want to jump in!
