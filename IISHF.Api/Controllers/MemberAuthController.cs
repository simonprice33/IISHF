using IISHF.Application.Records;
using Microsoft.AspNetCore.Authentication;
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
    private readonly ILogger<MemberAuthController> _logger;

    public MemberAuthController(
        IMemberManager memberManager,
        IMemberService memberService,
        IMemberSignInManager memberSignInManager,
        ILogger<MemberAuthController> logger)
    {
        _memberManager = memberManager;
        _memberService = memberService;
        _memberSignInManager = memberSignInManager;
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

        // Check if email already in use
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

        // Generate email verification token
        var token = await _memberManager.GenerateEmailConfirmationTokenAsync(identityMember);

        // Persist the token on the member record so we can verify it later
        var member = _memberService.GetByEmail(request.Email);
        if (member != null)
        {
            member.SetValue("emailVerificationToken", token);
            _memberService.Save(member);
        }

        _logger.LogInformation("New member registered: {Email}. Verification token generated.", request.Email);

        // In production you would send an email here with a link containing the token.
        // For now we return the token so the frontend can handle it (dev mode).
        return Ok(new { success = true, verificationToken = token });
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

        // Always return success so we don't reveal whether the email exists
        var member = await _memberManager.FindByEmailAsync(request.Email);
        if (member != null)
        {
            var token = await _memberManager.GeneratePasswordResetTokenAsync(member);

            // Persist the token for verification
            var umbracoMember = _memberService.GetByEmail(request.Email);
            if (umbracoMember != null)
            {
                umbracoMember.SetValue("passwordResetToken", token);
                _memberService.Save(umbracoMember);
            }

            _logger.LogInformation("Password reset requested for {Email}. Token generated.", request.Email);
            // In production: send email with reset link containing token + email
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
