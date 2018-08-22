/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { Credential } from "../credential";

/* tslint:disable:no-unused-variable */
import Q = require("q");
/* tslint:enable:no-unused-variable */

export interface ICredentialStore {
    GetCredential(service: string) : Q.Promise<Credential>;
    SetCredential(service: string, username: string, password: any) : Q.Promise<void>;
    RemoveCredential(service: string) : Q.Promise<void>;
    getCredentialByName(service: string, username: string) : Q.Promise<Credential>;
    removeCredentialByName(service: string, username: string) : Q.Promise<void>;
}
