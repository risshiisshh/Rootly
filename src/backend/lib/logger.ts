type LogLevel = 'info' | 'warn' | 'error'

class Logger {
  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString()
    const metaStr = meta ? ` | Meta: ${JSON.stringify(meta)}` : ''
    return `[${timestamp}] [${level.toUpperCase()}]: ${message}${metaStr}`
  }

  info(message: string, meta?: any) {
    console.log(this.formatMessage('info', message, meta))
  }

  warn(message: string, meta?: any) {
    console.warn(this.formatMessage('warn', message, meta))
  }

  error(message: string, stack?: string, meta?: any) {
    const combinedMeta = { ...(meta || {}), ...(stack ? { stack } : {}) }
    console.error(this.formatMessage('error', message, combinedMeta))
  }
}

export const logger = new Logger()
