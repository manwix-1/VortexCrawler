import { settings } from '../config/settings.js';

const logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

class Logger {
    constructor() {
        this.debugEnabled = settings.debugging.enabled;
        this.logLevel = logLevels[settings.debugging.logLevel];
    }

    log(level, ...args) {
        if (logLevels[level] <= this.logLevel) {
            const timestamp = new Date().toISOString();
            console[level](`[${timestamp}] [${level.toUpperCase()}]:`, ...args);
        }
    }

    error(...args) {
        this.log('error', ...args);
    }

    warn(...args) {
        this.log('warn', ...args);
    }

    info(...args) {
        this.log('info', ...args);
    }

    debug(...args) {
        this.log('debug', ...args);
    }
}

export const logger = new Logger();
