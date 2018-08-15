
# Pipelines for VS Code

This VS Code extension brings syntax highlighting and autocompletion for
Pipelines YAML to VS Code. Basic YAML validation is built in to VS Code, but
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

# Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) if you want to jump in!