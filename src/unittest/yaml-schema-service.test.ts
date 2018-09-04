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
        runTaskTest('npm-task.json', 'npm-schema.json');
    });

    test('Input types are correctly mapped to json schema types', function() {
        runTaskTest('all-inputs-task.json', 'all-inputs-schema.json');
    });

    test('Task name pattern uses regex for any characters that are uppercase in task name', function() {
        runTaskTest('nameregex-task.json', 'nameregex-schema.json');
    });

    // test('Special characters are escaped', function() {

    // });

    // test('Missing input type mapping throws exception', function() {
        
    // });

    // test('Missing task fields throws exception', function() {
        
    // });
});

function runTaskTest(taskJsonFile: string, schemaFile: string) {
    // Arrange
    const taskJsonPath: string = path.join(taskTestDataRoot, taskJsonFile);
    const schemaPath: string = path.join(taskSchemaDataRoot, schemaFile);
    
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
