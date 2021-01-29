import { ServiceClient, ServiceClientOptions, RequestPrepareOptions } from "@azure/ms-rest-js";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";

export class RestClient extends ServiceClient {
    constructor(credentials?: TokenCredentialsBase, options?: ServiceClientOptions) {
        super(credentials, options);
    }

    public sendRequest<TResult>(options: RequestPrepareOptions): Promise<TResult> {
        return new Promise<TResult>((resolve, reject) => {
            super.sendRequest(options)
                .then(response => {
                    if (response.status >= 300) {
                        reject(response.parsedBody);
                    }
                    resolve(response.parsedBody);
                })
                .catch(error => {
                    reject(error);
                });
        });
    }
}
