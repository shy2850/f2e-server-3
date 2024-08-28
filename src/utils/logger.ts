export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    LOG = 1,
    WARN = 2,
    ERROR = 3,
    OFF = 5,
}

type LogType = 'debug' | 'info' | 'log' | 'warn' | 'error'

const LogTypeShow = {
    debug: 'DEBUG',
    info: 'INFO',
    log: 'LOG',
    warn: 'WARN',
    error: 'ERROR',
}

export const LogLevelOptions = ['DEBUG', 'INFO', 'LOG', 'WARN', 'ERROR', 'OFF'] as const

const time_show_map: Record<number, string> = {}
export class Logger {
    private _level: LogLevel
    setLevel = (level: LogLevel | keyof typeof LogLevel) => {
        if (typeof level === 'string') {
            this._level = LogLevel[level]
        } else {
            this._level = level
        }
    }
    private _console: Console
    constructor (level = LogLevel.ERROR, _console?: Console) {
        this._level = level
        this._console = _console || console
    }
    private logWrapper(level: LogLevel, type: LogType, ...data: any[]) {
        if (this._level <= level) {
            const now = new Date();
            const time = Math.floor(now.getTime() / 1000);
            const show = time_show_map[time] || (time_show_map[time] = now.toLocaleString());
            this._console[type](show, LogTypeShow[type], ...data);
        }
    }
    log = (...data: any[]) => this.logWrapper(LogLevel.INFO, 'log', ...data);
    debug = (...data: any[]) => this.logWrapper(LogLevel.DEBUG, 'debug', ...data);
    info = (...data: any[]) => this.logWrapper(LogLevel.INFO, 'info', ...data);
    warn = (...data: any[]) => this.logWrapper(LogLevel.WARN, 'warn', ...data);
    error = (...data: any[]) => this.logWrapper(LogLevel.ERROR, 'error', ...data);
}

let level = LogLevel.INFO

try {
    const logLevelEnv = process.env.LOG_LEVEL;
    if (/^[0123]$/.test(logLevelEnv || "")) {
        level = parseInt(logLevelEnv || "1", 10);
    } else if (process.argv.find(arg => arg === "--debug")) {
        level = LogLevel.DEBUG;
    }
} catch (error) {
    console.error("Failed to parse LOG_LEVEL:", error);
}

export const logger = new Logger(level)
export default logger