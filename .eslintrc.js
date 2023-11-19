/* eslint-env node */
module.exports = {
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended-type-checked',
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: true,
    },
    plugins: ['@typescript-eslint'],
    root: true,
    overrides: [
        {
            extends: ['plugin:@typescript-eslint/disable-type-checked'],
            files: ['./**/*.js'],
        },
    ],
};
