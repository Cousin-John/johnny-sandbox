using System.Security.Cryptography;
using System.Text;

namespace HelloWorldApi.Helpers;

public interface IHashHelper
{
    string GenerateHash(string businessId, string matterId, string version);
}

public class HashHelper : IHashHelper
{
    public string GenerateHash(string businessId, string matterId, string version)
    {
        var input = $"{businessId}|{matterId}|{version}";
        using var sha256 = SHA256.Create();
        var hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(input));
        
        // Convert to base64 and make URL-safe
        var base64 = Convert.ToBase64String(hashBytes)
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');
            
        return base64;
    }
} 