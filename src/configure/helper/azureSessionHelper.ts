import { AzureAccount, AzureSession } from "../../typings/azure-account.api";

export async function getSubscriptionSession(azureAccount: AzureAccount, subscriptionId: string): Promise<AzureSession> {
    let currentSubscription = azureAccount.subscriptions
        .find(subscription => subscription.subscription.subscriptionId.toLowerCase() === subscriptionId.toLowerCase());

    // Fallback to first element
    if (!currentSubscription) {
        currentSubscription = azureAccount.subscriptions[0];
    }

    return currentSubscription.session;
}
