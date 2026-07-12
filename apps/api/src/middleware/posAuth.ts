import type { Request, Response, NextFunction } from 'express';
import { Restaurant } from '../models/Restaurant.js';
import { logger } from '../lib/logger.js';

export interface PosAuthRequest extends Request {
  restaurant?: any;
}

export async function posAuth(req: PosAuthRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing API key' });
      return;
    }

    const apiKey = header.slice(7);
    if (!apiKey) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    const restaurant = await Restaurant.findOne({ posApiKey: apiKey });
    if (!restaurant) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    if (!restaurant.posEnabled) {
      res.status(403).json({ error: 'POS integration is disabled for this restaurant' });
      return;
    }

    req.restaurant = restaurant;
    next();
  } catch (err) {
    logger.error({ err }, '[posAuth] error');
    res.status(500).json({ error: 'Internal server error' });
  }
}
