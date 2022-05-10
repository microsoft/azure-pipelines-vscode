# Releasing the extension

0. Work in a branch. I sometimes go with `ship-<version-num>`, for example, `ship-191`.
0. Find the current sprint using https://whatsprintis.it.
0. Update the version to the major sprint number using `npm version --no-git-tag-version THE_SPRINT_VERSION`.
    - Replace `THE_SPRINT_VERSION` with `patch` if you are doing a bugfix release.
0. Ensure the [CHANGELOG](CHANGELOG.md) is up to date.
0. Update the [service schema](#bumping-service-schema).
0. Create a PR on GitHub, mostly for tracking reasons.
0. Manually queue a [Release build](https://dev.azure.com/ms/azure-pipelines-vscode/_build?definitionId=12) against your PR branch.
    - This will create a GitHub release at the commit you've specified!
0. Ship the resulting package to the [Marketplace](https://marketplace.visualstudio.com/manage/publishers/ms-azure-devops).
    - You can grab it from either the pipeline run or off GitHub itself.
0. Run `npm version --no-git-tag-version patch` so that packages produced by CI are treated as newer than the released version.
0. Push that change and merge the PR. You can now delete the branch.

## Bumping service schema

0. Go to a personal Azure DevOps organization that is not joined to a work-related AAD organization
0. Get the new schema from https://dev.azure.com/YOUR-PERSONAL-ORG/_apis/distributedtask/yamlschema
0. Replace `service-schema.json` with the results of that endpoint.
0. In VS Code, run `Format document` to keep the diff readable.
0. Update `$comment` with the Azure DevOps sprint info (you can see the sprint number by going to https://dev.azure.com/YOUR-PERSONAL-ORG/_home/about).
