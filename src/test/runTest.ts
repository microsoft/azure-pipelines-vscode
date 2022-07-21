import * as cp from 'child_process';
import * as path from 'path';

import {
  downloadAndUnzipVSCode,
  resolveCliPathFromVSCodeExecutablePath,
  runTests
} from '@vscode/test-electron';

async function main() {
  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');

    // The path to the extension test runner script
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, './index');

    // If the first argument is a path to a file/folder/workspace,
    // the launched VS Code instance will open it.
    // workspace isn't copied to out because it's all YAML files.
    const launchArgs = [path.resolve(__dirname, '../../src/test/workspace')];

    const vscodeExecutablePath = await downloadAndUnzipVSCode();
    const cliPath = resolveCliPathFromVSCodeExecutablePath(vscodeExecutablePath);

    // 0.11.0 has a bug where it blocks extension loading on first launch:
    // https://github.com/microsoft/vscode-azure-account/pull/603.
    // Since we always launch for the first time in CI, that turns out
    // to be problematic.
    cp.spawnSync(cliPath, ['--install-extension', 'ms-vscode.azure-account@0.10.1'], {
      encoding: 'utf-8',
      stdio: 'inherit'
    });

    // Download VS Code, unzip it and run the integration test
    await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs
    });
  } catch (err) {
    console.error(err);
    console.error('Failed to run tests');
    process.exit(1);
  }
}

main();
