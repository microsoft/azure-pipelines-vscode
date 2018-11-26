# Releasing the extension

1. Ensure package.json and package-lock.json have the version number you want to release.
2. Manually queue a [Release build](https://dev.azure.com/ms/azure-pipelines-vscode/_build?definitionId=12)
3. Bump the package.json/package-lock.json version numbers so that CI produces prerelease packages off the "next" release.
