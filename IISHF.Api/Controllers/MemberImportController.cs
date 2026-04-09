using IISHF.Application.Records;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Core.Security;
using Umbraco.Cms.Core.Services;

namespace IISHF.Api.Controllers;

/// <summary>
/// Temporary one-off controller to bulk-import members from the old Umbraco 12 site.
/// Protect with the MemberImport:Secret app setting.
/// Remove or disable once migration is complete.
/// </summary>
[ApiController]
[Route("api/memberimport")]
public class MemberImportController : ControllerBase
{
    private readonly IMemberManager _memberManager;
    private readonly IMemberGroupService _memberGroupService;
    private readonly IMemberService _memberService;
    private readonly IConfiguration _config;
    private readonly ILogger<MemberImportController> _logger;

    public MemberImportController(
        IMemberManager memberManager,
        IMemberGroupService memberGroupService,
        IMemberService memberService,
        IConfiguration config,
        ILogger<MemberImportController> logger)
    {
        _memberManager = memberManager;
        _memberGroupService = memberGroupService;
        _memberService = memberService;
        _config = config;
        _logger = logger;
    }

    /// <summary>
    /// POST /api/memberimport/csv
    /// Header: X-Import-Secret: iishf-import-2026
    ///
    /// CSV columns (no header row, SSMS default export):
    ///   0: Email  1: LoginName  2: Name  3: Password  4: passwordConfig
    ///   5: IsApproved  6: IsLockedOut  7: LastLoginDate  8: CreateDate
    /// </summary>
    [HttpPost("csv")]
    [DisableRequestSizeLimit]
    public async Task<IActionResult> ImportCsv(IFormFile file)
    {
        if (!IsAuthorised())
            return Unauthorized(new { error = "Invalid or missing import secret." });

        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file uploaded." });

        var rows = ParseCsv(file);
        if (rows.Count == 0)
            return BadRequest(new { error = "No rows could be parsed from the CSV." });

        return Ok(await ImportRows(rows));
    }

    /// <summary>
    /// POST /api/memberimport/json
    /// Header: X-Import-Secret: iishf-import-2026
    /// Body: [{ "email": "...", "loginName": "...", "name": "..." }, ...]
    /// </summary>
    [HttpPost("json")]
    public async Task<IActionResult> ImportJson([FromBody] List<MemberImportRow> rows)
    {
        if (!IsAuthorised())
            return Unauthorized(new { error = "Invalid or missing import secret." });

        if (rows == null || rows.Count == 0)
            return BadRequest(new { error = "No rows supplied." });

        return Ok(await ImportRows(rows));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private bool IsAuthorised()
    {
        var secret = _config["MemberImport:Secret"];
        if (string.IsNullOrWhiteSpace(secret)) return false;
        var header = Request.Headers["X-Import-Secret"].FirstOrDefault();
        return header == secret;
    }

    private static List<MemberImportRow> ParseCsv(IFormFile file)
    {
        var rows = new List<MemberImportRow>();
        using var reader = new StreamReader(file.OpenReadStream());

        while (!reader.EndOfStream)
        {
            var line = reader.ReadLine();
            if (string.IsNullOrWhiteSpace(line)) continue;

            var parts = SplitCsvLine(line);
            if (parts.Length < 3) continue;

            var email = parts[0].Trim('"', ' ').ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(email) || !email.Contains('@')) continue;

            var login = parts[1].Trim('"', ' ');
            var name  = parts[2].Trim('"', ' ');
            if (string.IsNullOrWhiteSpace(login)) login = email;
            if (string.IsNullOrWhiteSpace(name))  name  = email;

            rows.Add(new MemberImportRow(email, login, name));
        }

        return rows;
    }

    private static string[] SplitCsvLine(string line)
    {
        var result = new List<string>();
        bool inQuotes = false;
        var current = new System.Text.StringBuilder();

        foreach (char c in line)
        {
            if (c == '"') { inQuotes = !inQuotes; current.Append(c); }
            else if (c == ',' && !inQuotes) { result.Add(current.ToString()); current.Clear(); }
            else { current.Append(c); }
        }
        result.Add(current.ToString());
        return result.ToArray();
    }

    private async Task<MemberImportResult> ImportRows(List<MemberImportRow> rows)
    {
        int created = 0, skipped = 0, failed = 0;
        var details = new List<string>();

        // Ensure the "Standard User" group exists before importing members
        const string groupName = "Standard User";
        EnsureMemberGroup(groupName);

        foreach (var row in rows)
        {
            try
            {
                var existing = await _memberManager.FindByEmailAsync(row.Email);
                if (existing != null)
                {
                    skipped++;
                    details.Add($"SKIP  {row.Email} — already exists");
                    continue;
                }

                // Create with a random temporary password.
                // After import, run the post-import SQL to restore original password hashes.
                var tempPassword = $"Tmp_{Guid.NewGuid():N}!1A";

                var identity = MemberIdentityUser.CreateNew(
                    username: row.LoginName,
                    email: row.Email,
                    memberTypeAlias: "Member",
                    isApproved: true,
                    name: row.Name);

                var result = await _memberManager.CreateAsync(identity, tempPassword);

                if (result.Succeeded)
                {
                    // Assign to Standard User group
                    AssignToGroup(row.Email, groupName);

                    created++;
                    details.Add($"OK    {row.Email} — {row.Name} → {groupName}");
                    _logger.LogInformation("Imported member {Email} → {Group}", row.Email, groupName);
                }
                else
                {
                    failed++;
                    var err = string.Join("; ", result.Errors.Select(e => e.Description));
                    details.Add($"FAIL  {row.Email} — {err}");
                    _logger.LogWarning("Failed to import {Email}: {Errors}", row.Email, err);
                }
            }
            catch (Exception ex)
            {
                failed++;
                details.Add($"ERR   {row.Email} — {ex.Message}");
                _logger.LogError(ex, "Exception importing {Email}", row.Email);
            }
        }

        return new MemberImportResult(created, skipped, failed, details);
    }

    private void EnsureMemberGroup(string name)
    {
        var existing = _memberGroupService.GetByName(name);
        if (existing != null) return;

        var group = new Umbraco.Cms.Core.Models.MemberGroup { Name = name };
        _memberGroupService.Save(group);
        _logger.LogInformation("Created member group '{Group}'", name);
    }

    private void AssignToGroup(string email, string groupName)
    {
        var member = _memberService.GetByEmail(email);
        if (member == null) return;
        _memberService.AssignRole(member.Username, groupName);
    }
}
