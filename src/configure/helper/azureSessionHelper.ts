import { AzureSession } from "../model/models";
import { getAzureAccountExtensionApi } from "../../extensionApis";

export function getSubscriptionSession(subscriptionId: string): AzureSession {
    let currentSubscription = getAzureAccountExtensionApi().subscriptions
        .find(subscription => subscription.subscription.subscriptionId.toLowerCase() === subscriptionId.toLowerCase());

    // Fallback to first element
    if (!currentSubscription) {
        currentSubscription = getAzureAccountExtensionApi().subscriptions[0];
    }

    return currentSubscription.session;
}
