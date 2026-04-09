using System.Reflection;
using Umbraco.Cms.Core.Mail;
using Umbraco.Cms.Core.Models.Email;

namespace IISHF.Api.Services;

public class AuthEmailService
{
    private readonly IEmailSender _emailSender;
    private readonly IConfiguration _config;
    private readonly ILogger<AuthEmailService> _logger;

    public AuthEmailService(
        IEmailSender emailSender,
        IConfiguration config,
        ILogger<AuthEmailService> logger)
    {
        _emailSender = emailSender;
        _config = config;
        _logger = logger;
    }

    /// <summary>
    /// Sends a registration verification email using MemberRegistration.html.
    /// Link: {SiteUrl}/verify?email={email}&token={token}
    /// </summary>
    public async Task SendVerificationEmailAsync(string toEmail, string name, string token)
    {
        var siteUrl = SiteUrl();
        var tokenUrl = $"{siteUrl}/verify?email={Uri.EscapeDataString(toEmail)}&token={Uri.EscapeDataString(token)}";

        var body = await RenderTemplate("MemberRegistration.html", name, tokenUrl);

        await SendAsync(toEmail, "Complete your IISHF registration", body);
    }

    /// <summary>
    /// Sends a password reset email using PasswordReset.html.
    /// Link: {SiteUrl}/reset-password?email={email}&token={token}
    /// </summary>
    public async Task SendPasswordResetEmailAsync(string toEmail, string name, string token)
    {
        var siteUrl = SiteUrl();
        var tokenUrl = $"{siteUrl}/reset-password?email={Uri.EscapeDataString(toEmail)}&token={Uri.EscapeDataString(token)}";

        var body = await RenderTemplate("PasswordReset.html", name, tokenUrl);

        await SendAsync(toEmail, "Reset your IISHF password", body);
    }

    // ── Internals ─────────────────────────────────────────────────────────────

    private string SiteUrl() =>
        (_config["SiteUrl"] ?? "https://www.iishf.com").TrimEnd('/');

    private static async Task<string> RenderTemplate(string templateName, string name, string tokenUrl)
    {
        var assembly = Assembly.GetExecutingAssembly();
        var resourceName = assembly
            .GetManifestResourceNames()
            .FirstOrDefault(r => r.EndsWith(templateName, StringComparison.OrdinalIgnoreCase));

        if (resourceName == null)
            throw new InvalidOperationException($"Email template '{templateName}' not found in assembly resources.");

        using var stream = assembly.GetManifestResourceStream(resourceName)!;
        using var reader = new StreamReader(stream);
        var html = await reader.ReadToEndAsync();

        return html
            .Replace("{{Name}}", System.Net.WebUtility.HtmlEncode(name))
            .Replace("{{TokenUrl}}", tokenUrl);
    }

    private async Task SendAsync(string to, string subject, string htmlBody)
    {
        try
        {
            var from = _config["Umbraco:CMS:Notifications:Email"] ?? "noreply@iishf.com";
            var message = new EmailMessage(from, to, subject, htmlBody, isBodyHtml: true);
            await _emailSender.SendAsync(message, emailType: "Auth");
            _logger.LogInformation("Auth email sent to {To}: {Subject}", to, subject);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send auth email to {To}: {Subject}", to, subject);
            throw;
        }
    }
}
