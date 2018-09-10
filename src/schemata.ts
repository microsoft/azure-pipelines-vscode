const augment = function(base: object, property: string, augmentation: object) : object {
  let baseCopy = JSON.parse(JSON.stringify(base));
  const attachmentPoint = property ? baseCopy[property] : baseCopy;
  for (let commonProp in augmentation) {
    if (attachmentPoint[commonProp] === undefined) {
      attachmentPoint[commonProp] = augmentation[commonProp];
    }
  }
  return baseCopy;
}

const commonPipelineValues = {
  /* Common pipeline-global values */
  "name": {
    "description": "Pipeline name",
    "type": "string"
  },
  "trigger": {
    "description": "Continuous integration triggers",
    "$ref": "#/definitions/trigger"
  },
  "resources": {
    "description": "Containers and repositories used in the build",
    "$ref": "#/definitions/resources"
  },
  "variables": {
    "description": "Variables passed into the build",
    "type": "object"
  }
  /* End common */
};

const job140 = {
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
      "$ref": "#/definitions/booleanMacroRuntimeExpression",
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
      "$ref": "#/definitions/booleanMacroRuntimeExpression",
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
    },
    "timeoutInMinutes": {
      "$ref": "#/definitions/integerMacroRuntimeExpression",
      "description": "Time to wait before cancelling the job"
    },
    "cancelTimeoutInMinutes": {
      "$ref": "#/definitions/integerMacroRuntimeExpression",
      "description": "Time to wait for the job to cancel before forcibly terminating it"
    },
    "container": {
      "type": "string",
      "description": "Container resource name"
    }
  }
};

const jobAtRoot140 = augment(job140, "properties", commonPipelineValues);

const phase140 = {
  "type": "object",
  "additionalProperties": false,
  "description": "[DEPRECATED] Use `job` (inside `jobs`) instead",
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
      "$ref": "#/definitions/booleanMacroRuntimeExpression",
      "description": "Continue running this phase even on failure?"
    },
    "queue": {
      "oneOf": [
        {
          "type": "string"
        },
        {
          "$ref": "#/definitions/queue"
        }
      ],
      "description": "Queue where this phase will run"
    },
    "server": {
      "oneOf": [
        {
          "$ref": "#/definitions/booleanMacroRuntimeExpression"
        },
        {
          "$ref": "#/definitions/legacyServer"
        }
      ],
      "description": "True if this is an agent-less phase (runs on server)"
    },
    "matrix": {
      "$ref": "#/definitions/matrix",
      "description": "Matrix strategy for this phase"
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
};

const phaseAtRoot140 = augment(phase140, "properties", commonPipelineValues);

const stagesAtRoot140 = augment({
  "additionalProperties": false,
  "properties": {
    "stages": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/stage"
      }
    },
    "variables": {
      "type": "object",
      "description": "Variables for the entire pipeline"
    }
  }
}, "properties", commonPipelineValues);

const jobsAtRoot140 = augment({
  "additionalProperties": false,
  "required": ["jobs"],
  "properties": {
    "jobs": {
      "description": "Jobs which make up the pipeline",
      "type": "array",
      "items": {
        "$ref": "#/definitions/job"
      }
    },
    "variables": {
      "type": "object",
      "description": "Variables for this multi-job pipeline"
    }
  }
}, "properties", commonPipelineValues);

const phasesAtRoot140 = augment({
  "additionalProperties": false,
  "required": ["phases"],
  "properties": {
    "phases": {
      "description": "[DEPRECATED] Use `jobs` instead.\n\nPhases which make up the pipeline",
      "type": "array",
      "items": {
        "$ref": "#/definitions/phase"
      }
    },
    "variables": {
      "type": "object",
      "description": "Variables for this multi-phase pipeline"
    }
  }
}, "properties", commonPipelineValues);

export const schema140: string = JSON.stringify({
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$id": "https://github.com/Microsoft/vsts-agent/blob/master/src/Misc/ci-schema.json",
    "$comment": "v1.140.1",
    "title": "Pipeline schema",
    "description": "A pipeline definition",
    "$ref": "#/definitions/pipeline",
    "definitions": {
      "pipeline": {
        "type": "object",
        "anyOf": [
          //{ "$ref": "#/definitions/stagesAtRoot" },
          { "$ref": "#/definitions/jobsAtRoot" },
          { "$ref": "#/definitions/phasesAtRoot" },
          { "$ref": "#/definitions/jobAtRoot" },
          { "$ref": "#/definitions/phaseAtRoot" }
        ]
      },
      "stagesAtRoot": stagesAtRoot140,
      "jobsAtRoot": jobsAtRoot140,
      "phasesAtRoot": phasesAtRoot140,
      "jobAtRoot": jobAtRoot140,
      "phaseAtRoot": phaseAtRoot140,
      "stage": {
        /* Stages aren't implemented fully yet, so this is a placeholder */
        "type": "object",
        "additionalProperties": false
      },
      "job": job140,
      "phase": phase140,
      "resources":
      {
        "oneOf": [
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "containers": {
                "description": "List of container images",
                "type": "array",
                "items": {
                  "$ref": "#/definitions/containerReference"
                }
              },
              "repositories": {
                "description": "List of external repositories",
                "type": "array",
                "items": {
                  "$ref": "#/definitions/repositoryReference"
                }
              }
            }
          },
          {
            "type": "array",
            "description": "[DEPRECATED] Use `repositories` or `checkout` instead.\n\nRepository options"
          }
        ]
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
                "type": "array",
                "items": {
                  "type": "string"
                }
              }
            ],
            "description": "List of demands (for a private pool)"
          }
        }
      },
      "queue": {
        "type": "object",
        "description": "[DEPRECATED] Use `pool` (with `jobs`) instead.\n\nQueue details",
        "additionalProperties": false,
        "properties": {
          "name": {
            "type": "string",
            "description": "Name of a queue"
          },
          "demands": {
            "oneOf": [
              {
                "type": "string"
              },
              {
                "type": "array",
                "items": {
                  "type": "string"
                }
              }
            ],
            "description": "List of demands (for a private queue)"
          },
          "timeoutInMinutes": {
            "$ref": "#/definitions/integerMacroRuntimeExpression",
            "description": "Time to wait before cancelling the phase"
          },
          "cancelTimeoutInMinutes": {
            "$ref": "#/definitions/integerMacroRuntimeExpression",
            "description": "Time to wait for the phase to cancel before forcibly terminating it"
          },
          "parallel": {
            "$ref": "#/definitions/integerMacroRuntimeExpression",
            "description": "Maximum number of parallel agent executions"
          },
          "matrix": {
            "$ref": "#/definitions/matrix"
          },
          "container": {
            "type": "string",
            "description": "Container resource name"
          }
        }
      },
      "strategy": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "maxParallel": {
            "$ref": "#/definitions/integerMacroExpression",
            "description": "Maximum number of jobs running in parallel"
          }
        },
        "oneOf": [
          {
            "properties": {
              "matrix": {
                "$ref": "#/definitions/matrix"
              }    
            }
          },
          {
            "properties": {
              "parallel": {
                "$ref": "#/definitions/integerMacroExpression",
                "description": "Run the job this many times"
              }    
            }
          }
        ]
      },
      "legacyServer": {
        "type": "object",
        "description": "Server job details",
        "additionalProperties": false,
        "properties": {
          "timeoutInMinutes": {
            "$ref": "#/definitions/integerMacroExpression",
            "description": "Time to wait before cancelling the job"
          },
          "cancelTimeoutInMinutes": {
            "$ref": "#/definitions/integerMacroRuntimeExpression",
            "description": "Time to wait for the job to cancel before forcibly terminating it"
          },
          "parallel": {
            "$ref": "#/definitions/integerMacroRuntimeExpression",
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
            "$ref": "#/definitions/booleanMacroRuntimeExpression",
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
            "$ref": "#/definitions/booleanMacroRuntimeExpression",
            "description": "Continue running the parent job even on failure?"
          },
          "enabled": {
            "$ref": "#/definitions/booleanMacroRuntimeExpression",
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
            "$ref": "#/definitions/booleanMacroRuntimeExpression",
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
            "$ref": "#/definitions/booleanMacroRuntimeExpression",
            "description": "Continue running the parent job even on failure?"
          },
          "enabled": {
            "$ref": "#/definitions/booleanMacroRuntimeExpression",
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
            "oneOf": [
              {
                "enum": [
                  "stop",
                  "continue",
                  "silentlyContinue"
                ],
              },
              {
                "$ref": "#/definitions/macroRuntimeExpression"
              }
            ],
            "description": "Strategy for dealing with script errors"
          },
          "failOnStderr": {
            "$ref": "#/definitions/booleanMacroRuntimeExpression",
            "description": "Fail the task if output is sent to Stderr?"
          },
          "ignoreLASTEXITCODE": {
            "$ref": "#/definitions/booleanMacroRuntimeExpression",
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
            "$ref": "#/definitions/booleanMacroRuntimeExpression",
            "description": "Continue running the parent job even on failure?"
          },
          "enabled": {
            "$ref": "#/definitions/booleanMacroRuntimeExpression",
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
            "$ref": "#/definitions/booleanMacroRuntimeExpression",
            "description": "Start from a clean, freshly-fetched workdir?"
          },
          "fetchDepth": {
            "$ref": "#/definitions/integerMacroExpression",
            "description": "Depth of Git graph to fetch"
          },
          "lfs": {
            "$ref": "#/definitions/booleanMacroRuntimeExpression",
            "description": "Fetch Git-LFS objects?"
          },
          "submodules": {
            "$ref": "#/definitions/booleanMacroRuntimeExpression",
            "description": "Check out Git submodules?"
          },
          "persistCredentials": {
            "$ref": "#/definitions/booleanMacroRuntimeExpression",
            "description": "Keep credentials available for later use?"
          },
          "condition": {
            "$ref": "#/definitions/booleanMacroRuntimeExpression",
            "description": "Is this step enabled?"
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
          },
          "clean": {
            "description": "Scorch the repo before fetching?",
            "$ref": "#/definitions/booleanMacroRuntimeExpression"
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
            "description": "Container image tag",
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
            "$ref": "#/definitions/booleanMacroRuntimeExpression",
            "description": "Build the image locally?"
          },
          "env": {
            "type": "object",
            "description": "Variables to map into the container's environment"
          },
          "type": {
            "type": "string",
            "description": "Container type"
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
      "booleanMacroRuntimeExpression": {
        "oneOf": [
          {
            "type": "boolean"
          },
          {
            "$ref": "#/definitions/runtimeExpression"
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
      "integerMacroRuntimeExpression": {
        "oneOf": [
          {
            "type": "integer"
          },
          {
            "$ref": "#/definitions/runtimeExpression"
          },
          {
            "$ref": "#/definitions/macroExpression"
          }
        ]
      },
      "macroRuntimeExpression": {
        "oneOf": [
          {
            "$ref": "#/definitions/runtimeExpression"
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
      "runtimeExpression": {
        "type": "string",
        "pattern": "^\\$\\[.*\\]$"
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
        "anyOf": "{{{anyOf}}}",
        "properties": {
          "task": {
            "enum": "{{{taskNames}}}",
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
  });