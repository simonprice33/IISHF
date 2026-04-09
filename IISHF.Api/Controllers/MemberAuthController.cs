using IISHF.Api.Services;
using IISHF.Application.Records;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Core.Security;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Web.Common.Security;

namespace IISHF.Api.Controllers;

[ApiController]
[Route("api/memberauth")]
public class MemberAuthController : ControllerBase
{
    private readonly IMemberManager _memberManager;
    private readonly IMemberService _memberService;
    private readonly IMemberSignInManager _memberSignInManager;
    private readonly AuthEmailService _emailService;
    private readonly ILogger<MemberAuthController> _logger;

    public MemberAuthController(
        IMemberManager memberManager,
        IMemberService memberService,
        IMemberSignInManager memberSignInManager,
        AuthEmailService emailService,
        ILogger<MemberAuthController> logger)
    {
        _memberManager = memberManager;
        _memberService = memberService;
        _memberSignInManager = memberSignInManager;
        _emailService = emailService;
        _logger = logger;
    }

    // GET /api/memberauth/me
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var member = await _memberManager.GetCurrentMemberAsync();
        if (member == null)
            return Unauthorized(new { error = "Not logged in." });

        return Ok(new MemberResponse(
            member.Key.ToString(),
            member.Email ?? "",
            member.Name ?? "",
            member.IsApproved
        ));
    }

    // POST /api/memberauth/login
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(new { error = "Invalid request." });

        var result = await _memberSignInManager.PasswordSignInAsync(
            request.Email,
            request.Password,
            isPersistent: true,
            lockoutOnFailure: true);

        if (result.Succeeded)
        {
            var member = await _memberManager.FindByEmailAsync(request.Email);
            if (member == null)
                return Ok(new { success = true });

            return Ok(new
            {
                success = true,
                member = new MemberResponse(
                    member.Key.ToString(),
                    member.Email ?? "",
                    member.Name ?? "",
                    member.IsApproved
                )
            });
        }

        if (result.IsLockedOut)
            return StatusCode(423, new { error = "Account locked. Please try again later." });

        if (result.IsNotAllowed)
            return StatusCode(403, new { error = "Email address not verified. Please check your inbox." });

        return Unauthorized(new { error = "Invalid email or password." });
    }

    // POST /api/memberauth/logout
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await _memberSignInManager.SignOutAsync();
        return Ok(new { success = true });
    }

    // POST /api/memberauth/register
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var existing = await _memberManager.FindByEmailAsync(request.Email);
        if (existing != null)
            return Conflict(new { error = "An account with this email already exists." });

        var identityMember = MemberIdentityUser.CreateNew(
            request.Email,
            request.Email,
            "Member",
            isApproved: false,
            request.Name);

        var createResult = await _memberManager.CreateAsync(identityMember, request.Password);

        if (!createResult.Succeeded)
        {
            var errors = string.Join("; ", createResult.Errors.Select(e => e.Description));
            return BadRequest(new { error = errors });
        }

        var token = await _memberManager.GenerateEmailConfirmationTokenAsync(identityMember);

        try
        {
            await _emailService.SendVerificationEmailAsync(request.Email, request.Name, token);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send verification email to {Email}", request.Email);
            // Don't fail the registration if email sending fails — member is created
        }

        _logger.LogInformation("New member registered: {Email}", request.Email);
        return Ok(new { success = true });
    }

    // POST /api/memberauth/verify
    [HttpPost("verify")]
    public async Task<IActionResult> Verify([FromQuery] string email, [FromQuery] string token)
    {
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(token))
            return BadRequest(new { error = "Email and token are required." });

        var member = await _memberManager.FindByEmailAsync(email);
        if (member == null)
            return NotFound(new { error = "Account not found." });

        var result = await _memberManager.ConfirmEmailAsync(member, token);
        if (!result.Succeeded)
        {
            var errors = string.Join("; ", result.Errors.Select(e => e.Description));
            return BadRequest(new { error = $"Verification failed: {errors}" });
        }

        // Approve the member now that email is confirmed
        var umbracoMember = _memberService.GetByEmail(email);
        if (umbracoMember != null)
        {
            umbracoMember.IsApproved = true;
            _memberService.Save(umbracoMember);
        }

        return Ok(new { success = true });
    }

    // POST /api/memberauth/forgot-password
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(new { error = "Invalid request." });

        // Always return success — never reveal whether the email exists
        var member = await _memberManager.FindByEmailAsync(request.Email);
        if (member != null)
        {
            var token = await _memberManager.GeneratePasswordResetTokenAsync(member);
            var name = member.Name ?? member.Email ?? request.Email;

            try
            {
                await _emailService.SendPasswordResetEmailAsync(request.Email, name, token);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send password reset email to {Email}", request.Email);
            }

            _logger.LogInformation("Password reset email sent to {Email}", request.Email);
        }

        return Ok(new { success = true });
    }

    // POST /api/memberauth/reset-password
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var member = await _memberManager.FindByEmailAsync(request.Email);
        if (member == null)
            return BadRequest(new { error = "Invalid or expired reset link." });

        var result = await _memberManager.ResetPasswordAsync(member, request.Token, request.NewPassword);
        if (!result.Succeeded)
        {
            var errors = string.Join("; ", result.Errors.Select(e => e.Description));
            return BadRequest(new { error = errors });
        }

        return Ok(new { success = true });
    }
}
