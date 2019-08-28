export async function sleepForMilliSeconds(timeInMs: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, timeInMs);
    });
}

export function generateDevOpsOrganizationName(userName: string, repositoryName: string): string {
    let repositoryNameSuffix = repositoryName.replace("/", "-").trim();
    let organizationName = `${userName}-${repositoryNameSuffix}`;

    // Name cannot start or end with whitespaces, cannot start with '-', cannot contain characters other than a-z|A-Z|0-9
    organizationName = organizationName.trim().replace(/^[-]+/, '').replace(/[^a-zA-Z0-9-]/g, '');
    if(organizationName.length > 50) {
        organizationName = organizationName.substr(0, 50);
    }
    
    return organizationName;
}

export function generateDevOpsProjectName(repositoryName?: string): string {
    if(!repositoryName) {
        return "AzurePipelines";
    }

    let repoParts = repositoryName.split("/");
    let suffix = repoParts[repoParts.length-1];
    suffix = suffix.trim();
    // project name cannot end with . or _
    suffix = suffix.replace(/\.[\.]*$/, '').replace(/^_[_]*$/, '');

    let projectName = `AzurePipelines-${suffix}`;
    if(projectName.length > 64) {
        projectName = projectName.substr(0, 64);
    }

    return projectName;
}

export function generateRandomPassword(length: number = 20): string {
    var characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#%^*()-+";
    var charTypeSize = new Array(26, 26, 10, 10);
    var charTypeStartIndex = new Array(0, 26, 52, 62);
    var password = "";
    for (var x = 0; x < length; x++) {
        var i = Math.floor(Math.random() * charTypeSize[x % 4]);
        password += characters.charAt(i + charTypeStartIndex[x % 4]);
    }
    return password;
}

export function stringCompareFunction(a: string, b: string): number {
    a = a && a.toLowerCase();
    b = b && b.toLowerCase();
    if(a < b) {
        return -1;
    }
    else if(a > b) {
        return 1;
    }
    return 0;
}