export class TracePoints {
    // Combined telemetry trace points
    public static telemetryKey: string = '';
    public static CurrentFunction: string = 'currentFunction';
    public static RepoProvider: string = 'repoProvider';
    public static AzureLoginRequired: string = 'azureLoginRequired';
    public static Command: string = 'command';
    public static JourneyId: string = 'journeyId';
    public static EntryPoint: string = 'entryPoint';
    public static SourceRepoLocation: string = 'sourceRepoLocation';
    public static NewOrganization: string = 'newOrganization';
    public static ChosenTemplate: string = 'chosenTemplate';
    public static PipelineDiscarded: string = 'pipelineDiscarded';
    public static ViewPipelineClicked: string = 'viewPipelineClicked';
    public static GitHubPatStartTime = 'gitHubPatStartTime';
    public static GitHubPatEndTime = 'gitHubPatEndTime';
    public static CommandStartTime = 'commandStartTime';
    public static CommandEndTime = 'commandEndTime';
    public static OrganizationListDuration = 'organizationListDuration';
    public static OrganizationListCount = 'organizationListCount';
    public static ProjectListDuration = 'projectListDuration';
    public static ProjectListCount = 'projectListCount';
    public static AzureResourceListDuration = 'azureResourceListDuration';
    public static AzureResourceListCount = 'azureResourceListCount';



    // Failure trace points
    public static AzureLoginFailure = 'azureLoginFailure';
    public static AzureServiceConnectionCreateFailure = 'AzureServiceConnectionCreateFailure';
    public static CheckInPipelineFailure = 'checkInPipelineFailure';
    public static CreateOrganizationFailure = 'createOrganizationFailure';
    public static GitHubServiceConnectionError = 'gitHubServiceConnectionError';
}