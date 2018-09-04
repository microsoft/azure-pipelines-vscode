import * as assert from "assert";
import { DTTask } from '../dtdata';
import * as fs from 'fs';
import * as path from 'path';
import { YamlSchemaService } from '../yaml-schema-service';

const testDataFolder = 'src/unittest/testdata'
const taskTestDataRoot = path.join(testDataFolder, 'tasks');
const taskSchemaDataRoot = path.join(testDataFolder, 'schemas');

suite("Yaml Schema Service Tests", function () {
    
    test('Task yaml is structured correctly', function() {
        const taskJsonPath: string = path.join(taskTestDataRoot, 'npm-task.json');
        const schemaPath: string = path.join(taskSchemaDataRoot, 'npm-schema.json');    

        runTaskTest(taskJsonPath, schemaPath);
    });

    test('Input types are correctly mapped to json schema types', function() {
        const taskJsonPath: string = path.join(taskTestDataRoot, 'all-inputs-task.json');
        const schemaPath: string = path.join(taskSchemaDataRoot, 'all-inputs-schema.json');    

        runTaskTest(taskJsonPath, schemaPath);
    });

    // test('Task name pattern uses regex for any characters that are uppercase in task name', function() {

    // });

    // test('Special characters are escaped', function() {

    // });

    // test('Missing input type mapping throws exception', function() {
        
    // });

    // test('Picklist or radio with no options throws exception', function() {
        
    // });

    // test('Missing task fields throws exception', function() {
        
    // });
});

function runTaskTest(taskJsonPath: string, schemaPath: string) {
    // Arrange
    const npmTask: string = fs.readFileSync(taskJsonPath, 'utf8');
    const task: DTTask = JSON.parse(npmTask);
    
    const npmSchema: string = fs.readFileSync(schemaPath, 'utf8');
    const expectedSchema: any = JSON.parse(npmSchema);

    const yamlSchemaService = new YamlSchemaService();

    // Act
    const schema: string = yamlSchemaService.getSchemaFromTask(task);

    // Assert
    assert.equal(schema, JSON.stringify(expectedSchema, null, 2));
}
