using System.ComponentModel.DataAnnotations;

namespace IISHF.Application.Records;

public record ContactRequest(
    [property: Required]
    [property: MaxLength(80, ErrorMessage = "Name must be 80 characters or less")]
    string Name,

    [property: Required]
    [property: EmailAddress(ErrorMessage = "Please enter a valid email address")]
    string Email,

    [property: Required]
    [property: MaxLength(80, ErrorMessage = "Subject must be 80 characters or less")]
    string Subject,

    [property: Required]
    [property: MaxLength(500, ErrorMessage = "Message must be 500 characters or less")]
    string Message
);
