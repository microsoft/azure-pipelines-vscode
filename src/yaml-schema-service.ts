/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { DTTask, InputsEntity } from "./dtdata";
import * as logger from './logger';
import * as schemata from './schemata';

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

        let fullSchema = schemata.schema140
                         .replace('"{{{anyOf}}}"', JSON.stringify(anyOf))
                         .replace('"{{{taskNames}}}"', JSON.stringify(taskNames));

        // prettify before returning. TODO: make this optional
        return JSON.stringify(JSON.parse(fullSchema), null, 2);
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
