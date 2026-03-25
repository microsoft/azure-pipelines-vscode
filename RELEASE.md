# Releasing the extension

0. Find the current sprint using https://whatsprintis.it.
0. Create a branch `ship-<version-num>`, for example, `ship-191`.
0. Update the version to the major sprint number using `npm version --no-git-tag-version 1.THE_SPRINT_VERSION.0`.
    - Replace `THE_SPRINT_VERSION` with `patch` if you are doing a bugfix release.
0. Ensure the [CHANGELOG](CHANGELOG.md) is up to date.
0. Update the [service schema](#bumping-service-schema).
0. Create a PR on GitHub.
0. After the PR is merged, queue a [Release build](https://dev.azure.com/mseng/Domino/_build?definitionId=22381) against your PR branch.
    - This will create a GitHub release at the commit you've specified!
0. After the extension is released, run `npm version --no-git-tag-version patch` so that packages produced by CI are treated as newer than the released version.
0. Push that change and merge the PR.

## Bumping service schema

0. Go to a personal Azure DevOps organization that is not joined to a work-related AAD organization
0. Get the new schema from https://dev.azure.com/YOUR-PERSONAL-ORG/_apis/distributedtask/yamlschema
0. Replace `service-schema.json` with the results of that endpoint.
0. In VS Code, run `Format document` to keep the diff readable.
0. Update `$comment` with the Azure DevOps sprint info (you can see the sprint number by going to https://dev.azure.com/YOUR-PERSONAL-ORG/_home/about).
