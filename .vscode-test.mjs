// @ts-check

import { defineConfig } from '@vscode/test-cli';
import path from 'path';

export default defineConfig({
    files: 'out/test/**/*.test.js',
    workspaceFolder: path.join(import.meta.dirname, 'src', 'test', 'workspace'),
    mocha: {
        timeout: 100000,
    },
    coverage: {
        reporter: ['cobertura', 'text', 'html'],
        output: './coverage',
    }
});
