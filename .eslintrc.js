/* eslint-env node */
module.exports = {
    extends: [
        'eslint:recommended',
    ],
    env: {
        node: true
    },
    parserOptions: {
        ecmaVersion: "latest"
    },
    root: true,
    overrides: [
        {
            extends: ['plugin:@typescript-eslint/strict-type-checked'],
            files: ['./**/*.{ts,tsx}'],
            parser: '@typescript-eslint/parser',
            parserOptions: {
                project: true,
            },
            plugins: ['@typescript-eslint'],
        },
    ],
};
