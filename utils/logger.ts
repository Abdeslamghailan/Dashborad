/**
 * Secure logging utility
 * Only logs in development mode, prevents sensitive data leakage in production
 */

const isDevelopment = import.meta.env.DEV;

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private shouldLog(): boolean {
    return isDevelopment;
  }

  private sanitize(data: any): any {
    if (!data) return data;
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'hash', 'auth_token'];
    
    if (typeof data === 'object') {
      const sanitized = { ...data };
      for (const field of sensitiveFields) {
        if (field in sanitized) {
          sanitized[field] = '[REDACTED]';
        }
      }
      return sanitized;
    }
    
    return data;
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog()) {
      console.info(`[INFO] ${message}`, ...args.map(this.sanitize));
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog()) {
      console.warn(`[WARN] ${message}`, ...args.map(this.sanitize));
    }
  }

  error(message: string, error?: any): void {
    if (this.shouldLog()) {
      console.error(`[ERROR] ${message}`, error);
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog()) {
      console.debug(`[DEBUG] ${message}`, ...args.map(this.sanitize));
    }
  }
}

export const logger = new Logger();
