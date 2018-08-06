// The YAML language server loads schemas from a schema store on the web.
// These schemas take precedence over schemas loaded by the user.
// If the user happens to have files that match the wildcard of a schema
//  store then unexpected parsing will be used.
// 
// In this script we comment out the loading of schema store settings so 
//  that an HTTP request isn't made in the first place and unexpected 
//  schema files are not loaded.
// 
// This function is called in two places so we want to comment both.
// 

var fs = require('fs');

var filePath = 'node_modules\\yaml-language-server\\out\\server\\src\\server.js';
var fileContents = fs.readFileSync(filePath).toString().split("\n");

var errorText = 'setSchemaStoreSettingsIfNotSet();';
var replaceResults = [];

for(i in fileContents) {
    var lineContent = fileContents[i].trim();

    if (lineContent === errorText) {
        fileContents[i] = '//' + errorText;
        replaceResults.push('Error text replaced');
        continue;
    }

    if (lineContent.indexOf(errorText) === 2) {
        replaceResults.push('Error text was already replaced');
        continue;
    }
}

if (replaceResults.length === 1) {
    replaceResults.push('Error text not found');
}

fs.writeFileSync(filePath, fileContents.join('\n'));

console.log(`File update complete. \nResult(s):\n${replaceResults.join('\n')}`);
