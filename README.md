
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

# Setup and Configuration

## Requesting tasks specific to your account

There are two ways to get task data for your account: manually and automatically.

Before doing either of these you must configure your account.

In order to do this, add a user or workspace setting:

```
"azure-pipelines.account": "<YOUR ACCOUNT HERE>"
```

After this, you must set your PAT. While the extension is running, run a new command (Ctrl + Shift + P) and choose "Azure Pipelines: Signin".

You will be prompted for your PAT. If you don't have one yet, you can create on here -- INSERT LINK.

### Manual request

Now that your authentication is setup, you can load the tasks for your account by running a new command (Ctrl + Shift + P) and choosing "Azure Pipelines: Load Latest Task Schema"

### Automatic request

In addition to making manual requests for your task data, the extension can load them automatically (we try every 10 minutes). In order to do this, add the following setting:

```
"azure-pipelines.autoRequestTaskData": true
```

# Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) if you want to jump in!
