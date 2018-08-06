// The YAML language server loads schemas from a schema store on the web.
// These schemas take precedence over schemas loaded by the user.
// If the user happens to have files that match the wildcard of a schema
//  store then unexpected parsing will be used.
// 
// In this script we comment out the loading of schema store settings so 
//  that an HTTP request isn't made in the first place and unexpected 
//  schema files are not loaded.

import * as fs from 'fs';

var filePath = 'node_modules\\yaml-language-server\\out\\server\\src';
var fileContents = fs.readFileSync(filePath).toString().split("\n");

var errorText = 'setSchemaStoreSettingsIfNotSet();';
var replaceResults = 'Error text not found';

for(i in fileContents) {
    if (fileContents[i] === errorText) {
        fileContents[i] = '//' + errorText;
        replaceResults = 'Error text replaced'
    }

    if (fileContents[i].indexOf(errorText) === 2) {
        replaceResults = 'Error text was already replaced'
    }
}

fs.writeFileSync(filePath, fileContents.join('\n'));

console.log(`File update complete. Result: ${replaceResults}`);
