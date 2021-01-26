/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License.
*--------------------------------------------------------------------------------------------*/

import { URI } from 'vscode-uri';

interface SchemaContributorProvider {
    readonly requestSchema: (resource: string) => string;
    readonly requestSchemaContent: (uri: string) => string;
}

// TODO: Add tests for this class.
// TODO: Can we just get rid of this class?
class SchemaContributor {
    private _customSchemaContributors: { [index: string]: SchemaContributorProvider } = {};

    /**
     * Register a custom schema provider.
     * TODO: We might be able to use this to intelligently grab the schema for projects using Azure Repos.
     *
     * @param {string} schema the provider's name
     * @param requestSchema the requestSchema function
     * @param requestSchemaContent the requestSchemaContent function
     * @returns {boolean}
     */
    public registerContributor(schema: string,
                               requestSchema: (resource: string) => string,
                               requestSchemaContent: (uri: string) => string): boolean {
        if (this._customSchemaContributors[schema]) {
            return false;
        }

        if (!requestSchema) {
            throw new Error("Illegal parameter for requestSchema.");
        }

        this._customSchemaContributors[schema] = <SchemaContributorProvider>{
            requestSchema,
            requestSchemaContent
        };

        return true;
    }

    /**
     * Asks each schema provider whether it has a schema for the given resource,
     * and returns the URI to the schema if it does.
     *
     * @param {string} resource the file to be validated
     * @returns {string} the schema uri
     */
    public requestCustomSchema(resource: string): string {
        for (let customKey of Object.keys(this._customSchemaContributors)) {
            const contributor = this._customSchemaContributors[customKey];
            const uri = contributor.requestSchema(resource);
            if (uri) {
                return uri;
            }
        }

        // TODO: This is currently the only way to fallback to the default schema provider.
        // The upstream Red Hat server also falls back when receiving a falsy value,
        // so sync with their changes and change this to return false or something.
        throw `Unable to find custom schema for resource: '${resource}'`;
    }

    /**
     * If there is a schema provider that can handle the given URI,
     * returns the schema content corresponding to the URI.
     * TODO: If we stick to just local files and http(s), I doubt we need this.
     *
     * @param {string} uri the schema uri returned from requestSchema.
     * @returns {string} the schema content
     */
    public requestCustomSchemaContent(uri: string): string {
        if (uri) {
            const { scheme } = URI.parse(uri);
            if (scheme && this._customSchemaContributors[scheme] &&
                this._customSchemaContributors[scheme].requestSchemaContent) {
                return this._customSchemaContributors[scheme].requestSchemaContent(uri);
            }
        }

        throw `Unable to find custom schema content for uri: '${uri}'`;
    }
}

// global instance
// TODO: Do this differently... why not instantiate? Static? Something else.
const schemaContributor = new SchemaContributor();

export const CUSTOM_SCHEMA_REQUEST = 'custom/schema/request';
export const CUSTOM_CONTENT_REQUEST = 'custom/schema/content';

export { schemaContributor } ;
