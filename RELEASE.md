# Releasing the extension

1. Ensure package.json and package-lock.json have the version number you want to release.
2. Manually queue a [Release build](https://dev.azure.com/ms/azure-pipelines-vscode/_build?definitionId=12)
3. Bump the package.json/package-lock.json version numbers so that CI produces prerelease packages off the "next" release.

## Bumping service schema

1. Get the new schema from https://dev.azure.com/vscode-schema/_apis/distributedtask/yamlschema
2. Replace `service-schema.json` with the results of that endpoint.
3. In VS Code, run `Format document` to keep the diff readable.
4. Update `$comment` with the Azure DevOps sprint info (you can see the sprint number in the lower left of the Azure DevOps UI at https://dev.azure.com/vscode-schema/).
