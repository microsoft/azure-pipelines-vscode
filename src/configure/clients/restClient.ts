import { ServiceClient, RequestPrepareOptions } from "@azure/ms-rest-js";

export class RestClient extends ServiceClient {
    public sendRequest<TResult>(options: RequestPrepareOptions): Promise<TResult> {
        return new Promise<TResult>((resolve, reject) => {
            super.sendRequest(options)
                .then(response => {
                    if (response.status >= 300) {
                        reject(response.parsedBody);
                    }
                    resolve(response.parsedBody as TResult);
                })
                .catch(error => {
                    reject(error);
                });
        });
    }
}
