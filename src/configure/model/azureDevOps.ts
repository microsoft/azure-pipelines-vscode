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
    definition: { id: number };
    project: { id: string };
    sourceBranch: string;
    sourceVersion: string;
}