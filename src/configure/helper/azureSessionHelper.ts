import { AzureSession } from "../model/models";
import { extensionVariables } from "../../extensionVariables";

export function getSubscriptionSession(subscriptionId: string): AzureSession {
    let currentSubscription = extensionVariables.azureAccountExtensionApi.subscriptions
        .find(subscription => subscription.subscription.subscriptionId.toLowerCase() === subscriptionId.toLowerCase());

    // Fallback to first element
    if (!currentSubscription) {
        currentSubscription = extensionVariables.azureAccountExtensionApi.subscriptions[0];
    }

    return currentSubscription.session;
}
