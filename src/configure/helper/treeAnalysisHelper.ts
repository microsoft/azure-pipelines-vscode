import * as fs from 'fs';
import * as Q from 'q';
import * as path from 'path';

const ignoredDirectories = ['.git', '.vscode'];

export class TreeAnalysisHelper {
    repoPath: string = "";

    constructor(repoPath: string) {
        this.repoPath = repoPath;
    }

    public async analyseRepo(): Promise<Array<string>> {
        if(this.repoPath == "") {
            return null;
        }

        return await this._recursiveReadFileSystem(this.repoPath);
    }

    async _recursiveReadFileSystem(startingPath: string) : Promise<string[]> {
        let deferred: Q.Deferred<string[]> = Q.defer();
        
        fs.readdir(startingPath, async (ex, files) => {
            if(ex) return;

            var result: string[] = [];
            for(var i = 0; i < files.length; i++) {
                result.push(path.join(startingPath, files[i]));
                var stat = fs.statSync(path.join(startingPath, files[i]));
                if(stat.isDirectory() && ignoredDirectories.indexOf(files[i]) == -1) {
                    result = result.concat(await this._recursiveReadFileSystem(path.join(startingPath, files[i])));
                }
            }

            deferred.resolve(result);
        });

        return deferred.promise;
    }   
}