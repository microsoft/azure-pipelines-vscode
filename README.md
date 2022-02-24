# Nuclei Vscode

Support autocomplete for [Nuclei](https://nuclei.projectdiscovery.io/) Templates.

### Configure

You can configure filename patterns to match as `nuclei-vscode` language.

```json
"files.associations": {
    // ...
    "*.template.yaml": "nuclei-vscode",
    "*.template.yml": "nuclei-vscode",
    // ...
},
```

or, you can just enable manually:

```
> Ctrl + Shift + P
> Change Language Mode
> Nuclei Vscode (nuclei-vscode)
```

### Schema support

- **id**: url friendly regex. Not nuclei default regex for ID
- **Info**
  - classification (object)
  - severity (enum)
- **Requests**
  - method (enum)
  - attack (enum)
- **Dns**
  - class (enum)
  - type (enum)

### ToDo

- [x] Support for DNS
- [ ] Support for File
- [ ] Support for Network
- [ ] Support for Headless
- [ ] Support for SSL
- [ ] Support for WebSocket
- [ ] Matchers support (stop-at-first-match)

### Thanks

This project was forked from the [Azure Pipelines Vscode](https://github.com/microsoft/azure-pipelines-vscode)
