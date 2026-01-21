import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger.js';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.security('Rate limit exceeded', { 
      ip: req.ip,
      path: req.path 
    });
    res.status(429).json({
      error: 'Too many requests, please try again later.'
    });
  }
});

// Strict rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  skipSuccessfulRequests: true, // Don't count successful requests
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.security('Auth rate limit exceeded', { 
      ip: req.ip,
      path: req.path,
      username: req.body?.username 
    });
    res.status(429).json({
      error: 'Too many login attempts. Please try again in 15 minutes.'
    });
  }
});

// Moderate rate limiter for data modification endpoints
export const modifyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 requests per minute
  message: 'Too many requests, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.security('Modify rate limit exceeded', { 
      ip: req.ip,
      path: req.path 
    });
    res.status(429).json({
      error: 'Too many requests, please slow down.'
    });
  }
});
