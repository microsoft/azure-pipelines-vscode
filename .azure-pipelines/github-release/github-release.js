const octokit = require('@octokit/rest')({
    headers: {
        'user-agent': 'azure-pipelines/vscode-release-pipeline v1.0'
    }
});
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs');

let vsixName = process.argv[2] || null;
let version = process.argv[3] || null;
let token = process.argv[4] || null
if (token === null) {
    console.log(`Usage:

    github-release.js <vsix> <version> <PAT>

This will create a new release and tag on GitHub at the current HEAD commit.

USE AT YOUR OWN RISK.
This is intended to be run by the release pipeline only.`);
    process.exit(1);
}

async function createRelease() {
    const { stdout, stderr } = await exec('git rev-parse --verify HEAD');
    const head_commit = stdout;
    const { stdout, stderr } = await exec('cat minichangelog.txt');
    const body = stdout;

    octokit.authenticate({
        type: 'token',
        token: token
    });

    try {
        console.log('Creating release...');
        const createReleaseResult = await octokit.repos.createRelease({
            owner: 'Microsoft',
            repo: 'azure-pipelines-vscode',
            tag_name: `v${version}`,
            target_commitish: head_commit,
            name: `Version ${version}`,
            body: body,
            draft: true
        });
        console.log('Created release.');

        if (process.env.SYSTEM_DEBUG) {
            console.log(createReleaseResult);
        }

        const vsixSize = fs.statSync(vsixName).size;

        console.log('Uploading VSIX...');
        const uploadResult = await octokit.repos.uploadAsset({
            url: createReleaseResult.data.upload_url,
            headers: {
                'content-length': vsixSize,
                'content-type': 'application/zip',
            },
            name: vsixName,
            file: fs.createReadStream(vsixName)
        });
        console.log('Uploaded VSIX.');

        if (process.env.SYSTEM_DEBUG) {
            console.log(uploadResult);
        }


    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

createRelease();
