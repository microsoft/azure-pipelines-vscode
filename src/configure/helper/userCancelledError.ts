// https://github.com/microsoft/vscode-azuretools/blob/5999c2ad4423e86f22d2c648027242d8816a50e4/ui/src/errors.ts
// minus localization

export class UserCancelledError extends Error {
    constructor() {
        super('Operation cancelled.');
    }
}
