import { ConnectionData } from 'azure-devops-node-api/interfaces/LocationsInterfaces';

import { telemetryHelper, extensionVersion } from '../../helpers/telemetryHelper';

export interface Organization {
    accountId: string;
    accountName: string;
    accountUri: string;
    properties: Record<string, unknown>;
}

export class OrganizationsClient {
    private organizations?: Organization[];

    constructor(private token: string) { }

    public async listOrganizations(forceRefresh?: boolean): Promise<Organization[]> {
        if (this.organizations && !forceRefresh) {
            return this.organizations;
        }

        const { authenticatedUser } = await this.fetch<ConnectionData>("https://app.vssps.visualstudio.com/_apis/connectiondata");
        if (authenticatedUser === undefined) {
            return [];
        }

        const { value: organizations } = await this.fetch<{ value: Organization[] }>(`https://app.vssps.visualstudio.com/_apis/accounts?memberId=${authenticatedUser.id}&api-version=7.0`);
        this.organizations = organizations.sort((org1, org2) => {
            const account1 = org1.accountName.toLowerCase();
            const account2 = org2.accountName.toLowerCase();
            if (account1 < account2) {
                return -1;
            } else if (account1 > account2) {
                return 1;
            }
            return 0;
        });

        return this.organizations;
    }

    private async fetch<T>(...[request, init]: Parameters<typeof fetch>): Promise<T> {
        const response = await fetch(request, {
            ...init,
            headers: {
                ...init?.headers,
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
                'User-Agent': `azure-pipelines-vscode ${extensionVersion}`,
                'X-TFS-Session': telemetryHelper.getJourneyId(),
            }
        });
        return (await response.json()) as T;
    }
}
