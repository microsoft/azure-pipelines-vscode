/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License.
*--------------------------------------------------------------------------------------------*/

import * as assert from "assert";
import { DTTask } from '../dtdata';
import * as fs from 'fs';
import * as path from 'path';
import { YamlSchemaService } from '../yaml-schema-service';

const testDataFolder: string = 'src/unittest/testdata'
const taskTestDataRoot: string = path.join(testDataFolder, 'tasks');
const taskSchemaDataRoot: string = path.join(testDataFolder, 'schemas');

suite("Yaml Schema Service Tests", function () {
    
    test('Task yaml is structured correctly', function() {
        runTaskTest('npm-task.json', 'npm-schema.json');
    });

    test('Input types are correctly mapped to json schema types', function() {
        runTaskTest('all-inputs-task.json', 'all-inputs-schema.json');
    });

    test('Task name pattern uses regex for any characters that are uppercase in task name', function() {
        runTaskTest('nameregex-task.json', 'nameregex-schema.json');
    });

    test('Special characters are removed', function() {
        runTaskTest('special-characters-task.json', 'special-characters-schema.json');
    });

    test('Missing input type mapping throws exception', function() {
        // throw new Error(`Unable to find input type mapping '${input.type}'.`);
       runTaskExceptionTest('missing-input-mapping-exception-task.json', 'Unable to find input type mapping X.');
    });

    // test('Missing task fields throws exception', function() {
    //     runExceptionTest();
    // });

    test('Given a list of tasks, the schema is structured as expected', function() {
        runFullSchemaTest(['npm-task.json', 'all-inputs-task.json', 'nameregex-task.json'], 'full-schema.json');
    });
});

function runFullSchemaTest(taskJsonFiles: string[], schemaFile: string) {
    // Arrange
    const tasksList: DTTask[] = [];
    taskJsonFiles.forEach((taskJsonFile) => {
        const taskJsonPath: string = path.join(taskTestDataRoot, taskJsonFile);
        const taskContent: string = fs.readFileSync(taskJsonPath, 'utf8');
        const task: DTTask = JSON.parse(taskContent);

        tasksList.push(task);
    });

    const schemaPath: string = path.join(taskSchemaDataRoot, schemaFile);
    const expectedSchemaContents: string = fs.readFileSync(schemaPath, 'utf8');
    const expectedSchema: object = JSON.parse(expectedSchemaContents);
    const yamlSchemaService = new YamlSchemaService();

    // Act
    const fullSchema: object = yamlSchemaService.getFullSchema(tasksList);

    // Assert
    assert.deepEqual(fullSchema, expectedSchema);
}

function runTaskTest(taskJsonFile: string, schemaFile: string) {
    // Arrange
    const taskJsonPath: string = path.join(taskTestDataRoot, taskJsonFile);
    const schemaPath: string = path.join(taskSchemaDataRoot, schemaFile);
    
    const npmTask: string = fs.readFileSync(taskJsonPath, 'utf8');
    const task: DTTask = JSON.parse(npmTask);
    
    const npmSchema: string = fs.readFileSync(schemaPath, 'utf8');
    const expectedSchema: object = JSON.parse(npmSchema);

    const yamlSchemaService = new YamlSchemaService();

    // Act
    const schema: object = yamlSchemaService.getSchemaFromTask(task);

    // Assert
    assert.deepEqual(schema, expectedSchema);
}

function runTaskExceptionTest(taskJsonFile: string, message: string) {
    // Arrange
    const taskJsonPath: string = path.join(taskTestDataRoot, taskJsonFile);
    const npmTask: string = fs.readFileSync(taskJsonPath, 'utf8');
    const task: DTTask = JSON.parse(npmTask);
    const yamlSchemaService = new YamlSchemaService();

    // Act and Assert
    assert.throws(() => yamlSchemaService.getSchemaFromTask(task), message);
}
