import { encryptString, decryptString } from './encryption';

/**
 * Convert to URL-safe Base64
 */
function toBase64URL(buffer: Buffer): string {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Convert from URL-safe Base64
 */
function fromBase64URL(str: string): Buffer {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64');
}

async function runTest() {
  // Use a strong passphrase in production
  const secret = process.env.MY_SECRET_KEY || 'replace-with-strong-passphrase';

  // Original string to encrypt
  const original = 'JN9bPcRSQkdbWCmGB18Z:5d56wfg:b7f32e95-0938-5837-b8c3-1f799c4161fb:b7f32e95-0938-5837-b8c3-1f799c4161fb';
  console.log('Step 1 - Original string:', original);
  console.log('Original length:', original.length);

  // Encrypt the string
  const encryptedBuffer = await encryptString(original, secret);
  console.log('\nStep 2 - Encrypted buffer length:', encryptedBuffer.length);

  // Convert to different formats
  const standardBase64 = encryptedBuffer.toString('base64');
  const urlSafeBase64 = toBase64URL(encryptedBuffer);

  console.log('\nStep 3 - Base64 encodings:');
  console.log('Standard Base64:', standardBase64);
  console.log('Standard length:', standardBase64.length);
  console.log('\nURL-safe Base64:', urlSafeBase64);
  console.log('URL-safe length:', urlSafeBase64.length);

  // Verify URL-safe characteristics
  console.log('\nStep 4 - URL-safe verification:');
  console.log('Contains only safe chars:', /^[a-zA-Z0-9\-_]+$/.test(urlSafeBase64) ? 'Yes' : 'No');
  console.log('No padding (=):', !urlSafeBase64.includes('=') ? 'Yes' : 'No');
  console.log('No plus signs (+):', !urlSafeBase64.includes('+') ? 'Yes' : 'No');
  console.log('No forward slashes (/):', !urlSafeBase64.includes('/') ? 'Yes' : 'No');

  // Convert back to buffer and decrypt
  console.log('\nStep 5 - Decoding and decryption:');
  
  // From standard Base64
  const fromStandardBuffer = Buffer.from(standardBase64, 'base64');
  const recoveredFromStandard = await decryptString(fromStandardBuffer, secret);
  console.log('Recovered from standard:', recoveredFromStandard);

  // From URL-safe Base64
  const fromUrlSafeBuffer = fromBase64URL(urlSafeBase64);
  const recoveredFromUrlSafe = await decryptString(fromUrlSafeBuffer, secret);
  console.log('Recovered from URL-safe:', recoveredFromUrlSafe);

  // Final verification
  console.log('\nStep 6 - Final verification:');
  const standardSuccess = original === recoveredFromStandard;
  const urlSafeSuccess = original === recoveredFromUrlSafe;
  
  console.log('Standard Base64 roundtrip:', standardSuccess ? 'Success!' : 'Failed!');
  console.log('URL-safe Base64 roundtrip:', urlSafeSuccess ? 'Success!' : 'Failed!');
  console.log('Both methods match:', recoveredFromStandard === recoveredFromUrlSafe ? 'Yes' : 'No');
}

runTest().catch(console.error); 