import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as bodyParser from 'body-parser';

@Injectable()
export class BodyParserMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Configurar parser JSON com limite aumentado
    bodyParser.json({ 
      limit: '50mb',
      verify: (req: any, res, buf) => {
        req.rawBody = buf;
      }
    })(req, res, (err) => {
      if (err) {
        console.error('Erro no body parser:', err.message);
        return res.status(413).json({
          statusCode: 413,
          message: 'Payload muito grande. Limite máximo: 50MB',
          error: 'Payload Too Large'
        });
      }
      next();
    });
  }
}

@Injectable() 
export class RawBodyMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Configurar parser para dados brutos
    bodyParser.raw({ 
      limit: '50mb',
      type: ['application/json', 'text/plain']
    })(req, res, next);
  }
}

@Injectable()
export class UrlEncodedMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Configurar parser para form data
    bodyParser.urlencoded({ 
      limit: '50mb',
      extended: true,
      parameterLimit: 50000
    })(req, res, next);
  }
}
