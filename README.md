[![Build Status](https://dev.azure.com/ms/azure-pipelines-vscode/_apis/build/status/CI-and-PR)](https://dev.azure.com/ms/azure-pipelines-vscode/_build/latest?definitionId=11)

# Azure Pipelines for VS Code

[Get it on the VS Code Marketplace!](https://marketplace.visualstudio.com/items?itemName=ms-azure-devops.azure-pipelines)

This VS Code extension adds syntax highlighting and autocompletion for Azure Pipelines YAML to VS Code. It also helps you set up continuous build and deployment for Azure WebApps without leaving VS Code.

![Configure Pipeline Demo](https://raw.githubusercontent.com/microsoft/azure-pipelines-vscode/master/resources/configure-pipeline.gif)

To set up a pipeline, choose *Azure Pipelines: Configure Pipeline* from the command palette (Ctrl/Cmd + Shift + P) or right-click in the file explorer. The guided workflow will generate a starter YAML file defining the build and deploy process.

You can customize the pipeline using all the features offered by [Azure Pipelines.](https://azure.microsoft.com/services/devops/pipelines/).

Once the setup is completed, an automatic CI/CD trigger will fire for every code push. To set this up, the extension will ask for a GitHub PAT with *repo* and *admin:repo_hook* scope.

![GitHub PAT scope](resources/gitHubPatScope.png)

Basic YAML validation is built in to VS Code, but now you can have syntax highlighting that's aware of the Pipelines YAML schema. This means that you get red squigglies if you say tasks: where you meant task:. IntelliSense is also schema-aware. Wherever you are in the file, press Ctrl-Space to see what options you have at that point.

By default, the extension will highlight known Azure Pipelines files in the root of your workspace. You can change the language mode at the lower right to work with one file at a time. Click the language picker, then choose "Azure Pipelines". If you have files which should always use this extension, set your user or workspace settings to match those file paths with this extension. For example:

"files.associations": {

  "**/ci/*.yml": "azure-pipelines"

}

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

# Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) if you want to jump in!
