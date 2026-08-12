import type { Request, Response, NextFunction } from 'express';
import { Integration } from '../models/Integration.js';
import { Restaurant } from '../models/Restaurant.js';
import { hashOpaqueToken } from '../services/auth.js';
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

    const rawKey = header.slice(7);
    if (!rawKey) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    const keyHash = hashOpaqueToken(rawKey);
    let integration = await Integration.findOne({ apiKeyHash: keyHash });
    if (!integration) {
      // Legacy plaintext keys — migrate on successful use.
      integration = await Integration.findOne({ apiKey: rawKey });
      if (integration) {
        await Integration.updateOne(
          { _id: integration._id },
          {
            $set: {
              apiKeyHash: keyHash,
              apiKeyPrefix: rawKey.slice(0, 12),
            },
            $unset: { apiKey: 1 },
          },
        );
        integration.apiKeyHash = keyHash as any;
        integration.apiKeyPrefix = rawKey.slice(0, 12) as any;
        integration.apiKey = undefined as any;
      }
    }
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
