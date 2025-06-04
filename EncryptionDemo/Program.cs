using System;
using System.Text;
using System.Threading.Tasks;
using EncryptionDemo.Services;
using EncryptionDemo.Utils;

namespace EncryptionDemo
{
    class Program
    {
        static async Task Main(string[] args)
        {
            var encryptionService = new EncryptionService();
            var secret = Environment.GetEnvironmentVariable("MY_SECRET_KEY") ?? "replace-with-strong-passphrase";

            // Original string to encrypt
            var original = "JN9bPcRSQkdbWCmGB18Z:5d56wfg:b7f32e95-0938-5837-b8c3-1f799c4161fb:b7f32e95-0938-5837-b8c3-1f799c4161fb";
            Console.WriteLine("Step 1 - Original string: " + original);
            Console.WriteLine("Original length: " + original.Length);

            // Encrypt the string
            var encryptedBuffer = await encryptionService.EncryptStringAsync(original, secret);
            Console.WriteLine("\nStep 2 - Encrypted buffer length: " + encryptedBuffer.Length);

            // Convert to different formats
            var standardBase64 = Convert.ToBase64String(encryptedBuffer);
            var urlSafeBase64 = Base64UrlUtils.ToBase64Url(encryptedBuffer);

            Console.WriteLine("\nStep 3 - Base64 encodings:");
            Console.WriteLine("Standard Base64: " + standardBase64);
            Console.WriteLine("Standard length: " + standardBase64.Length);
            Console.WriteLine("\nURL-safe Base64: " + urlSafeBase64);
            Console.WriteLine("URL-safe length: " + urlSafeBase64.Length);

            // Verify URL-safe characteristics
            Console.WriteLine("\nStep 4 - URL-safe verification:");
            Console.WriteLine("Contains only safe chars: " + 
                (urlSafeBase64.All(c => char.IsLetterOrDigit(c) || c == '-' || c == '_') ? "Yes" : "No"));
            Console.WriteLine("No padding (=): " + (!urlSafeBase64.Contains('=') ? "Yes" : "No"));
            Console.WriteLine("No plus signs (+): " + (!urlSafeBase64.Contains('+') ? "Yes" : "No"));
            Console.WriteLine("No forward slashes (/): " + (!urlSafeBase64.Contains('/') ? "Yes" : "No"));

            // Convert back to buffer and decrypt
            Console.WriteLine("\nStep 5 - Decoding and decryption:");

            // From standard Base64
            var fromStandardBuffer = Convert.FromBase64String(standardBase64);
            var recoveredFromStandard = await encryptionService.DecryptStringAsync(fromStandardBuffer, secret);
            Console.WriteLine("Recovered from standard: " + recoveredFromStandard);

            // From URL-safe Base64
            var fromUrlSafeBuffer = Base64UrlUtils.FromBase64Url(urlSafeBase64);
            var recoveredFromUrlSafe = await encryptionService.DecryptStringAsync(fromUrlSafeBuffer, secret);
            Console.WriteLine("Recovered from URL-safe: " + recoveredFromUrlSafe);

            // Final verification
            Console.WriteLine("\nStep 6 - Final verification:");
            var standardSuccess = original == recoveredFromStandard;
            var urlSafeSuccess = original == recoveredFromUrlSafe;

            Console.WriteLine("Standard Base64 roundtrip: " + (standardSuccess ? "Success!" : "Failed!"));
            Console.WriteLine("URL-safe Base64 roundtrip: " + (urlSafeSuccess ? "Success!" : "Failed!"));
            Console.WriteLine("Both methods match: " + (recoveredFromStandard == recoveredFromUrlSafe ? "Yes" : "No"));
        }
    }
}
