using System;
using System.IO;
using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace EncryptionDemo.Services
{
    public interface IEncryptionService
    {
        Task<byte[]> EncryptStringAsync(string text, string password);
        Task<string> DecryptStringAsync(byte[] encryptedData, string password);
    }

    public class EncryptionService : IEncryptionService
    {
        private const string Algorithm = "AES-256-CBC";
        private const int KeyLength = 32; // 256 bits
        private const int IvLength = 16;  // 128 bits
        private static readonly byte[] Salt = Encoding.UTF8.GetBytes("your-static-or-dynamic-salt");

        private byte[] DeriveKey(string password)
        {
            using var pbkdf2 = new Rfc2898DeriveBytes(password, Salt, 100_000, HashAlgorithmName.SHA256);
            return pbkdf2.GetBytes(KeyLength);
        }

        public async Task<byte[]> EncryptStringAsync(string text, string password)
        {
            var key = DeriveKey(password);
            var iv = RandomNumberGenerator.GetBytes(IvLength);

            // Compress the text
            byte[] compressed;
            using (var memoryStream = new MemoryStream())
            {
                using (var gzipStream = new GZipStream(memoryStream, CompressionLevel.Optimal))
                using (var writer = new StreamWriter(gzipStream))
                {
                    await writer.WriteAsync(text);
                }
                compressed = memoryStream.ToArray();
            }

            // Encrypt the compressed data
            using var aes = Aes.Create();
            aes.Key = key;
            aes.IV = iv;
            aes.Mode = CipherMode.CBC;
            aes.Padding = PaddingMode.PKCS7;

            using var encryptor = aes.CreateEncryptor();
            var encrypted = encryptor.TransformFinalBlock(compressed, 0, compressed.Length);

            // Combine IV and encrypted data
            var result = new byte[iv.Length + encrypted.Length];
            Buffer.BlockCopy(iv, 0, result, 0, iv.Length);
            Buffer.BlockCopy(encrypted, 0, result, iv.Length, encrypted.Length);

            return result;
        }

        public async Task<string> DecryptStringAsync(byte[] encryptedData, string password)
        {
            var key = DeriveKey(password);
            var iv = new byte[IvLength];
            var encrypted = new byte[encryptedData.Length - IvLength];

            Buffer.BlockCopy(encryptedData, 0, iv, 0, iv.Length);
            Buffer.BlockCopy(encryptedData, iv.Length, encrypted, 0, encrypted.Length);

            using var aes = Aes.Create();
            aes.Key = key;
            aes.IV = iv;
            aes.Mode = CipherMode.CBC;
            aes.Padding = PaddingMode.PKCS7;

            using var decryptor = aes.CreateDecryptor();
            var decrypted = decryptor.TransformFinalBlock(encrypted, 0, encrypted.Length);

            // Decompress the data
            using var memoryStream = new MemoryStream(decrypted);
            using var gzipStream = new GZipStream(memoryStream, CompressionMode.Decompress);
            using var reader = new StreamReader(gzipStream);
            return await reader.ReadToEndAsync();
        }
    }
} 