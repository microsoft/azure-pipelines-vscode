/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License.
*--------------------------------------------------------------------------------------------*/

import { DTTask, InputsEntity } from "./dtdata";
import * as logger from './logger';
import * as schemata from './schemata';

export interface IYamlSchemaService {
    getFullSchema(tasks: DTTask[]): object;
}

interface ITaskNameData {
    name: string;
    version: number;
    description: string;
}

interface ITaskEnum {
    enum: string[];
    description: string;
    ignoreCase: string;
}

export class YamlSchemaService implements IYamlSchemaService {
    public getFullSchema(tasks: DTTask[]): object {
        logger.log('getSchemaFromTasks');
        let taskDefinitions: object[] = [];
        let taskNameData: ITaskNameData[] = [];

        for (var i = 0; i < tasks.length; i++) {
            const taskSchema: object = this.getSchemaFromTask(tasks[i]);
            taskDefinitions.push(taskSchema);
            taskNameData.push({
                name: tasks[i].name,
                version: tasks[i].version.major,
                description: tasks[i].description
            });
        }

        taskNameData.sort((a, b) => {
            if (a.name > b.name) { return 1; }
            if (a.name < b.name) { return -1; }

            // names are the same, so compare version number.
            // we want to reverse sort so that Foo@2 shows up earlier than Foo@1
            return b.version - a.version;
        });

        const taskNameEnums: ITaskEnum[] = taskNameData.map((item) => {
            return {
                enum: [ item.name + "@" + item.version],
                description: item.description,
                ignoreCase: "value"
            };
        });

        const fullSchema = schemata.schema143
                                   .replace('"{{{taskDefinitions}}}"', JSON.stringify(taskDefinitions))
                                   .replace('"{{{taskNameEnums}}}"', '{ "oneOf":' + JSON.stringify(taskNameEnums) + '}');

        return JSON.parse(fullSchema);
    }

    public getSchemaFromTask(task: DTTask): object {
        let schema: any = {
            firstProperty: ['task'],
            required: ['task'],
            properties: {
                task: {},
                inputs: {
                    properties: {},
                    required: []
                }
            }
        };

        schema.properties.task.pattern = '^' + task.name + '@' + task.version.major.toString() + '$';
        schema.properties.task.description = this.cleanString(task.friendlyName) + '\n\n' + this.cleanString(task.description);
        schema.properties.task.ignoreCase = "value";
        schema.properties.inputs.additionalProperties = false;
        schema.properties.inputs.description = this.cleanString(task.friendlyName) + " inputs";

        var that = this;

        let hasRequiredInputs: boolean = false;

        if (task.inputs) {
            task.inputs.forEach(function (input: InputsEntity) {
                if (!input) {
                    return;
                }

                let thisProp: any = {};
                const name: string = that.cleanString(input.name);
                const description: string = input.label;
                thisProp = {
                    description: description,
                    ignoreCase: "key"
                };

                // map input types to those that are allowed by json-schema
                const inputType: string = input.type.toLowerCase();
                if ((inputType === 'picklist' || inputType === 'radio') && input.options) {
                    thisProp['enum'] = Object.keys(input.options);
                    thisProp.ignoreCase = "all";
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

                if (input.required) {
                    schema.properties.inputs.required.push(name);
                    hasRequiredInputs = true;
                }
            });
        }

        if (hasRequiredInputs) {
            schema.required.push("inputs");
        }

        return schema;
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
