using System.ComponentModel.DataAnnotations;

namespace IISHF.Application.Records;

public record LoginRequest(
    [property: Required]
    [property: EmailAddress]
    string Email,

    [property: Required]
    string Password
);

public record RegisterRequest(
    [property: Required]
    [property: MaxLength(80)]
    string Name,

    [property: Required]
    [property: EmailAddress]
    string Email,

    [property: Required]
    [property: MinLength(8, ErrorMessage = "Password must be at least 8 characters")]
    string Password
);

public record ForgotPasswordRequest(
    [property: Required]
    [property: EmailAddress]
    string Email
);

public record ResetPasswordRequest(
    [property: Required]
    string Token,

    [property: Required]
    [property: EmailAddress]
    string Email,

    [property: Required]
    [property: MinLength(8, ErrorMessage = "Password must be at least 8 characters")]
    string NewPassword
);

public record MemberResponse(
    string Id,
    string Email,
    string Name,
    bool IsEmailVerified
);
