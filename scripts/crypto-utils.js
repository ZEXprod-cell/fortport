// crypto-utils.js - Base64 message obfuscation/encoding

/**
 * Encrypt (encode) a message to Base64 with a random salt prefix
 */
export async function encryptMessage(chatId, message) {
  if (!message) return '';
  try {
    // Generate a random 4-byte salt hex
    const randomSalt = Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Salt + message payload
    const payload = `${randomSalt}:${message}`;
    
    // UTF-8 to Base64
    const bytes = new TextEncoder().encode(payload);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch (err) {
    console.error('Encoding error:', err);
    try {
      return btoa(unescape(encodeURIComponent(message)));
    } catch {
      return message;
    }
  }
}

/**
 * Decrypt (decode) a Base64 message
 */
export async function decryptMessage(chatId, encryptedData) {
  if (!encryptedData) return '';
  try {
    // Base64 to UTF-8
    const binary = atob(encryptedData);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const decoded = new TextDecoder().decode(bytes);
    
    // Check if salt prefix exists (4 hex bytes = 8 chars followed by :)
    if (decoded.includes(':') && decoded.indexOf(':') === 8) {
      return decoded.slice(9);
    }
    return decoded;
  } catch (err) {
    // Return original if decoding fails
    return encryptedData;
  }
}

export async function encryptFile(chatId, file) {
    return file;
}

export async function decryptFile(chatId, encryptedBlob) {
    return encryptedBlob;
}

export function isEncrypted(message) {
  try {
    atob(message);
    return message && message.length > 8;
  } catch {
    return false;
  }
}
