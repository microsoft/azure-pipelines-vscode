import { ServiceClient, ServiceClientCredentials, ServiceClientOptions, PathTemplateBasedRequestPrepareOptions, UrlBasedRequestPrepareOptions } from "ms-rest";

export class RestClient extends ServiceClient {
    constructor(credentials?: ServiceClientCredentials, options?: ServiceClientOptions) {
        super(credentials, options);
    }

    public sendRequest<TResult>(options: PathTemplateBasedRequestPrepareOptions | UrlBasedRequestPrepareOptions): Promise<TResult> {
        return new Promise<TResult>((resolve, reject) => {
            super.sendRequestWithHttpOperationResponse<TResult>(options)
                .then((response) => {
                    if (response.response.statusCode >= 300) {
                        reject(response.body);
                    }
                    resolve(response.body);
                })
                .catch((error) => {
                    reject(error);
                });
        });
    }
}