const fs = require('fs');
const path = require('path');

class Logger {
    constructor(options = {}) {
        this.logDir = options.logDir || path.join(process.cwd(), 'logs');
        this.logLevel = options.logLevel || 'info';
        this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
        this.maxFiles = options.maxFiles || 5;
        this.enableConsole = options.enableConsole !== false;
        
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
        
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    formatMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const metaString = Object.keys(meta).length > 0 ? ` | ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaString}`;
    }

    getLogFileName(type = 'app') {
        const date = new Date().toISOString().split('T')[0];
        return path.join(this.logDir, `${type}-${date}.log`);
    }

    rotateLogFile(filePath) {
        try {
            const stats = fs.statSync(filePath);
            if (stats.size >= this.maxFileSize) {
                const timestamp = new Date().getTime();
                const rotatedPath = filePath.replace('.log', `-${timestamp}.log`);
                fs.renameSync(filePath, rotatedPath);
                this.cleanOldLogs();
            }
        } catch (error) {
            // File doesn't exist yet, which is fine
        }
    }

    cleanOldLogs() {
        try {
            const files = fs.readdirSync(this.logDir)
                .filter(file => file.endsWith('.log'))
                .map(file => ({
                    name: file,
                    path: path.join(this.logDir, file),
                    time: fs.statSync(path.join(this.logDir, file)).mtime.getTime()
                }))
                .sort((a, b) => b.time - a.time);

            if (files.length > this.maxFiles) {
                files.slice(this.maxFiles).forEach(file => {
                    fs.unlinkSync(file.path);
                });
            }
        } catch (error) {
            console.error('Error cleaning old logs:', error);
        }
    }

    writeToFile(message, type = 'app') {
        try {
            const logFile = this.getLogFileName(type);
            this.rotateLogFile(logFile);
            fs.appendFileSync(logFile, message + '\n');
        } catch (error) {
            console.error('Error writing to log file:', error);
        }
    }

    log(level, message, meta = {}) {
        if (this.levels[level] > this.levels[this.logLevel]) {
            return;
        }

        const formattedMessage = this.formatMessage(level, message, meta);
        
        // Write to file
        this.writeToFile(formattedMessage);
        
        // Also write to console if enabled
        if (this.enableConsole) {
            switch (level) {
                case 'error':
                    console.error(`🔴 ${formattedMessage}`);
                    break;
                case 'warn':
                    console.warn(`🟡 ${formattedMessage}`);
                    break;
                case 'info':
                    console.log(`🔵 ${formattedMessage}`);
                    break;
                case 'debug':
                    console.debug(`⚪ ${formattedMessage}`);
                    break;
                default:
                    console.log(formattedMessage);
            }
        }
    }

    error(message, meta = {}) {
        this.log('error', message, meta);
        
        // Also log to error-specific file
        this.writeToFile(this.formatMessage('error', message, meta), 'error');
    }

    warn(message, meta = {}) {
        this.log('warn', message, meta);
    }

    info(message, meta = {}) {
        this.log('info', message, meta);
    }

    debug(message, meta = {}) {
        this.log('debug', message, meta);
    }

    // Specialized logging methods
    logRequest(req, res, responseTime) {
        const logData = {
            method: req.method,
            url: req.url,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            statusCode: res.statusCode,
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString()
        };

        this.writeToFile(this.formatMessage('info', 'HTTP Request', logData), 'access');
        
        if (this.enableConsole) {
            const emoji = res.statusCode >= 400 ? '🔴' : '🟢';
            console.log(`${emoji} ${req.method} ${req.url} - ${res.statusCode} - ${responseTime}ms`);
        }
    }

    logAuth(action, user, success, meta = {}) {
        const logData = {
            action,
            user: user?.username || user?.email || 'unknown',
            success,
            timestamp: new Date().toISOString(),
            ...meta
        };

        this.writeToFile(this.formatMessage('info', `Auth: ${action}`, logData), 'auth');
        
        if (this.enableConsole) {
            const emoji = success ? '✅' : '❌';
            console.log(`${emoji} Auth: ${action} - User: ${logData.user} - Success: ${success}`);
        }
    }

    logDatabase(operation, table, success, meta = {}) {
        const logData = {
            operation,
            table,
            success,
            timestamp: new Date().toISOString(),
            ...meta
        };

        this.writeToFile(this.formatMessage('info', `DB: ${operation}`, logData), 'database');
        
        if (this.enableConsole && !success) {
            console.error(`🔴 DB Error: ${operation} on ${table}`, meta);
        }
    }

    logSecurity(event, severity, meta = {}) {
        const logData = {
            event,
            severity,
            timestamp: new Date().toISOString(),
            ...meta
        };

        this.writeToFile(this.formatMessage('warn', `Security: ${event}`, logData), 'security');
        
        if (this.enableConsole) {
            console.warn(`⚠️ Security Event: ${event} - Severity: ${severity}`);
        }
    }

    logPerformance(operation, duration, meta = {}) {
        const logData = {
            operation,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
            ...meta
        };

        this.writeToFile(this.formatMessage('info', `Performance: ${operation}`, logData), 'performance');
        
        if (this.enableConsole && duration > 1000) {
            console.warn(`⏱️ Slow Operation: ${operation} took ${duration}ms`);
        }
    }
}

// Create default logger instance
const logger = new Logger({
    logLevel: process.env.LOG_LEVEL || 'info',
    enableConsole: process.env.NODE_ENV !== 'production'
});

module.exports = logger;