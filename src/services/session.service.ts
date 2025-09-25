import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

@Injectable()
export class SessionService {
  
  /**
   * Gera um ID de sessão único
   * Formato: sess_YYYYMMDD_HHMMSS_RANDOM
   */
  generateSessionId(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const randomStr = randomBytes(4).toString('hex').toUpperCase();
    
    return `sess_${dateStr}_${timeStr}_${randomStr}`;
  }

  /**
   * Valida se um sessionId tem o formato correto
   */
  isValidSessionId(sessionId: string): boolean {
    const pattern = /^sess_\d{8}_\d{6}_[A-F0-9]{8}$/;
    return pattern.test(sessionId);
  }

  /**
   * Extrai a data de criação de um sessionId
   */
  extractCreationDate(sessionId: string): Date | null {
    try {
      if (!this.isValidSessionId(sessionId)) {
        return null;
      }

      const parts = sessionId.split('_');
      const dateStr = parts[1]; // YYYYMMDD
      const timeStr = parts[2]; // HHMMSS

      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6)) - 1; // Month is 0-indexed
      const day = parseInt(dateStr.substring(6, 8));
      const hour = parseInt(timeStr.substring(0, 2));
      const minute = parseInt(timeStr.substring(2, 4));
      const second = parseInt(timeStr.substring(4, 6));

      return new Date(year, month, day, hour, minute, second);
    } catch (error) {
      return null;
    }
  }

  /**
   * Gera um ID de sessão personalizado com prefixo
   */
  generateCustomSessionId(prefix: string = 'job'): string {
    const timestamp = Date.now().toString(36);
    const random = randomBytes(3).toString('hex');
    return `${prefix}_${timestamp}_${random}`;
  }
}
