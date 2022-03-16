import { AzureSession } from "../model/models";
import { getAzureAccountExtensionApi } from "../../extensionApis";

export async function getSubscriptionSession(subscriptionId: string): Promise<AzureSession> {
    const azureAccountApi = await getAzureAccountExtensionApi();
    let currentSubscription = azureAccountApi.subscriptions
        .find(subscription => subscription.subscription.subscriptionId.toLowerCase() === subscriptionId.toLowerCase());

    // Fallback to first element
    if (!currentSubscription) {
        currentSubscription = azureAccountApi.subscriptions[0];
    }

    return currentSubscription.session;
}
