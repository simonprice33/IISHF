using Microsoft.AspNetCore.SignalR;

namespace IISHF.Api.Hubs;

/// <summary>
/// Real-time hub for live score updates on the Today's Games page.
/// Clients connect and listen for UpdateScores events pushed from the score-entry system.
/// </summary>
public class DataHub : Hub
{
    private readonly ILogger<DataHub> _logger;

    public DataHub(ILogger<DataHub> logger)
    {
        _logger = logger;
    }

    public override Task OnConnectedAsync()
    {
        _logger.LogInformation("SignalR client connected: {ConnectionId}", Context.ConnectionId);
        return base.OnConnectedAsync();
    }

    public override Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("SignalR client disconnected: {ConnectionId}", Context.ConnectionId);
        return base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Called by score-entry clients to broadcast a score update to all connected viewers.
    /// gameNumber: the game's gameNumber field value
    /// </summary>
    public async Task BroadcastScoreUpdate(string gameNumber, int homeScore, int awayScore)
    {
        _logger.LogInformation("Score update: game {GameNumber} {HomeScore}-{AwayScore}", gameNumber, homeScore, awayScore);
        await Clients.Others.SendAsync("UpdateScores", gameNumber, homeScore, awayScore);
    }

    /// <summary>
    /// Called to trigger a full refresh of a specific event's schedule.
    /// </summary>
    public async Task BroadcastScheduleRefresh(string year, string shortCode)
    {
        await Clients.All.SendAsync("UpdateGamesWithTeams", year, shortCode);
    }
}
