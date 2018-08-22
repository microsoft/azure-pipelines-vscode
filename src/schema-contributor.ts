/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import * as logger from './logger';
import Uri from 'vscode-uri'

interface SchemaContributorProvider {
    readonly requestSchema: (resource: string) => string;
    readonly requestSchemaContent: (uri: string) => string;
}

// TODO: Add tests for this class.
// TODO: Can we just get rid of this class?
class SchemaContributor {
    private _customSchemaContributors: { [index: string]: SchemaContributorProvider } = {};

	/**
	 * Register a custom schema provider
	 *
	 * @param {string} the provider's name
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

    // TODO: Rewrite comments.
	/**
	 * Call requestSchema for each provider and find the first one who reports he can provide the schema.
	 *
	 * @param {string} resource
	 * @returns {string} the schema uri
	 */
	public requestCustomSchema(resource: string): string {
        // TODO: This is what gets called on every request(I think), it's looking at the cached schema files. I think here is where we want to periodically
        //       check what's on the server. The code in schema-association-service.getSchemaAssociation()

        // Check relationship with result of getSchemaAssociationFromYamlValidationNode. Does this load the files specified there? Make sure this code is needed.

        logger.log(`requestCustomSchema customSchemaContributors list: ${JSON.stringify(this._customSchemaContributors)}`);
        logger.log(`requestCustomSchema customSchemaContributors: ${resource}`);

        logger.log('1');
        for (let customKey of Object.keys(this._customSchemaContributors)) {
            logger.log('2');
            const contributor = this._customSchemaContributors[customKey];
            const uri = contributor.requestSchema(resource);
            if (uri) {
                logger.log('2.a');
                logger.log(`Uri found for resource (${resource}): ${uri}`);
                return uri;
            } else {
                logger.log('2.b');
                logger.log(`Uri NOT found for resource (${resource})`);
            }
        }
        logger.log('3');

        throw `Unable to find custom schema for resource: '${resource}'`;
    }

    // TODO: Rewrite comments.
	/**
	 * Call requestCustomSchemaContent for named provider and get the schema content.
	 *
	 * @param {string} uri the schema uri returned from requestSchema.
	 * @returns {string} the schema content
	 */
    public requestCustomSchemaContent(uri: string): string {
        console.log('requestCustomSchemaContent');

        if (uri) {
            let _uri = Uri.parse(uri);
            if (_uri.scheme && this._customSchemaContributors[_uri.scheme] &&
                this._customSchemaContributors[_uri.scheme].requestSchemaContent) {
                return this._customSchemaContributors[_uri.scheme].requestSchemaContent(uri);
            }
        }

        throw `Unable to find custom schema content for uri: '${uri}'`;
    }
}

// global instance
// TODO: Do this differently... why not instantiate? Static? Something else.
const schemaContributor = new SchemaContributor();
//schemaContributor.registerContributor("", "", "");

export const CUSTOM_SCHEMA_REQUEST = 'custom/schema/request';
export const CUSTOM_CONTENT_REQUEST = 'custom/schema/content';

export { schemaContributor } ;