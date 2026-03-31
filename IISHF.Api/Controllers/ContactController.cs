using IISHF.Application.Records;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Core.Services;

namespace IISHF.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ContactController : ControllerBase
{
    private readonly IContentService _contentService;
    private readonly ILogger<ContactController> _logger;

    public ContactController(IContentService contentService, ILogger<ContactController> logger)
    {
        _contentService = contentService;
        _logger = logger;
    }

    [HttpPost]
    public IActionResult Post([FromBody] ContactRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(new { error = "Please fill in all required fields." });

        try
        {
            // Locate the Contact Items node: Root > Data > Contact Items
            var rootItems = _contentService.GetRootContent().ToList();
            var dataNode = rootItems
                .SelectMany(r => _contentService.GetPagedChildren(r.Id, 0, 200, out _))
                .FirstOrDefault(x => x.Name == "Data");

            if (dataNode != null)
            {
                var contactItems = _contentService
                    .GetPagedChildren(dataNode.Id, 0, 200, out _)
                    .FirstOrDefault(x => x.Name == "Contact Items");

                if (contactItems != null)
                {
                    var contact = _contentService.Create(
                        $"Contact from {request.Name} at {DateTime.UtcNow:s}",
                        contactItems.Id,
                        "contactItem");

                    contact.SetValue("sender", request.Name);
                    contact.SetValue("senderEmail", request.Email);
                    contact.SetValue("subject", request.Subject);
                    contact.SetValue("message", request.Message);

                    _contentService.Save(contact);
                }
                else
                {
                    _logger.LogWarning("Contact Items node not found under Data — submission from {Name} not stored in CMS", request.Name);
                }
            }
            else
            {
                _logger.LogWarning("Data node not found in content tree — submission from {Name} not stored in CMS", request.Name);
            }
        }
        catch (Exception ex)
        {
            // Log but don't surface the error — the user's message is still received
            _logger.LogError(ex, "Failed to save contact record for {Name} ({Email})", request.Name, request.Email);
        }

        return Ok(new { success = true });
    }
}
