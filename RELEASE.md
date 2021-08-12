# Releasing the extension

0. Work in a branch. I sometimes go with `ship-<version-num>`, for example, `ship-191`.
0. Ensure package.json and package-lock.json have the version number you want to release.
  - You can do this with `npm version --no-git-tag-version <patch|minor|major>` to get both files at once.
0. Ensure the CHANGELOG is up to date.
0. Manually queue a [Release build](https://dev.azure.com/ms/azure-pipelines-vscode/_build?definitionId=12)
  - This will create a GitHub release at the commit you've specified!
0. Ship the resulting package to the Marketplace.
You can grab it from either the pipeline run or off GitHub itself.
0. Bump the package.json/package-lock.json patch version numbers so that CI produces prerelease packages off the "next" release.
0. Push that change and merge the branch. You can now delete the branch.

## Bumping service schema

0. Get the new schema from https://dev.azure.com/vscode-schema/_apis/distributedtask/yamlschema
0. Replace `service-schema.json` with the results of that endpoint.
0. In VS Code, run `Format document` to keep the diff readable.
0. Update `$comment` with the Azure DevOps sprint info (you can see the sprint number in the lower left of the Azure DevOps UI at https://dev.azure.com/vscode-schema/).
