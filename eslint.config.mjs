// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    {
        ignores: [
            '.azure-pipelines/**',
            'dist/**',
        ],
    },
    {
        languageOptions: {
            parserOptions: {
                projectService: {
                    allowDefaultProject: ['*.?(m)js'],
                },
                tsconfigRootDir: import.meta.dirname,
            }
        },
        rules: {
            // Allow numbers and booleans in template expressions
            '@typescript-eslint/restrict-template-expressions': ['error', {
                allowNumber: true,
                allowBoolean: true,
            }],
            // Always use `return await` in async functions
            '@typescript-eslint/return-await': ['error', 'always'],
        },
    },
    {
        files: ['**/*.?(m)js'],
        extends: [tseslint.configs.disableTypeChecked],
    },
);
