import * as fs from 'fs';

export class PythonRequirementsParser {
    requirementsFilePath: string;
    regex: RegExp = new RegExp(/^([A-Za-z0-9][A-Za-z0-9._-]*[A-Za-z0-9]|[A-Za-z0-9])/);

    constructor(filePath: string){
        this.requirementsFilePath = filePath;
    }

    public getPackages() : Array<string> {
        let packages: Array<string> = [];

        if(this.requirementsFilePath == "") {
            return null;
        }
        var fileContent: Array<string> = fs.readFileSync(this.requirementsFilePath).toString().split('\n');
        for(var line in fileContent.entries()) {
            let _line = line.trim();
            let packageName = this.TryGetPackageName(_line);
            if(!!packageName) {
                packages.push(packageName);
            }
        }

        return packages;
    }

    private TryGetPackageName(line: string): string {
        if(line.startsWith("#") || !this.regex.test(line)) {
            return null;
        }

        let matches: Array<string> = this.regex.exec(line);
        return matches[0];
    }

}