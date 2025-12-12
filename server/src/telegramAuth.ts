import crypto from 'crypto';

interface TelegramAuthData {
  id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: string;
  hash: string;
}

export function verifyTelegramAuth(data: TelegramAuthData, botToken: string): boolean {
  const { hash, ...authData } = data;
  
  // Create data-check-string
  const checkString = Object.keys(authData)
    .sort()
    .map(key => `${key}=${authData[key as keyof typeof authData]}`)
    .join('\n');
  
  // Create secret key from bot token
  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  
  // Calculate hash
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(checkString)
    .digest('hex');
  
  // Debug logs removed for security

  // Check if auth_date is within reasonable time (e.g. 24 hours)
  const authDate = parseInt(data.auth_date);
  const now = Math.floor(Date.now() / 1000);
  const timeDiff = now - authDate;
  
  if (timeDiff > 86400) { // 24 hours in seconds
    console.log('❌ Authentication failed - auth_date too old');
    return false;
  }

  return calculatedHash === hash;
}
