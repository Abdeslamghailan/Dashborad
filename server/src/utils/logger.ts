/**
 * Secure server-side logging utility
 * Implements proper log levels and prevents sensitive data leakage
 */

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogOptions {
  level: LogLevel;
  message: string;
  data?: any;
  error?: Error;
}

class ServerLogger {
  private shouldLog(level: LogLevel): boolean {
    if (isProduction && level === 'debug') {
      return false;
    }
    return true;
  }

  private sanitize(data: any): any {
    if (!data) return data;
    
    // Remove sensitive fields
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'apiKey',
      'hash',
      'auth_token',
      'JWT_SECRET',
      'TELEGRAM_BOT_TOKEN',
      'DATABASE_URL',
      'photoUrl' // May contain sensitive URLs
    ];
    
    if (typeof data === 'object') {
      const sanitized = Array.isArray(data) ? [...data] : { ...data };
      
      for (const key in sanitized) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof sanitized[key] === 'object') {
          sanitized[key] = this.sanitize(sanitized[key]);
        }
      }
      
      return sanitized;
    }
    
    return data;
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (data) {
      const sanitizedData = isDevelopment ? this.sanitize(data) : '[DATA HIDDEN]';
      return `${prefix} ${message} ${JSON.stringify(sanitizedData)}`;
    }
    
    return `${prefix} ${message}`;
  }

  info(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, data));
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, data));
    }
  }

  error(message: string, error?: Error | any, data?: any): void {
    if (this.shouldLog('error')) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error && isDevelopment ? error.stack : undefined;
      
      console.error(this.formatMessage('error', message, { error: errorMessage, ...data }));
      
      if (stack && isDevelopment) {
        console.error(stack);
      }
    }
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, data));
    }
  }

  // Security-specific logging
  security(message: string, data?: any): void {
    // Always log security events, even in production
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [SECURITY] ${message}`, this.sanitize(data));
  }
}

export const logger = new ServerLogger();
