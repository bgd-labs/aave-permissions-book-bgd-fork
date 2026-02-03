/**
 * Structured logging utility for the permissions book.
 *
 * Provides consistent logging with optional verbosity control.
 * All logs go to console but are structured for easier debugging.
 */

type LogContext = Record<string, unknown>;

const formatContext = (context?: LogContext): string => {
  if (!context || Object.keys(context).length === 0) return '';
  return ' ' + JSON.stringify(context);
};

export const logger = {
  /**
   * Log informational messages.
   * Only outputs when VERBOSE env var is set.
   */
  info: (message: string, context?: LogContext): void => {
    if (process.env.VERBOSE) {
      console.log(`[INFO] ${message}${formatContext(context)}`);
    }
  },

  /**
   * Log debug messages.
   * Only outputs when DEBUG env var is set.
   */
  debug: (message: string, context?: LogContext): void => {
    if (process.env.DEBUG) {
      console.log(`[DEBUG] ${message}${formatContext(context)}`);
    }
  },

  /**
   * Log warning messages.
   * Always outputs.
   */
  warn: (message: string, context?: LogContext): void => {
    console.warn(`[WARN] ${message}${formatContext(context)}`);
  },

  /**
   * Log error messages.
   * Always outputs. Accepts an error object for stack trace.
   */
  error: (message: string, error?: unknown, context?: LogContext): void => {
    const errorInfo = error instanceof Error
      ? { errorMessage: error.message, stack: error.stack }
      : { error: String(error) };
    console.error(`[ERROR] ${message}`, { ...errorInfo, ...context });
  },

  /**
   * Log table generation progress.
   * This maintains the existing console output format for visibility.
   */
  tableProgress: (network: string, pool: string, tableName: string, fromBlock?: number): void => {
    const blockInfo = fromBlock !== undefined ? `fromBlock: ${fromBlock}\n    ` : '';
    console.log(`
  ------------------------------------
    network: ${network}
    pool: ${pool}
    ${blockInfo}${tableName} Table
  ------------------------------------`);
  },

  /**
   * Log pool completion.
   */
  poolFinished: (network: string, pool: string): void => {
    console.log(`----${network} : ${pool} finished`);
  },

  /**
   * Log event indexing progress.
   */
  eventProgress: (
    chainId: number | undefined,
    startBlock: number,
    toBlock: number,
    maxBlock: number | null,
    limit: number,
    eventTypes: string[],
    logsCount: number
  ): void => {
    console.log(
      `chainId: ${chainId}, startBlock: ${startBlock}, toBlock: ${toBlock}, ` +
      `maxBlock: ${maxBlock ?? 'null'}, limit: ${limit}, | ` +
      `event: ${eventTypes.join(', ')}, intervalLogs: ${logsCount}`
    );
  },

  /**
   * Log final completion message.
   */
  finished: (): void => {
    console.log('--------------FINISHED--------------');
  },
};

export default logger;
