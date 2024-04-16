export enum LogLevel {
    DEBUG,
    INFO,
    WARN,
    ERROR,
}
export class Logger {
    private _level: LogLevel
    private _console: Console
    constructor (level = LogLevel.ERROR, _console?: Console) {
        this._level = level
        this._console = _console || console
    }
    log = (...data: any[]) => {
        if (this._level <= LogLevel.INFO) {
            this._console.log(new Date().toLocaleTimeString(), ...data)
        }
    }
    debug = (...data: any[]) => {
        if (this._level <= LogLevel.DEBUG) {
            this._console.debug(new Date().toLocaleTimeString(), ...data)
        }
    }
    info = (...data: any[]) => {
        if (this._level <= LogLevel.INFO) {
            this._console.info(new Date().toLocaleTimeString(), ...data)
        }
    }
    warn = (...data: any[]) => {
        if (this._level <= LogLevel.WARN) {
            this._console.warn(new Date().toLocaleTimeString(), ...data)
        }
    }
    error = (...data: any[]) => {
        if (this._level <= LogLevel.ERROR) {
            this._console.error(new Date().toLocaleTimeString(), ...data)
        }
    }
}

let level = LogLevel.INFO

if (/^[0123]$/.test(process.env.LOG_LEVEL || "")) {
    level = parseInt(process.env.LOG_LEVEL || "1")
} else if (/^DEV/i.test(process.env.NODE_ENV || "")) {
    level = LogLevel.DEBUG
}

const logger = new Logger(level)
export default logger