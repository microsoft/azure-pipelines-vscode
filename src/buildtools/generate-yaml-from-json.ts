// This script lets us generate yaml schema from the task json returned from the server.
// We will use this when we update the local-schema that is packaged with the extension.
// Before running this we will want to get the latest tasks json (not to be confused with task.json)
//  from the server and store it in dt-tasks-json-response.json. We can probably add that step to this
//  script.

import { DTData } from "../dtdata";
import { IYamlSchemaService, YamlSchemaService } from "../yaml-schema-service";

var fs = require('fs');

// Load task data from local file. This needs to be manually updated each sprint for now.
const tasksJsonFromServer = fs.readFileSync('dt-tasks-json-response.json');
const tasksData: DTData = JSON.parse(tasksJsonFromServer) as DTData;

// Generate yaml schema based on tasks data.
const yamlSchemaService: IYamlSchemaService = new YamlSchemaService();

if (tasksData.value) {
    const schema: string = yamlSchemaService.getSchemaFromTasks(tasksData.value);

    //  Store the yaml schema file in local-schema.json.
    fs.writeFileSync('local-schema.json', schema);

    console.log('Yaml generation complete.');
} else {
    console.log('Unable to generate yaml, no tasks found in dt-tasks-json-response.json.');
}
