import fs from 'node:fs/promises';
import path from 'node:path';

if (process.argv.length <= 2) {
    usage();
} else {
    const options = parseOptions(process.argv);

    const data = await fs.readFile(options.input, 'utf-8');
    await fs.mkdir(options.outputDir, { recursive: true });
    await extractYaml(data, options.outputDir);
}

function usage(): void {
    console.log("usage: extract-yaml-testcases <inputfile> [<outputdir>]");
}

function parseOptions(rawArgs: string[]): { input: string, outputDir: string } {
    const interestingArgs = rawArgs.slice(2);
    if (interestingArgs.length > 2) {
        usage();
        process.exit(1);
    }

    return {
        input: interestingArgs[0],
        outputDir: interestingArgs[1] ?? "./output"
    };
}

async function extractYaml(fileData: string, outputDir: string): Promise<void> {
    // find the TestMethod-attributed code blocks, extract their name and contents
    const matcher = /\[TestMethod\][^]*?public void (.*?)\([^]*?\{([^]*?)\}/g;
    let chunk = matcher.exec(fileData);
    while (chunk !== null) {
        await outputYaml(chunk[1], chunk[2], outputDir);
        chunk = matcher.exec(fileData);
    }
}

async function outputYaml(name: string, body: string, outputDir: string): Promise<void> {
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
        await fs.writeFile(finalFileName, cookedContents, 'utf8');
        mlString = multilineStringMatcher.exec(body);
        number++;
    }
}
