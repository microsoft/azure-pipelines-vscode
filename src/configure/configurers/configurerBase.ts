export interface Configurer {
    validatePermissions(): Promise<any>;
    createPreRequisites(): Promise<any> ;
    createPipelineFile(): Promise<any>;
    createPipeline(): Promise<any>;
}
