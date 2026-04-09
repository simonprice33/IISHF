namespace IISHF.Application.Records;

public record GameDto(
    string GameId,
    int GameNumber,
    string Group,
    string ScheduleDateTime,
    string HomeTeam,
    string HomeLogo,
    int? HomeScore,
    string AwayTeam,
    string AwayLogo,
    int? AwayScore,
    string Remarks
);

public record EventGamesDto(
    string EventName,
    string EventPath,
    List<GameDto> Games
);
