
# Azure Pipelines for VS Code

This VS Code extension brings syntax highlighting and autocompletion for
Azure Pipelines YAML to VS Code. Basic YAML validation is built in to VS Code, but
now you can have syntax highlighting that's aware of the Pipelines YAML schema.
This means that you get red squigglies if you say `tasks:` where you meant `task:`.
Intellisense is also schema-aware. Wherever you are in the file, press Ctrl-Space
(Cmd-Space on macOS) to see what options you have at that point.

By default, the extension will highlight known Azure Pipelines files in the root
of your workspace. You can change the language mode at the lower right to work
with one file at a time. Click the language picker, then choose "Azure Pipelines".
If you have files which should always use this extension, set your user or
workspace settings to match those file paths with this extension. For example:

```yaml
"files.associations": {
  "**/ci/*.yml": "azure-pipelines"
}
```

## Telemetry

This extension collects telemetry data to help us build a better experience for
using VS Code with Azure Pipelines. We use [vscode-extension-telemetry](https://github.com/Microsoft/vscode-extension-telemetry),
which reports the following data:

- Extension name
- Extension version
- Machine ID and session ID from VS Code
- Operating system
- Platform version

Additionally, if the language server fails to activate, we report the diagnostic
data the language server produces. The extension respects the `telemetry.enableTelemetry`
setting, which you can learn more about at VS Code's
[telemetry FAQ](https://code.visualstudio.com/docs/supporting/faq#_how-to-disable-telemetry-reporting).

## Working with other extensions

Depending on what other extensions you have installed, you may see strange behavior. We will try to document those issues here along with resolutions.

### GitLens

GitLens may show too much information. If you want to reduce to just document level information, add the following to your user or workspace settings:

```json
"gitlens.codeLens.scopesByLanguage": [
    {
        "language": "azure-pipelines",
        "scopes": [
            "document"
        ]
    }
],
```

# Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) if you want to jump in!
