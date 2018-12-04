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

export class YamlSchemaService implements IYamlSchemaService {
    public getFullSchema(tasks: DTTask[]): object {
        logger.log('getSchemaFromTasks');
        let taskDefinitions: object[] = [];
        let taskVersions: [string, number][] = [];

        for (var i = 0; i < tasks.length; i++) {
            const taskSchema: object = this.getSchemaFromTask(tasks[i]);
            taskDefinitions.push(taskSchema);
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

        const taskNames: string[] = taskVersions.map((item) => item[0] + "@" + item[1]);

        const fullSchema = schemata.schema143
                                   .replace('"{{{taskDefinitions}}}"', JSON.stringify(taskDefinitions))
                                   .replace('"{{{taskNames}}}"', JSON.stringify(taskNames));

        return JSON.parse(fullSchema);
    }

    public getSchemaFromTask(task: DTTask): object {
        let schema: any = {
            firstProperty: ['task'],
            properties: {
                task: {},
                inputs: {
                    properties: {}
                }
            }
        };

        schema.properties.task.pattern = '^' + task.name + '@' + task.version.major.toString() + '$';
        schema.properties.task.description = this.cleanString(task.friendlyName) + '\n\n' + this.cleanString(task.description);
        schema.properties.task.ignoreCase = "value";
        schema.properties.inputs.additionalProperties = false;
        schema.properties.inputs.description = this.cleanString(task.friendlyName) + " inputs";

        var that = this;

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
            });
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
