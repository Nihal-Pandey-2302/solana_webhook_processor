import { Request, Response, NextFunction } from 'express';
import { getApiKeyByHash } from '../../db/queries/apiKeyQueries';
import crypto from 'crypto';

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.header('x-api-key');

  if (!apiKey) {
    return res.status(401).json({ error: 'Missing API Key' });
  }

  // Hash the incoming key to compare with the DB
  const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
  
  try {
    const validKey = await getApiKeyByHash(hash);
    if (!validKey) {
      return res.status(401).json({ error: 'Invalid API Key' });
    }
    // E.g., setup req.user if we had multiple users, but we just want auth.
    return next();
  } catch (err) {
    return res.status(500).json({ error: 'Internal Server Error during authentication' });
  }
};
