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
        let anyOf: object[] = [];
        let taskVersions: [string, number][] = [];

        for (var i = 0; i < tasks.length; i++) {
            const taskSchema: object = this.getSchemaFromTask(tasks[i]);
            anyOf.push(taskSchema);
            taskVersions.push([tasks[i].name, tasks[i].version.major]);
        }

        taskVersions.sort((a, b) => {
            // first compare strings
            if (a[0] > b[0]) { return 1; }
            if (a[0] < b[0]) { return -1; }

            // strings are the same, so compare version number.
            // we want to reverse sort so that Foo@2 shows up earlier than Foo@1
            return b[1] - a[1];
        });

        const taskNames = taskVersions.map((item) => item[0] + "@" + item[1]);

        // TODO: Find a cleaner way to do this... breakdown definitions to their own
        let fullSchema = {
            "$schema": "http://json-schema.org/draft-07/schema#",
            "$id": "https://github.com/Microsoft/vsts-agent/blob/master/src/Misc/ci-schema.json",
            "$comment": "v1.140.0",
            "title": "Pipeline schema",
            "description": "A pipeline definition",
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
                "$ref": "#/definitions/resources"
              },
              "variables": {
                "description": "Pipeline-wide variables",
                "type": "object"
              },
              "jobs": {
                "description": "Jobs which make up the pipeline",
                "type": "array",
                "items": {
                  "$ref": "#/definitions/job"
                }
              },
              "pool": {
                "oneOf": [
                  {
                    "type": "string"
                  },
                  {
                    "$ref": "#/definitions/pool"
                  }
                ],
                "description": "Pool where this job will run"
              },
              "steps": {
                "type": "array",
                "description": "A list of steps to run",
                "items": {
                  "$ref": "#/definitions/stepOrTemplateExpression"
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
            },
            "definitions": {
              "resources": {
                "type": "object",
                "additionalProperties": false,
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
              "job": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "job": {
                    "oneOf": [
                      {
                        "type": "string",
                        "description": "ID of the job",
                        "pattern": "^[_A-Za-z0-9]*$"
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "displayName": {
                    "type": "string",
                    "description": "Human-readable name of the job"
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
                    "description": "Any jobs which must complete before this one"
                  },
                  "condition": {
                    "type": "string",
                    "description": "Evaluate this condition expression to determine whether to run this job"
                  },
                  "continueOnError": {
                    "$ref": "#/definitions/booleanMacroExpression",
                    "description": "Continue running this job even on failure?"
                  },
                  "pool": {
                    "oneOf": [
                      {
                        "type": "string"
                      },
                      {
                        "$ref": "#/definitions/pool"
                      }
                    ],
                    "description": "Pool where this job will run"
                  },
                  "server": {
                    "$ref": "#/definitions/booleanMacroExpression",
                    "description": "True if this is an agent-less job (runs on server)"
                  },
                  "strategy": {
                    "$ref": "#/definitions/strategy",
                    "description": "Execution strategy for this job"
                  },
                  "variables": {
                    "type": "object",
                    "description": "Job-specific variables"
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
                    "description": "Reference to a template for this job"
                  },
                  "parameters": {
                    "description": "Parameters used in a pipeline template",
                    "type": "object"
                  }
                }
              },
              "pool": {
                "type": "object",
                "description": "Pool details",
                "additionalProperties": false,
                "properties": {
                  "name": {
                    "type": "string",
                    "description": "Name of a pool"
                  },
                  "vmImage": {
                    "type": "string",
                    "description": "For the Azure Pipelines pool, the name of the VM image to use"
                  },
                  "demands": {
                    "oneOf": [
                      {
                        "type": "string"
                      },
                      {
                        "type": "object"
                      }
                    ],
                    "description": "List of demands (for a private pool)"
                  },
                  "timeoutInMinutes": {
                    "$ref": "#/definitions/integerMacroExpression",
                    "description": "Time to wait before cancelling the job"
                  },
                  "cancelTimeoutInMinutes": {
                    "$ref": "#/definitions/integerMacroExpression",
                    "description": "Time to wait for the job to cancel before forcibly terminating it"
                  }
                }
              },
              "strategy": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "maxParallel": {
                    "$ref": "#/definitions/integerMacroExpression",
                    "description": "Maximum number of parallel agent executions"
                  },
                  "matrix": {
                    "$ref": "#/definitions/matrix"
                  }
                }
              },              "server": {
                "type": "object",
                "description": "Server job details",
                "additionalProperties": false,
                "properties": {
                  "timeoutInMinutes": {
                    "$ref": "#/definitions/integerMacroExpression",
                    "description": "Time to wait before cancelling the job"
                  },
                  "cancelTimeoutInMinutes": {
                    "$ref": "#/definitions/integerMacroExpression",
                    "description": "Time to wait for the job to cancel before forcibly terminating it"
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
                "required": [
                  "script"
                ],
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
                    "description": "Continue running the parent job even on failure?"
                  },
                  "enabled": {
                    "$ref": "#/definitions/booleanMacroExpression",
                    "description": "Run this script when the job runs?"
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
                "required": [
                  "bash"
                ],
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
                    "description": "Continue running the parent job even on failure?"
                  },
                  "enabled": {
                    "$ref": "#/definitions/booleanMacroExpression",
                    "description": "Run this script when the job runs?"
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
                "required": [
                  "powershell"
                ],
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
                    "enum": [
                      "stop",
                      "continue",
                      "silentlyContinue"
                    ],
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
                    "description": "Continue running the parent job even on failure?"
                  },
                  "enabled": {
                    "$ref": "#/definitions/booleanMacroExpression",
                    "description": "Run this script when the job runs?"
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
                "required": [
                  "checkout"
                ],
                "additionalProperties": false,
                "properties": {
                  "checkout": {
                    "enum": [
                      "self",
                      "none"
                    ],
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
                "required": [
                  "template"
                ],
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
                "required": [
                  "repository",
                  "type"
                ],
                "additionalProperties": false,
                "properties": {
                  "repository": {
                    "type": "string",
                    "description": "ID for the external repository",
                    "pattern": "^[A-Za-z0-9_]+$"
                  },
                  "type": {
                    "enum": [
                      "github"
                    ],
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
                "required": [
                  "container",
                  "image"
                ],
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
                  {
                    "$ref": "#/definitions/step"
                  },
                  {
                    "$ref": "#/definitions/stepInsertExpression"
                  }
                ]
              },
              "step": {
                "oneOf": [
                  {
                    "$ref": "#/definitions/script"
                  },
                  {
                    "$ref": "#/definitions/bash"
                  },
                  {
                    "$ref": "#/definitions/powershell"
                  },
                  {
                    "$ref": "#/definitions/checkout"
                  },
                  {
                    "$ref": "#/definitions/templateReference"
                  },
                  {
                    "$ref": "#/definitions/task"
                  }
                ]
              },
              "booleanMacroExpression": {
                "oneOf": [
                  {
                    "type": "boolean"
                  },
                  {
                    "$ref": "#/definitions/macroExpression"
                  }
                ]
              },
              "integerMacroExpression": {
                "oneOf": [
                  {
                    "type": "integer"
                  },
                  {
                    "$ref": "#/definitions/macroExpression"
                  }
                ]
              },
              "macroExpression": {
                "type": "string",
                "pattern": "^\\$\\(.*\\)$"
              },
              "stepInsertExpression": {
                "type": "object",
                "description": "Conditionally insert one or more steps",
                "maxProperties": 1,
                "minProperties": 1,
                "patternProperties": {
                  "^\\${{.*}}$": {
                    "type":"array",
                    "items": {
                      "$ref": "#/definitions/step"
                    }
                  }
                }
              },
              "task": {
                "type": "object",
                "required": [
                  "task"
                ],
                "anyOf": anyOf,
                "properties": {
                  "task": {
                    "enum": taskNames,
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
                    "description": "Continue running the parent job even on failure?"
                  },
                  "enabled": {
                    "type": "boolean",
                    "description": "Run this task when the job runs?"
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

    public getSchemaFromTask(task: DTTask): object {
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
                if ((inputType === 'picklist' || inputType === 'radio') && input.options) {
                    thisProp['enum'] = Object.keys(input.options);
                }
                else if (inputType === 'boolean') {
                    thisProp.type = 'boolean';
                }
                else if (inputType === 'multiline'
                    || inputType === 'string'
                    || inputType === 'filepath'
                    || inputType === 'securefile'
                    || inputType === 'identities'
                    || inputType.startsWith('connectedservice')
                    || inputType === 'picklist'
                    || inputType === 'radio'
                    || inputType === 'querycontrol') {
                    thisProp.type = 'string';
                }
                else if (inputType === 'int') {
                    thisProp.type = 'integer';
                } 
                else {
                    throw new Error(`Unable to find input type mapping '${input.type}'.`);
                }

                schema.properties.inputs.properties[name] = thisProp;
            });
        }

        return schema;
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
    }

    cleanString(str: string): string {
        if (str) {
            return str.replace(/\r/g, '')
                .replace(/\n/g, '')
                .replace(/\"/g, '');
        }

        return str;
    }
}
