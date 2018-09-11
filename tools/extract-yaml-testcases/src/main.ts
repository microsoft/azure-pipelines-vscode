const fs = require('fs');
const path = require('path');

if (process.argv.length <= 2) {
    usage();
} else {
    let options = parseOptions(process.argv);
    console.log(options);

    fs.readFile(options.input, 'utf8', (err: NodeJS.ErrnoException, data: string) => {
        if (err) {
            if (err.code === 'ENOENT') {
                console.error('could not read input file');
                process.exit(1);
            }
            
            console.error('some error reading input file');
            process.exit(1);
        }
      
        fs.mkdir(options.outputDir, (err: NodeJS.ErrnoException) => {
            if (err && err.code !== 'EEXIST') {
                console.error('error creating output directory');
                process.exit(1);
            }

            // here we do something with the input file
            extractYaml(data, options.outputDir);
        });
    });
}

function usage() {
    console.log("usage: extract-yaml-testcases <inputfile> [<outputdir>]");
}

function parseOptions(rawArgs: string[]) {
    let interestingArgs = rawArgs.slice(2);
    if (interestingArgs.length > 2) {
        usage();
        process.exit(1);
    }

    return {
        input: interestingArgs[0],
        outputDir: interestingArgs[1] || "./output"
    };
}

function extractYaml(fileData: string, outputDir: string) {
    // find the TestMethod-attributed code blocks, extract their name and contents
    const matcher = /\[TestMethod\][^]*?public void (.*?)\([^]*?\{([^]*?)\}/g;
    let chunk = matcher.exec(fileData);
    while (chunk !== null) {
        outputYaml(chunk[1], chunk[2], outputDir);
        chunk = matcher.exec(fileData);
    }
}

function outputYaml(name: string, body: string, outputDir: string) {
    const testCaseName = name.split('_').slice(1).join('_');
    const outputBaseName = path.join(outputDir, testCaseName);

    const multilineStringMatcher = /@"([^]*?)"/g;
    let mlString = multilineStringMatcher.exec(body);
    let number = 0;
    while (mlString !== null) {
        const finalFileName = [outputBaseName, number.toString(), 'yml'].join('.');
        const rawContents = mlString[1].trim();
        // replace artificial tasks "foo@1", "myTask@1", and "myOtherTask@2" with a real task name
        const cookedContents = rawContents.replace(/foo@1|myTask@1|myOtherTask@2/gi, "Bash@3");
        fs.writeFile(finalFileName, cookedContents, 'utf8', (err: NodeJS.ErrnoException) => {
            if (err) {
                console.error('trouble writing ' + finalFileName);
            }
        });
        mlString = multilineStringMatcher.exec(body);
        number++;
    }
}