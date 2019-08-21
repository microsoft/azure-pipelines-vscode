export class TracePoints {
    // Failure trace points
    public static AzureLoginFailure = 'azureLoginFailure';
    public static AzureServiceConnectionCreateFailure = 'AzureServiceConnectionCreateFailure';
    public static CheckInPipelineFailure = 'checkInPipelineFailure';
    public static CreateNewOrganizationAndProjectFailure = 'CreateNewOrganizationAndProjectFailure';
    public static GitHubServiceConnectionError = 'gitHubServiceConnectionError';
    public static CreateAndQueuePipelineFailed = 'createAndBuildPipelineFailed';
    public static GetSourceRepositoryDetailsFailed = 'getSourceRepositoryDetailsFailed';
    public static ExtractAzureResourceFromNodeFailed = 'extractAzureResourceFromNodeFailed';
    public static GetAzureDevOpsDetailsFailed = 'GetAzureDevOpsDetailsFailed';
    public static AddingContentToPipelineFileFailed = 'AddingContentToPipelineFileFailed';
    public static PipelineFileCheckInFailed = 'PipelineFileCheckInFailed';
}