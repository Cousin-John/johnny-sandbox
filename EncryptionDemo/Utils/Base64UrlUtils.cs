using System;
using System.Text;

namespace EncryptionDemo.Utils
{
    public static class Base64UrlUtils
    {
        public static string ToBase64Url(byte[] data)
        {
            return Convert.ToBase64String(data)
                .Replace('+', '-')
                .Replace('/', '_')
                .TrimEnd('=');
        }

        public static byte[] FromBase64Url(string base64Url)
        {
            string base64 = base64Url
                .Replace('-', '+')
                .Replace('_', '/');

            // Add padding if needed
            switch (base64.Length % 4)
            {
                case 2: base64 += "=="; break;
                case 3: base64 += "="; break;
            }

            return Convert.FromBase64String(base64);
        }
    }
} 