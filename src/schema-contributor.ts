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
//       registerContributor is never called, which means the other two methods always throw.
class SchemaContributor {
    private _customSchemaContributors = new Map<string, SchemaContributorProvider>();

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
        if (this._customSchemaContributors.has(schema)) {
            return false;
        }

        this._customSchemaContributors.set(schema, {
            requestSchema,
            requestSchemaContent
        });

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
        for (const contributor of this._customSchemaContributors.values()) {
            const uri = contributor.requestSchema(resource);
            if (uri) {
                return uri;
            }
        }

        // TODO: This is currently the only way to fallback to the default schema provider.
        // The upstream Red Hat server also falls back when receiving a falsy value,
        // so sync with their changes and change this to return false or something.
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
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
        const { scheme } = URI.parse(uri);
        const contributor = this._customSchemaContributors.get(scheme);
        if (contributor) {
            return contributor.requestSchemaContent(uri);
        }

        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw `Unable to find custom schema content for uri: '${uri}'`;
    }
}

// global instance
// TODO: Do this differently... why not instantiate? Static? Something else.
const schemaContributor = new SchemaContributor();

export const CUSTOM_SCHEMA_REQUEST = 'custom/schema/request';
export const CUSTOM_CONTENT_REQUEST = 'custom/schema/content';

export { schemaContributor } ;
