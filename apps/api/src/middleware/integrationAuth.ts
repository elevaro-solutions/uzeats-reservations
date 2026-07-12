import type { Request, Response, NextFunction } from 'express';
import { Integration } from '../models/Integration.js';
import { Restaurant } from '../models/Restaurant.js';
import { logger } from '../lib/logger.js';

export interface IntegrationAuthRequest extends Request {
  integration?: any;
  restaurant?: any;
}

/** Authenticate partner booking requests via integration API key. */
export async function integrationAuth(
  req: IntegrationAuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing API key' });
      return;
    }

    const integration = await Integration.findOne({ apiKey: header.slice(7) });
    if (!integration) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }
    if (!integration.enabled) {
      res.status(403).json({ error: 'Integration is disabled' });
      return;
    }

    const restaurant = await Restaurant.findById(integration.restaurantId);
    if (!restaurant || restaurant.status !== 'approved') {
      res.status(403).json({ error: 'Restaurant unavailable' });
      return;
    }

    req.integration = integration;
    req.restaurant = restaurant;
    next();
  } catch (err) {
    logger.error({ err }, '[integrationAuth] error');
    res.status(500).json({ error: 'Internal server error' });
  }
}
