const fs = require('fs');

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
    console.log('-=-=-=-=-=-=-=-=-=-=-');
    console.log(outputDir);

    console.log(`name: ${name}`);  // function name
    console.log(body);  // function body
}