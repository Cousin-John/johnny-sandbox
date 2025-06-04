namespace HelloWorldApi.Models;

public class HashRecord
{
    public string BusinessId { get; set; } = string.Empty;
    public string MatterId { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public string Hash { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
} 