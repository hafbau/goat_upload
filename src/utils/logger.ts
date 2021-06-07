const LEVELS = ['strict', 'error', 'warn', 'info', 'debug']
const LOG_LEVEL = process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL) : 4;

export interface Logger {
  strict: (...args: any[]) => void;
  error: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  info: (...args: any[]) => void;
  debug: (...args: any[]) => void;
}
const logger: Logger = LEVELS.reduce((loggr, levelStr, idx) => ({
  ...loggr,
  [levelStr]: (...args: any[]) => {
    if (LOG_LEVEL > idx - 1) {
      console.log(
        levelStr.toUpperCase(),
        '::',
        ...args
      );
    }
  }
}), {} as Logger);

export default logger;