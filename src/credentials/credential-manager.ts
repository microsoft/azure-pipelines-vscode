/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

//import * as keytar from 'keytar';
import { Constants } from '../helpers/constants';
import { CredentialStore } from '../credentialstore/credentialstore';
import { Credential } from '../credentialstore/credential';

export class CredentialNames {
    static PAT: string = "PAT";
}

export interface ICredentialManager {
    delete(key: string): Promise<void>;
    get(key: string): Promise<string | null>;
    set(key:string, value: string): Promise<void>;
}

export class CredentialManager implements ICredentialManager {
    service: string = Constants.ExtensionName;
    credentialStore: CredentialStore;

    constructor() {
        this.credentialStore = new CredentialStore();
    }

    public async delete(key: string): Promise<void> {
        return await this.credentialStore.removeCredentialByName(this.service, key);
        //return await keytar.deletePassword(this.service, key);
    }

    public async get(key: string): Promise<string | null> {
        const cred: Credential = await this.credentialStore.getCredentialByName(this.service, key);
        return cred.Password;
        //return await keytar.getPassword(this.service, key);
    }    
    
    public async set(key: string, value: string): Promise<void> {
        return this.credentialStore.SetCredential(this.service, key, value);
        //await keytar.setPassword(this.service, key, value);
    }
}
