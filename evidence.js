import fetch from 'node-fetch';
import fs from 'fs';

const config = {
    logFilePath: './logs',
    logFile: '',
    interval: 10000,
    timeout: 5000,
};

const statusInfo = {
    ONLINE: 1,
    OFFLINE: 0,
};

const status = {
    lastState: statusInfo.ONLINE,
    lastDowntimeStart: 0,
};

function appendNewLineSync(line) {
    try {
        fs.appendFileSync(config.logFile, line, 'utf-8');
    } catch (error) {
        console.error('Could not append begin of downtime to file: ', error);
    }
}

function appendToLastLineSync(appendant) {
    try {
        const csvfile = fs.readFileSync(config.logFile, 'utf-8');
        const lines = csvfile.trim().split('\n');
        if (lines.length > 0) {
            const lastline = lines[lines.length - 1];
            const newline = `${lastline},${appendant}\n`;
            lines[lines.length - 1] = newline;
        }
        fs.writeFileSync(config.logFile, lines.join('\n'), 'utf-8');
    } catch (error) {
        console.error('Could not append end of downtime to file: ', error);
    }
}

function log(result, timestamp) {
    if (result !== status.lastState) {
        if (result === statusInfo.OFFLINE) {
            status.lastDowntimeStart = timestamp;
            const newline = `${timestamp.toISOString()}`;
            appendNewLineSync(newline);
        }
        if (result === statusInfo.ONLINE) {
            const downtime = (timestamp - status.lastDowntimeStart) / 1000;
            const append = `${timestamp.toISOString()}, ${downtime.toString()}`;
            appendToLastLineSync(append);
        }
    }
}

async function update() {
    const success = await pingGoogle();
    const now = new Date();
    if (success) {
        log(statusInfo.ONLINE, now);
    } else {
        log(statusInfo.OFFLINE, now);
    }
    status.lastState = success ? statusInfo.ONLINE : statusInfo.OFFLINE;
}

async function pingGoogle() {
    try {
        const response = await fetch('https://www.google.com', {
            signal: AbortSignal.timeout(config.timeout),
        });
        return response.ok;
    } catch (error) {
        return false;
    }
}
const startTime = new Date();
config.logFile = `${config.logFilePath}/log_${startTime.toISOString()}.csv`;
fs.closeSync(fs.openSync(config.logFile, 'w'));
appendNewLineSync('Start,End,Downtime (seconds)\n');
console.log(`Start collectiong evidence at ${startTime.toISOString()}`);
setInterval(update, config.interval);
