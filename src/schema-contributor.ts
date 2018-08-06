import Uri from 'vscode-uri'

interface SchemaContributorProvider {
    readonly requestSchema: (resource: string) => string;
    readonly requestSchemaContent: (uri: string) => string;
}

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
            requestSchemaContent: (uri: string) => string) {
        console.log('registerContributor');

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
	 * Call requestSchema for each provider and find the first one who reports he can provide the schema.
	 *
	 * @param {string} resource
	 * @returns {string} the schema uri
	 */
	public requestCustomSchema(resource: string) {
        console.log(`requestCustomSchema customSchemaContributors list: ${JSON.stringify(this._customSchemaContributors)}`);
        console.log(`requestCustomSchema customSchemaContributors: ${resource}`);

        for (let customKey of Object.keys(this._customSchemaContributors)) {
            const contributor = this._customSchemaContributors[customKey];
            const uri = contributor.requestSchema(resource);
            if (uri) {
                console.log(`Uri found for resource (${resource}): ${uri}`);
                return uri;
            } else {
                console.log(`Uri NOT found for resource (${resource})`);
            }
        }
    }

	/**
	 * Call requestCustomSchemaContent for named provider and get the schema content.
	 *
	 * @param {string} uri the schema uri returned from requestSchema.
	 * @returns {string} the schema content
	 */
    public requestCustomSchemaContent(uri: string) {
        console.log('requestCustomSchemaContent');

        if (uri) {
            let _uri = Uri.parse(uri);
            if (_uri.scheme && this._customSchemaContributors[_uri.scheme] &&
                this._customSchemaContributors[_uri.scheme].requestSchemaContent) {
                return this._customSchemaContributors[_uri.scheme].requestSchemaContent(uri);
            }
        }
    }
}

// global instance
const schemaContributor = new SchemaContributor();
//schemaContributor.registerContributor("", "", "");

// constants
export const CUSTOM_SCHEMA_REQUEST = 'custom/schema/request';
export const CUSTOM_CONTENT_REQUEST = 'custom/schema/content';

export { schemaContributor } ;