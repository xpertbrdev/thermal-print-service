import path from "path";
import * as fs from 'node:fs'
import DailyRotateFile from "winston-daily-rotate-file";
import { format } from "winston";

const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const fileRotateTransport = new DailyRotateFile({
  filename: path.join(logDir, 'printer-service-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m', // Rotate file if it exceeds 20MB
  maxFiles: '10d', // Keep logs for 10 days
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    format.printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)
  ),
});

export default fileRotateTransport