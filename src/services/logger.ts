/**
 * Structured logging service
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, unknown>;
  error?: Error;
}

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private isDevelopment = process.env.NODE_ENV === 'development';

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Log debug information (only in development)
   */
  debug(message: string, context?: Record<string, unknown>) {
    if (this.isDevelopment) {
      this.log('debug', message, context);
      console.log(`[DEBUG] ${message}`, context || '');
    }
  }

  /**
   * Log general information
   */
  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context);
    console.info(`[INFO] ${message}`, context || '');
  }

  /**
   * Log warnings
   */
  warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context);
    console.warn(`[WARN] ${message}`, context || '');
  }

  /**
   * Log errors
   */
  error(message: string, error?: Error | unknown, context?: Record<string, unknown>) {
    const err = error instanceof Error ? error : new Error(String(error));
    this.log('error', message, context, err);
    console.error(`[ERROR] ${message}`, err, context || '');
  }

  /**
   * Create a logger with a specific context
   */
  withContext(defaultContext: Record<string, unknown>) {
    const parentLogger = this;
    return {
      debug: (message: string, context?: Record<string, unknown>) =>
        parentLogger.debug(message, { ...defaultContext, ...context }),
      info: (message: string, context?: Record<string, unknown>) =>
        parentLogger.info(message, { ...defaultContext, ...context }),
      warn: (message: string, context?: Record<string, unknown>) =>
        parentLogger.warn(message, { ...defaultContext, ...context }),
      error: (message: string, error?: Error | unknown, context?: Record<string, unknown>) =>
        parentLogger.error(message, error, { ...defaultContext, ...context }),
    };
  }

  /**
   * Measure execution time
   */
  async measureTime<T>(
    label: string,
    fn: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<T> {
    const startTime = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      this.info(`${label} completed`, { ...context, duration: `${duration.toFixed(2)}ms` });
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.error(`${label} failed`, error, { ...context, duration: `${duration.toFixed(2)}ms` });
      throw error;
    }
  }

  /**
   * Clear old logs to prevent memory issues
   */
  private trimLogs() {
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  /**
   * Internal logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
      error,
    };

    this.logs.push(entry);
    this.trimLogs();

    // In production, you might want to send logs to a service
    if (process.env.NODE_ENV === 'production' && level === 'error') {
      this.sendToLoggingService(entry);
    }
  }

  /**
   * Send logs to external service (placeholder)
   */
  private sendToLoggingService(entry: LogEntry) {
    // TODO: Implement sending to actual logging service
    // For now, just store in localStorage
    try {
      const storedLogs = localStorage.getItem('error_logs');
      const logs = storedLogs ? JSON.parse(storedLogs) : [];
      logs.push({
        ...entry,
        timestamp: entry.timestamp.toISOString(),
        error: entry.error ? {
          message: entry.error.message,
          stack: entry.error.stack,
        } : undefined,
      });
      
      // Keep only last 100 error logs in localStorage
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      localStorage.setItem('error_logs', JSON.stringify(logs));
    } catch {
      // Fail silently if localStorage is not available
    }
  }

  /**
   * Get all logs
   */
  getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(
      this.logs.map(log => ({
        ...log,
        timestamp: log.timestamp.toISOString(),
        error: log.error ? {
          message: log.error.message,
          stack: log.error.stack,
        } : undefined,
      })),
      null,
      2
    );
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export convenience functions
export const logDebug = logger.debug.bind(logger);
export const logInfo = logger.info.bind(logger);
export const logWarn = logger.warn.bind(logger);
export const logError = logger.error.bind(logger);