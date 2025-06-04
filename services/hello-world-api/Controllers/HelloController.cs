using Microsoft.AspNetCore.Mvc;
using HelloWorldApi.Helpers;
using HelloWorldApi.Models;
using HelloWorldApi.Services;

namespace HelloWorldApi.Controllers;

[ApiController]
[Route("[controller]")]
public class HelloController : ControllerBase
{
    private readonly IHashHelper _hashHelper;
    private readonly IHashStorageService _hashStorage;

    public HelloController(IHashHelper hashHelper, IHashStorageService hashStorage)
    {
        _hashHelper = hashHelper;
        _hashStorage = hashStorage;
    }

    [HttpGet]
    public IActionResult Get()
    {
        return Ok("Hello, World!");
    }

    [HttpPost("hash")]
    public IActionResult GenerateHash([FromBody] HashRequest request)
    {
        if (string.IsNullOrEmpty(request.BusinessId) || 
            string.IsNullOrEmpty(request.MatterId) || 
            string.IsNullOrEmpty(request.Version))
        {
            return BadRequest("All fields (BusinessId, MatterId, and Version) are required.");
        }

        var hash = _hashHelper.GenerateHash(request.BusinessId, request.MatterId, request.Version);
        
        var record = new HashRecord
        {
            BusinessId = request.BusinessId,
            MatterId = request.MatterId,
            Version = request.Version,
            Hash = hash,
            CreatedAt = DateTime.UtcNow
        };
        
        _hashStorage.StoreHash(record);
        
        return Ok(new { hash });
    }

    [HttpGet("lookup/{hash}")]
    public IActionResult LookupHash(string hash)
    {
        var record = _hashStorage.FindByHash(hash);
        if (record == null)
        {
            return NotFound($"No record found for hash: {hash}");
        }
        return Ok(record);
    }

    [HttpGet("business/{businessId}")]
    public IActionResult GetBusinessHashes(string businessId)
    {
        var records = _hashStorage.FindByBusinessId(businessId);
        return Ok(records);
    }
} 