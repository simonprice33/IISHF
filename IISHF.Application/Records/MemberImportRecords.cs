namespace IISHF.Application.Records;

public record MemberImportRow(
    string Email,
    string LoginName,
    string Name
);

public record MemberImportResult(
    int Created,
    int Skipped,
    int Failed,
    List<string> Details
);
