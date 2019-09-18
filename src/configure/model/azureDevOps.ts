import { RepositoryProvider } from "./models";

export interface BuildDefinition {
    name: string;
    path: string;
    type: number;
    quality: number;
    process: YamlProcess;
    project: { id: string, name: string };
    repository: BuildDefinitionRepository;
    triggers: Array<BuildDefinitionTrigger>;
    queue: { id: number };
    properties: { [key: string]: string };
}

export interface BuildDefinitionRepository {
    id: string;
    name: string;
    type: RepositoryProvider;
    defaultBranch: string;
    url: string;
    properties?: BuildDefinitionRepositoryProperties;
}

export interface BuildDefinitionRepositoryProperties {
    connectedServiceId: string;
    apiUrl: string;
    branchesUrl: string;
    cloneUrl: string;
    defaultBranch: string;
    fullName: string;
    refsUrl: string;
}

export interface BuildDefinitionTrigger {
    triggerType: number;
    settingsSourceType: number;
    batchChanges: boolean;
}

export interface YamlProcess {
    type: number;
    yamlFileName: string;
}

export interface Build {
    id: string;
    definition: { id: number, url?: string };
    project: { id: string };
    sourceBranch: string;
    sourceVersion: string;
    _links?: { web: { href: string } };
}
