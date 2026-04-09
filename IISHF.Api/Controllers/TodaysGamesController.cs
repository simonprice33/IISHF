using System.Text.Json;
using IISHF.Application.Records;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Services;

namespace IISHF.Api.Controllers;

[ApiController]
[Route("api/todaysgames")]
public class TodaysGamesController : ControllerBase
{
    private readonly IContentService _contentService;
    private readonly IMediaService _mediaService;
    private readonly ILogger<TodaysGamesController> _logger;

    public TodaysGamesController(
        IContentService contentService,
        IMediaService mediaService,
        ILogger<TodaysGamesController> logger)
    {
        _contentService = contentService;
        _mediaService = mediaService;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/todaysgames
    /// Returns all games scheduled for today, grouped by event.
    /// Dynamically traverses the content tree — no hardcoded year or event.
    /// </summary>
    [HttpGet]
    public IActionResult GetTodaysGames()
    {
        var today = DateTime.Today;
        var results = new List<EventGamesDto>();

        try
        {
            // Start from root and find all published events whose date range covers today
            var rootItems = _contentService.GetRootContent();
            var allEvents = FindEventsDfs(rootItems, today);

            foreach (var ev in allEvents)
            {
                long total;
                var gameChildren = _contentService
                    .GetPagedChildren(ev.Id, 0, 1000, out total)
                    .Where(c => c.Published && c.ContentType.Alias == "game")
                    .Where(g =>
                    {
                        var dt = g.GetValue<DateTime?>("scheduleDateTime");
                        return dt.HasValue && dt.Value.Date == today;
                    })
                    .OrderBy(g => g.GetValue<DateTime?>("scheduleDateTime"))
                    .ThenBy(g => g.GetValue<int>("gameNumber"))
                    .ToList();

                if (gameChildren.Count == 0) continue;

                var gameDtos = gameChildren.Select(g =>
                {
                    var homeTeam = GetPickedContent(g, "homeTeam");
                    var awayTeam = GetPickedContent(g, "awayTeam");

                    return new GameDto(
                        GameId:           g.Key.ToString(),
                        GameNumber:       g.GetValue<int>("gameNumber"),
                        Group:            g.GetValue<string>("group") ?? "",
                        ScheduleDateTime: g.GetValue<DateTime?>("scheduleDateTime")?.ToString("o") ?? "",
                        HomeTeam:         homeTeam?.Name ?? "",
                        HomeLogo:         GetLogoPath(homeTeam),
                        HomeScore:        ParseScore(g, "homeScore"),
                        AwayTeam:         awayTeam?.Name ?? "",
                        AwayLogo:         GetLogoPath(awayTeam),
                        AwayScore:        ParseScore(g, "awayScore"),
                        Remarks:          g.GetValue<string>("remarks") ?? ""
                    );
                }).ToList();

                results.Add(new EventGamesDto(
                    EventName: ev.Name ?? "Event",
                    EventPath: "",
                    Games: gameDtos
                ));
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching today's games");
            return StatusCode(500, new { error = "Failed to load today's games." });
        }

        return Ok(results);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /// <summary>
    /// Depth-first search through all published content to find 'event' nodes
    /// whose date range includes today.
    /// </summary>
    private IEnumerable<IContent> FindEventsDfs(IEnumerable<IContent> items, DateTime today)
    {
        foreach (var item in items)
        {
            if (!item.Published) continue;

            if (item.ContentType.Alias == "event")
            {
                var start = item.GetValue<DateTime?>("eventStartDate");
                var end   = item.GetValue<DateTime?>("eventEndDate");
                if (start.HasValue && end.HasValue
                    && start.Value.Date <= today
                    && end.Value.Date   >= today)
                {
                    yield return item;
                    continue; // events don't nest events, skip their children
                }
            }

            // Recurse into children (e.g. root → year → sport → event)
            long childTotal;
            var children = _contentService.GetPagedChildren(item.Id, 0, 1000, out childTotal);
            foreach (var found in FindEventsDfs(children, today))
                yield return found;
        }
    }

    /// <summary>
    /// Resolves a content picker property to its IContent item.
    /// Handles: UDI string ("umb://document/{guid}"), plain GUID, or integer ID.
    /// </summary>
    private IContent? GetPickedContent(IContent source, string alias)
    {
        var raw = source.GetValue<string>(alias);
        if (string.IsNullOrWhiteSpace(raw)) return null;

        // Try UDI format: umb://document/{guid}
        if (UdiParser.TryParse(raw, out var udi) && udi is GuidUdi guidUdi)
            return _contentService.GetById(guidUdi.Guid);

        // Fallback: plain GUID
        if (Guid.TryParse(raw, out var guid))
            return _contentService.GetById(guid);

        // Fallback: integer ID
        if (int.TryParse(raw, out var id))
            return _contentService.GetById(id);

        return null;
    }

    /// <summary>
    /// Resolves a team's logo URL from its 'image' media picker property.
    /// Handles:
    ///   - UDI strings: "umb://media/{guid}"
    ///   - MediaPicker3 JSON array: [{"mediaKey":"guid","crops":[],...}]
    ///   - Plain paths: "/media/xyz/image.png"
    /// </summary>
    private string GetLogoPath(IContent? teamContent)
    {
        if (teamContent == null) return "";

        var raw = teamContent.GetValue<string>("image");
        if (string.IsNullOrWhiteSpace(raw)) return "";

        // Try UDI format: umb://media/{guid}
        if (UdiParser.TryParse(raw, out var udi) && udi is GuidUdi guidUdi)
            return GetMediaFilePath(guidUdi.Guid);

        // Try MediaPicker3 JSON array format: [{"mediaKey":"guid",...}]
        if (raw.TrimStart().StartsWith("["))
        {
            try
            {
                using var doc = JsonDocument.Parse(raw);
                var root = doc.RootElement;
                if (root.ValueKind == JsonValueKind.Array && root.GetArrayLength() > 0)
                {
                    var first = root[0];
                    if (first.TryGetProperty("mediaKey", out var mediaKeyEl))
                    {
                        var mediaKeyStr = mediaKeyEl.GetString();
                        if (Guid.TryParse(mediaKeyStr, out var mediaGuid))
                            return GetMediaFilePath(mediaGuid);
                    }
                }
            }
            catch (JsonException)
            {
                // Not valid JSON — fall through
            }
        }

        // Fallback: treat as a direct path
        return raw;
    }

    /// <summary>
    /// Looks up a media item by GUID and returns the file path.
    /// umbracoFile may be a plain path or a JSON object (Image Cropper stores {"src":"...","crops":[...]}).
    /// </summary>
    private string GetMediaFilePath(Guid mediaGuid)
    {
        var media = _mediaService.GetById(mediaGuid);
        if (media == null) return "";

        var raw = media.GetValue<string>("umbracoFile");
        if (string.IsNullOrWhiteSpace(raw)) return "";

        // Image Cropper stores: {"src":"/media/...","crops":[...],"focalPoint":{...}}
        if (raw.TrimStart().StartsWith("{"))
        {
            try
            {
                using var doc = JsonDocument.Parse(raw);
                if (doc.RootElement.TryGetProperty("src", out var src))
                    return src.GetString() ?? "";
            }
            catch (JsonException)
            {
                // Not valid JSON — return as-is
            }
        }

        return raw;
    }

    private static int? ParseScore(IContent game, string alias)
    {
        var raw = game.GetValue<object>(alias);
        if (raw == null) return null;
        if (raw is int i) return i;
        return int.TryParse(raw.ToString(), out var v) ? v : null;
    }
}
