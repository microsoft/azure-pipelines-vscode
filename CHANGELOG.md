# Change Log
All notable changes to the Azure Pipelines extension will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/). Versioning follows an internal Azure DevOps format that is not compatible with SemVer.

## 1.237.0
### Added
- Added go-to-definition support for local templates (thanks @Stuart-Wilcox!)
### Updated
- M235 schema

## 1.228.0
### Added
- Added support for using [1ES Pipeline Template schema Intellisense](https://aka.ms/1espt) for users working on pipelines extending 1ES Pipeline Templates. This feature is available for users with `@microsoft.com` account only.

## 1.220.0
### Updated
- M218 schema

## 1.208.0
### Added
- Schema auto-detection now works for all workspaces
### Fixed
- Updated dependencies to fix security vulnerabilities
### Updated
- M206 schema

## 1.205.0
### Fixed
- Fixed a bug in 1.204.0 that prevented schema auto-detection from working (thanks @krokofant!)
### Updated
- All templates have been updated to use the latest versions of agents and tooling
- M203 schema

## 1.204.0
### Fixed
- Fixed Configure Pipeline flow
- Updated dependencies to fix security vulnerabilities
### Updated
- M202 schema

## 1.202.0
### Added
- Your organization's schema will now be auto-detected and used if your repo is hosted in Azure Repos
### Fixed
- Updated dependencies to fix security vulnerabilities
### Updated
- M200 schema

## 1.195.0
### Fixed
- Emojis no longer cause validation to fail (thanks @PaulTaykalo!)
- The "Azure Pipelines: Configure Pipeline" command should work again
### Updated
- M195 schema

## 1.194.1
### Fixed
- Actually includes the changes intended for 1.194.0

## 1.194.0
### Fixed
- Property autocompletion no longer adds a duplicate colon if one already exists
- Fixed two crashes around conditional variables
### Updated
- M194 schema

## 1.191.0
### Added
- Supports [template expressions](https://docs.microsoft.com/en-us/azure/devops/pipelines/process/expressions?view=azure-devops)!
  - Note: while expressions will no longer be marked as errors, there may still be some incorrect warnings.
  - Many thanks to @50Wliu for this long-awaited feature.
### Updated
- M190 schema

## 1.188.1
### Fixed
- Fixed regression finding default schema

## 1.188.0
### Fixed
- Improved startup performance by 80%
- Reduced extension size by 90%
- Resolved several Dependabot alerts
### Updated
- M187 schema
- `azure-pipelines.customSchemaFile` can now point to a remote URL, as long as it does not require authentication
- Declared "limited" support for untrusted workspaces (all features will work except for `azure-pipelines.customSchemaFile`)

## 1.183.0
### Breaking change
- Configuration namespace has moved. If you added `customSchemaFile` or had keybindings to commands, you'll need to update your config. Wherever it says `[azure-pipelines].thing`, it should now read `azure-pipelines.thing`. And if you assigned a keybinding to `configure-pipeline`, change it to `azure-pipelines.configure-pipeline` instead. Sorry for the inconvenience, but this fixes several bugs and yields a better config experience. (Thanks @50Wliu!)

### Fixed
- Extension readme points to correct branch (thanks @AtOMiCNebula!)
- Several dependabot alerts

## 1.182.0

All of the material changes in this version were courtesy of @50Wliu. Thanks!
### Fixed
- Improve debuggability when working on extension + language server packages
- Removed need to prompt for extension restart on schema change
- Document the language client implementation

### Updated
- M181 YAML schema

## 1.177.0
### Fixed
- hopefully fixed some of the startup performance problems (hat tip to @50Wliu)
### Updated
- M176 YAML schema

## 1.174.2
### Fixed
- stopped passing null to `path.isAbsolute()`

## 1.174.1
### Added
- allow relative paths to custom schema
### Fixed
- over-notification when schema changes

## 1.174.0
### Fixed
- updated schema to M174

## 1.170.0
### Added
- Added an option to use a custom schema file
### Fixed
- updated schema to M169

## 1.165.1
### Fixed
- update a few dependencies

## 1.165.0
### Fixed
- updated schema to M163
- editor.autoIndent setting is updated from a bool to a string

## 1.157.5
### Added
- Added YAML Templates and detection logic for Function App

## 1.157.4
### Added
- Added an option to browse the pipeline targeting Azure Resource.

## 1.157.3
### Fixed
- Azure Repos scenario for `Configure Pipeline` where url contains DefaultCollection

## 1.157.2
### Added
- Added troubleshooting steps in README

## 1.157.1
### Fixed
- Azure Repos scenario for `Configure Pipeline`

## 1.157.0
### Added
- Added "Configure Pipeline" option in Command Palette (Ctrl+Shift+P) and File Explorer. This will configure a continuous integration (CI) and deployment (CD) pipeline to Azure Windows Web App

## 1.155.0
### Fixed
- Updated to M155 schema including some new tasks
- Several improvements to validation and auto-complete

## 1.152.0
### Added
- Support for `stages` and other new schema

## 1.147.2
### Fixed
- Partial support for expressions

## 1.147.1
### Fixed
- Support aliases for task inputs

## 1.145.2
### Fixed
- Identify required task inputs

## 1.145.1
### Fixed
- updated to latest tasks in schema
- allow expressions in some properties, including "condition"

## 1.145.0
### Fixed
- link to correct GitHub repo in package.json
- several YAML correctness bugs

## 1.144.0
### Fixed
- LF vs CRLF line endings caused the validator to lose its place
- removed several invalid auto-complete suggestions
- enforce first property in some constructs

## 1.141.0 - 2018-09-05
### Added
- Initial release
- Syntax highlighting for Azure Pipelines files
- Intellisense for Azure Pipelines files
