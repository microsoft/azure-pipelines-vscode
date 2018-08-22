/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { DTTask, InputsEntity } from "./dtdata";
import * as logger from './logger';

export interface IYamlSchemaService {
    getSchemaFromTasks(tasks: DTTask[]): string;
}

// TODO: Add unit tests. Refactor if needed.
export class YamlSchemaService implements IYamlSchemaService {
    public getSchemaFromTasks(tasks: DTTask[]): string {
        logger.log('getSchemaFromTasks');
        let anyOf: any = [];

        for (var i = 0; i < tasks.length; i++) {
            const taskSchema: string = this.getSchemaFromTask(tasks[i]);
            anyOf.push(JSON.parse(taskSchema));
        }

        // TODO: Find a cleaner way to do this... breakdown definitions to their own
        let fullSchema = {
            "$schema": "http://json-schema.org/draft-07/schema#",
            "$id": "https://github.com/Microsoft/vsts-agent/blob/master/src/Misc/ci-schema.json",
            "$comment": "v1.137.0",
            "title": "Pipeline schema",
            "description": "A pipeline definition",
            "oneOf": [
                { "$ref": "#/definitions/fullPipeline" },
                { "$ref": "#/definitions/singlePhasePipeline" }
            ],
            "definitions": {
                "fullPipeline": {
                    "type": "object",
                    "required": [],
                    "additionalProperties": false,
                    "properties": {
                        "name": {
                            "description": "Pipeline name",
                            "type": "string"
                        },
                        "resources": {
                            "description": "Containers and repositories used in the build",
                            "type": "object",
                            "properties": {
                                "containers": {
                                    "description": "Container images",
                                    "type": "array",
                                    "items": {
                                        "$ref": "#/definitions/containerReference"
                                    }
                                },
                                "repositories": {
                                    "description": "External repositories",
                                    "type": "array",
                                    "items": {
                                        "$ref": "#/definitions/repositoryReference"
                                    }
                                }
                            }
                        },
                        "variables": {
                            "description": "Pipeline-wide variables",
                            "type": "object"
                        },
                        "phases": {
                            "description": "Phases of the pipeline",
                            "type": "array",
                            "items": {
                                "$ref": "#/definitions/phase"
                            }
                        },
                        "trigger": {
                            "description": "Continuous integration triggers",
                            "$ref": "#/definitions/trigger"
                        },
                        "parameters": {
                            "description": "Parameters used in a pipeline template",
                            "$ref": "#/definitions/parameters"
                        }
                    }
                },
                "singlePhasePipeline": {
                    "type": "object",
                    "required": [],
                    "additionalProperties": false,
                    "properties": {
                        "name": {
                            "description": "Pipeline name",
                            "type": "string"
                        },
                        "resources": {
                            "description": "Containers and repositories used in the build",
                            "type": "object",
                            "properties": {
                                "containers": {
                                    "description": "Container images",
                                    "type": "array",
                                    "items": {
                                        "$ref": "#/definitions/containerReference"
                                    }
                                },
                                "repositories": {
                                    "description": "External repositories",
                                    "type": "array",
                                    "items": {
                                        "$ref": "#/definitions/repositoryReference"
                                    }
                                }
                            }
                        },
                        "trigger": {
                            "description": "Continuous integration triggers",
                            "$ref": "#/definitions/trigger"
                        },
                        "displayName": {
                            "type": "string",
                            "description": "Human-readable name for the sole phase"
                        },
                        "condition": {
                            "type": "string",
                            "description": "Evaluate this condition expression to determine whether to run the pipeline"
                        },
                        "queue": {
                            "oneOf": [
                                { "type": "string" },
                                { "$ref": "#/definitions/queue" }
                            ],
                            "description": "Queue where the pipeline will run",
                            "examples": [
                                "Hosted VS2017",
                                "Hosted macOS Preview",
                                "Hosted Linux Preview"
                            ]
                        },
                        "server": {
                            "$ref": "#/definitions/booleanMacroExpression",
                            "description": "True if this is an agent-less build (runs on server)"
                        },
                        "variables": {
                            "type": "object",
                            "description": "Variables for the phase"
                        },
                        "steps": {
                            "type": "array",
                            "description": "A list of steps to run",
                            "items": {
                                "$ref": "#/definitions/stepOrTemplateExpression"
                            }
                        },
                        "template": {
                            "type": "string",
                            "description": "Reference to a template for the phase"
                        },
                        "parameters": {
                            "description": "Parameters used in a pipeline template",
                            "type": "object"
                        }
                    }
                },
                "phase": {
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                        "phase": {
                            "oneOf": [
                                {
                                    "type": "string",
                                    "description": "ID of the phase",
                                    "pattern": "^[_A-Za-z0-9]*$"
                                },
                                {
                                    "type": "null"
                                }
                            ]
                        },
                        "displayName": {
                            "type": "string",
                            "description": "Human-readable name of the phase"
                        },
                        "dependsOn": {
                            "oneOf": [
                                {
                                    "type": "string"
                                },
                                {
                                    "type": "array",
                                    "items": {
                                        "type": "string",
                                        "uniqueItems": true
                                    }
                                }
                            ],
                            "description": "Any phases which must complete before this one"
                        },
                        "condition": {
                            "type": "string",
                            "description": "Evaluate this condition expression to determine whether to run this phase"
                        },
                        "continueOnError": {
                            "$ref": "#/definitions/booleanMacroExpression",
                            "description": "Continue running this phase even on failure?"
                        },
                        "queue": {
                            "oneOf": [
                                { "type": "string" },
                                { "$ref": "#/definitions/queue" }
                            ],

                            "description": "Queue where this phase will run",
                            "examples": [
                                "Hosted VS2017",
                                "Hosted macOS Preview",
                                "Hosted Linux Preview"
                            ]
                        },
                        "server": {
                            "$ref": "#/definitions/booleanMacroExpression",
                            "description": "True if this is an agent-less phase (runs on server)"
                        },
                        "variables": {
                            "type": "object",
                            "description": "Phase-specific variables"
                        },
                        "steps": {
                            "type": "array",
                            "description": "A list of steps to run",
                            "items": {
                                "$ref": "#/definitions/stepOrTemplateExpression"
                            }
                        },
                        "template": {
                            "type": "string",
                            "description": "Reference to a template for this phase"
                        },
                        "parameters": {
                            "description": "Parameters used in a pipeline template",
                            "type": "object"
                        }
                    }
                },
                "queue": {
                    "type": "object",
                    "description": "Queue details",
                    "additionalProperties": false,
                    "required": ["name"],
                    "properties": {
                        "name": {
                            "type": "string",
                            "description": "Name of a queue"
                        },
                        "demands": {
                            "oneOf": [
                                { "type": "string" },
                                { "type": "object" }
                            ],
                            "description": "List of demands (for a private pool)"
                        },
                        "timeoutInMinutes": {
                            "$ref": "#/definitions/integerMacroExpression",
                            "description": "Time to wait before cancelling the phase"
                        },
                        "cancelTimeoutInMinutes": {
                            "$ref": "#/definitions/integerMacroExpression",
                            "description": "Time to wait for the phase to cancel before forcibly terminating it"
                        },
                        "parallel": {
                            "$ref": "#/definitions/integerMacroExpression",
                            "description": "Maximum number of parallel agent executions"
                        },
                        "matrix": {
                            "$ref": "#/definitions/matrix"
                        }
                    }
                },
                "server": {
                    "type": "object",
                    "description": "Server phase details",
                    "additionalProperties": false,
                    "properties": {
                        "timeoutInMinutes": {
                            "$ref": "#/definitions/integerMacroExpression",
                            "description": "Time to wait before cancelling the phase"
                        },
                        "cancelTimeoutInMinutes": {
                            "$ref": "#/definitions/integerMacroExpression",
                            "description": "Time to wait for the phase to cancel before forcibly terminating it"
                        },
                        "parallel": {
                            "$ref": "#/definitions/integerMacroExpression",
                            "description": "Maximum number of parallel agent executions"
                        },
                        "matrix": {
                            "$ref": "#/definitions/matrix"
                        }
                    }
                },
                "matrix": {
                    "type": "object",
                    "description": "List of permutations of variable values to run",
                    "minProperties": 1,
                    "patternProperties": {
                        "^[A-Za-z0-9_]+$": {
                            "type": "object",
                            "description": "Variable-value pair to pass in this matrix instance"
                        }
                    }
                },
                "script": {
                    "type": "object",
                    "description": "An inline script step",
                    "additionalProperties": false,
                    "required": ["script"],
                    "properties": {
                        "script": {
                            "type": "string",
                            "description": "An inline script"
                        },
                        "displayName": {
                            "type": "string",
                            "description": "Human-readable name for the step"
                        },
                        "name": {
                            "type": "string",
                            "description": "ID of the step",
                            "pattern": "^[_A-Za-z0-9]*$"
                        },
                        "failOnStderr": {
                            "$ref": "#/definitions/booleanMacroExpression",
                            "description": "Fail the task if output is sent to Stderr?"
                        },
                        "workingDirectory": {
                            "type": "string",
                            "description": "Start the script with this working directory"
                        },
                        "condition": {
                            "type": "string",
                            "description": "Evaluate this condition expression to determine whether to run this script"
                        },
                        "continueOnError": {
                            "$ref": "#/definitions/booleanMacroExpression",
                            "description": "Continue running the parent phase even on failure?"
                        },
                        "enabled": {
                            "$ref": "#/definitions/booleanMacroExpression",
                            "description": "Run this script when the phase runs?"
                        },
                        "timeoutInMinutes": {
                            "$ref": "#/definitions/integerMacroExpression",
                            "description": "Time to wait for this script to complete before the server kills it"
                        },
                        "env": {
                            "type": "object",
                            "description": "Variables to map into the process's environment"
                        }
                    }
                },
                "bash": {
                    "type": "object",
                    "required": ["bash"],
                    "additionalProperties": false,
                    "properties": {
                        "bash": {
                            "type": "string"
                        },
                        "displayName": {
                            "type": "string",
                            "description": "Human-readable name for the step"
                        },
                        "name": {
                            "type": "string",
                            "description": "ID of the step",
                            "pattern": "^[_A-Za-z0-9]*$"
                        },
                        "failOnStderr": {
                            "$ref": "#/definitions/booleanMacroExpression",
                            "description": "Fail the task if output is sent to Stderr?"
                        },
                        "workingDirectory": {
                            "type": "string",
                            "description": "Start the script with this working directory"
                        },
                        "condition": {
                            "type": "string",
                            "description": "Evaluate this condition expression to determine whether to run this script"
                        },
                        "continueOnError": {
                            "$ref": "#/definitions/booleanMacroExpression",
                            "description": "Continue running the parent phase even on failure?"
                        },
                        "enabled": {
                            "$ref": "#/definitions/booleanMacroExpression",
                            "description": "Run this script when the phase runs?"
                        },
                        "timeoutInMinutes": {
                            "$ref": "#/definitions/integerMacroExpression",
                            "description": "Time to wait for this script to complete before the server kills it"
                        },
                        "env": {
                            "type": "object",
                            "description": "Variables to map into the process's environment"
                        }
                    }
                },
                "powershell": {
                    "type": "object",
                    "required": ["powershell"],
                    "additionalProperties": false,
                    "properties": {
                        "powershell": {
                            "type": "string",
                            "description": "Inline PowerShell or reference to a PowerShell file"
                        },
                        "displayName": {
                            "type": "string",
                            "description": "Human-readable name for the step"
                        },
                        "name": {
                            "type": "string",
                            "description": "ID of the step",
                            "pattern": "^[_A-Za-z0-9]*$"
                        },
                        "errorActionPreference": {
                            "enum": ["stop", "continue", "silentlyContinue"],
                            "description": "Strategy for dealing with script errors"
                        },
                        "failOnStderr": {
                            "$ref": "#/definitions/booleanMacroExpression",
                            "description": "Fail the task if output is sent to Stderr?"
                        },
                        "ignoreLASTEXITCODE": {
                            "$ref": "#/definitions/booleanMacroExpression",
                            "description": "Check the final exit code of the script to determine whether the step succeeded?"
                        },
                        "workingDirectory": {
                            "type": "string",
                            "description": "Start the script with this working directory"
                        },
                        "condition": {
                            "type": "string",
                            "description": "Evaluate this condition expression to determine whether to run this script"
                        },
                        "continueOnError": {
                            "$ref": "#/definitions/booleanMacroExpression",
                            "description": "Continue running the parent phase even on failure?"
                        },
                        "enabled": {
                            "$ref": "#/definitions/booleanMacroExpression",
                            "description": "Run this script when the phase runs?"
                        },
                        "timeoutInMinutes": {
                            "$ref": "#/definitions/integerMacroExpression",
                            "description": "Time to wait for this script to complete before the server kills it"
                        },
                        "env": {
                            "type": "object",
                            "description": "Variables to map into the process's environment"
                        }
                    }
                },
                "checkout": {
                    "type": "object",
                    "required": ["checkout"],
                    "additionalProperties": false,
                    "properties": {
                        "checkout": {
                            "enum": ["self", "none"],
                            "description": "Whether or not to check out the repository containing this pipeline definition"
                        },
                        "clean": {
                            "$ref": "#/definitions/booleanMacroExpression",
                            "description": "Start from a clean, freshly-fetched workdir?"
                        },
                        "fetchDepth": {
                            "$ref": "#/definitions/integerMacroExpression",
                            "description": "Depth of Git graph to fetch"
                        },
                        "lfs": {
                            "$ref": "#/definitions/booleanMacroExpression",
                            "description": "Fetch Git-LFS objects?"
                        }
                    }
                },
                "templateReference": {
                    "type": "object",
                    "required": ["template"],
                    "additionalProperties": false,
                    "properties": {
                        "template": {
                            "type": "string",
                            "description": "A URL to a step template"
                        },
                        "parameters": {
                            "type": "object",
                            "description": "Step-specific parameters"
                        }
                    }
                },
                "repositoryReference": {
                    "type": "object",
                    "required": ["repository", "type"],
                    "additionalProperties": false,
                    "properties": {
                        "repository": {
                            "type": "string",
                            "description": "ID for the external repository",
                            "pattern": "^[A-Za-z0-9_]+$"
                        },
                        "type": {
                            "enum": ["github"],
                            "description": "Type of external repository"
                        },
                        "endpoint": {
                            "type": "string",
                            "description": "ID of the service endpoint connecting to this repository"
                        },
                        "name": {
                            "type": "string",
                            "description": "Identity and repository name",
                            "examples": [
                                "contoso/foo"
                            ]
                        },
                        "ref": {
                            "type": "string",
                            "description": "Refname to retrieve",
                            "examples": [
                                "refs/heads/master",
                                "refs/tags/lkg"
                            ]
                        }
                    }
                },
                "containerReference": {
                    "type": "object",
                    "required": ["container", "image"],
                    "additionalProperties": false,
                    "properties": {
                        "container": {
                            "type": "string",
                            "description": "ID for the container",
                            "pattern": "^[A-Za-z0-9_]+$"
                        },
                        "image": {
                            "type": "string",
                            "description": "Container image name",
                            "examples": [
                                "ubuntu:16.04",
                                "windows:1803"
                            ]
                        },
                        "endpoint": {
                            "type": "string",
                            "description": "ID of the service endpoint connecting to a private container registry"
                        },
                        "options": {
                            "type": "string",
                            "description": "Options to pass into container host"
                        },
                        "localImage": {
                            "$ref": "#/definitions/booleanMacroExpression",
                            "description": "Build the image locally?"
                        },
                        "env": {
                            "type": "object",
                            "description": "Variables to map into the container's environment"
                        }
                    }
                },
                "trigger": {
                    "oneOf": [
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        },
                        {
                            "type": "object",
                            "properties": {
                                "branches": {
                                    "type": "object",
                                    "properties": {
                                        "include": {
                                            "type": "array",
                                            "items": {
                                                "type": "string"
                                            }
                                        },
                                        "exclude": {
                                            "type": "array",
                                            "items": {
                                                "type": "string"
                                            }
                                        }
                                    }
                                },
                                "paths": {
                                    "type": "object",
                                    "properties": {
                                        "include": {
                                            "type": "array",
                                            "items": {
                                                "type": "string"
                                            }
                                        },
                                        "exclude": {
                                            "type": "array",
                                            "items": {
                                                "type": "string"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    ]
                },
                "parameters": {
                    "type": "object"
                },
                "stepOrTemplateExpression": {
                    "oneOf": [
                        { "$ref": "#/definitions/step" },
                        { "$ref": "#/definitions/templateInsertExpression" }
                    ]
                },
                "step": {
                    "oneOf": [
                        { "$ref": "#/definitions/script" },
                        { "$ref": "#/definitions/bash" },
                        { "$ref": "#/definitions/powershell" },
                        { "$ref": "#/definitions/checkout" },
                        { "$ref": "#/definitions/templateReference" },
                        { "$ref": "#/definitions/task" }
                    ]
                },
                "booleanMacroExpression": {
                    "oneOf": [
                        { "type": "boolean" },
                        { "$ref": "#/definitions/macroExpression" }
                    ]
                },
                "integerMacroExpression": {
                    "oneOf": [
                        { "type": "integer" },
                        { "$ref": "#/definitions/macroExpression" }
                    ]
                },
                "macroExpression": {
                    "type": "string",
                    "pattern": "^\\$\\(.*\\)$"
                },
                "templateInsertExpression": {
                    "type": "string",
                    "pattern": "^\\${{.*}}$"
                },
                "task": {
                    "type": "object",
                    "required": [
                        "task"
                    ],
                    "anyOf": anyOf,
                    "properties": {
                        "task": {
                            "$comments": "TODO: generate all of these",
                            "enum": [
                                "AndroidBuild@1", "AndroidSigning@2", "AndroidSigning@1", "Ant@1", "ApacheJMeterLoadTest@1", "AppCenterDistribute@0", "AppCenterTest@1", "ArchiveFiles@2", "ArchiveFiles@1", "AzureAppServiceManage@0", "AzureCLI@1",
                                "AzureCLI@0", "AzureCloudPowerShellDeployment@1", "AzureFileCopy@1", "AzureFunction@1", "AzureFunction@0", "AzureKeyVault@1", "AzureMonitor@0", "AzureMonitorAlerts@0", "AzureMysqlDeployment@1", "AzureNLBManagement@1",
                                "AzurePowerShell@3", "AzurePowerShell@2", "AzurePowerShell@1", "AzureResourceGroupDeployment@2", "AzureResourceGroupDeployment@1", "AzureRmWebAppDeployment@4", "AzureRmWebAppDeployment@3", "AzureRmWebAppDeployment@2",
                                "AzureVmssDeployment@0", "AzureWebPowerShellDeployment@1", "Bash@3", "BatchScript@1", "Chef@1", "ChefKnife@1", "CloudLoadTest@1", "CMake@1", "CmdLine@2", "CmdLine@1", "CocoaPods@0", "CopyFiles@2", "CopyFiles@1",
                                "CopyFilesOverSSH@0", "CopyPublishBuildArtifacts@1", "cURLUploader@2", "cURLUploader@1", "DecryptFile@1", "Delay@1", "DeleteFiles@1", "DeployVisualStudioTestAgent@2", "DeployVisualStudioTestAgent@1", "Docker@0",
                                "DockerCompose@0", "DotNetCoreCLI@2", "DotNetCoreCLI@1", "DotNetCoreCLI@0", "DotNetCoreInstaller@0", "DownloadBuildArtifacts@0", "DownloadPackage@0", "DownloadSecureFile@1", "ExtractFiles@1", "FtpUpload@1", "Go@0",
                                "GoTool@0", "Gradle@2", "Gradle@1", "Grunt@0", "Gulp@0", "HelmDeploy@0", "IISWebAppDeployment@1", "IISWebAppDeploymentOnMachineGroup@0", "IISWebAppManagementOnMachineGroup@0", "InstallAppleCertificate@1",
                                "InstallAppleCertificate@0", "InstallAppleProvisioningProfile@1", "InstallAppleProvisioningProfile@0", "InstallSSHKey@0", "InvokeRESTAPI@1", "InvokeRESTAPI@0", "JavaToolInstaller@0", "JenkinsDownloadArtifacts@1",
                                "JenkinsQueueJob@2", "JenkinsQueueJob@1", "Kubernetes@0", "ManualIntervention@8", "Maven@2", "Maven@1", "MSBuild@1", "NodeTool@0", "Npm@1", "Npm@0", "npmAuthenticate@0", "NuGet@0", "NuGetCommand@2", "NuGetInstaller@0",
                                "NuGetPackager@0", "NuGetPublisher@0", "NuGetRestore@1", "NuGetToolInstaller@0", "PackerBuild@0", "PowerShell@2", "PowerShell@1", "PowerShellOnTargetMachines@2", "PowerShellOnTargetMachines@1", "PublishBuildArtifacts@1",
                                "PublishCodeCoverageResults@1", "PublishSymbols@2", "PublishSymbols@1", "PublishTestResults@2", "PublishTestResults@1", "PublishToAzureServiceBus@1", "PublishToAzureServiceBus@0", "PyPIPublisher@0", "queryWorkItems@0",
                                "QuickPerfTest@1", "RunVisualStudioTestsusingTestAgent@1", "ServiceFabricComposeDeploy@0", "ServiceFabricDeploy@1", "ServiceFabricPowerShell@1", "ServiceFabricUpdateAppVersions@1", "ServiceFabricUpdateManifests@2",
                                "ShellScript@2", "SonarQubePostTest@1", "SonarQubePreBuild@1", "SqlAzureDacpacDeployment@1", "SqlDacpacDeploymentOnMachineGroup@0", "SqlServerDacpacDeployment@1", "SSH@0", "VisualStudioTestPlatformInstaller@1",
                                "VSBuild@1", "VSMobileCenterTest@0", "VSTest@2", "VSTest@1", "WindowsMachineFileCopy@2", "WindowsMachineFileCopy@1", "XamarinAndroid@1", "XamarinComponentRestore@0", "XamariniOS@1", "XamarinLicense@1",
                                "XamarinTestCloud@1", "Xcode@4", "Xcode@3", "Xcode@2", "XcodePackageiOS@0"
                            ],
                            "description": "Task reference including major version"
                        },
                        "displayName": {
                            "type": "string",
                            "description": "Human-readable name for the task"
                        },
                        "name": {
                            "type": "string",
                            "description": "ID of the task instance",
                            "pattern": "^[_A-Za-z0-9]*$"
                        },
                        "condition": {
                            "type": "string",
                            "description": "Evaluate this condition expression to determine whether to run this task"
                        },
                        "continueOnError": {
                            "type": "boolean",
                            "description": "Continue running the parent phase even on failure?"
                        },
                        "enabled": {
                            "type": "boolean",
                            "description": "Run this task when the phase runs?"
                        },
                        "timeoutInMinutes": {
                            "type": "integer",
                            "description": "Time to wait for this task to complete before the server kills it"
                        },
                        "inputs": {
                            "type": "object",
                            "description": "Task-specific inputs"
                        },
                        "env": {
                            "type": "object",
                            "description": "Variables to map into the process's environment"
                        }
                    },
                    "additionalProperties": false
                }
            }
        };

        return JSON.stringify(fullSchema, null, 2);
    }

    public getSchemaFromTask(task: DTTask): string {
        let schema: any = {
            properties: {
                task: {},
                inputs: {
                    properties: {}
                }
            }
        };

        schema.properties.task.pattern = '^' + this.makeCaseInsensitiveRegexFromTaskName(task.name) + '@' + task.version.major.toString() + '$';
        schema.properties.task.description = this.cleanString(task.friendlyName) + '\n\n' + this.cleanString(task.description);
        schema.properties.inputs.description = this.cleanString(task.friendlyName) + " inputs";

        var that = this;

        if (task.inputs) {
            task.inputs.forEach(function (input: InputsEntity) {
                if (!input) {
                    return;
                }

                let thisProp: any = {};
                const name = that.cleanString(input.name);
                const description = input.label;
                thisProp = {
                    description: description
                };

                // map input types to those that are allowed by json-schema
                const inputType: string = input.type.toLowerCase();
                if ((inputType == 'picklist' || inputType == 'radio') && input.options) {
                    thisProp['enum'] = Object.keys(input.options);
                }
                else if (inputType == 'boolean') {
                    thisProp.type = 'boolean';
                }
                else if (inputType == 'multiline'
                    || inputType == 'string'
                    || inputType == 'filepath'
                    || inputType == 'securefile'
                    || inputType == 'identities'
                    || inputType.startsWith('connectedservice')
                    || inputType == 'picklist'
                    || inputType == 'radio' // TODO: Is it true that radio with no input.options becomes a string? Seems wrong. It does exist in dt-tasks-json-response.json
                    || inputType == 'querycontrol') {
                    thisProp.type = 'string';
                }
                else if (inputType == 'int') {
                    thisProp.type = 'integer';
                } 
                else {
                    throw new Error(`Unable to find input type mapping '${input.type}'.`);
                }

                schema.properties.inputs.properties[name] = thisProp;
            });
        }

        return JSON.stringify(schema, null, 2);
    }

    // Allow either upper or lowercase for characters that are uppercase in task definition.
    makeCaseInsensitiveRegexFromTaskName(taskName: string): string {
        let response: string = "";

        for (var c of taskName) {
            if (c === c.toUpperCase()) {
                response += "[" + c.toLowerCase() + c.toUpperCase() + "]";
            } else {
                response += c;
            }
        }

        return response;
    };

    cleanString(str: string): string {
        if (str) {
            return str.replace(/\r/g, '')
                .replace(/\n/g, '')
                .replace(/\"/g, '');
        }

        return str;
    }
}
