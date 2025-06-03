import express from 'express';
import { body, param, query } from 'express-validator';
import * as streamingStatsController from '../controllers/streamingStatsController.js';
// TODO: import authMiddleware (maybe for some routes if they become user-specific)

const router = express.Router();

// POST /streaming-stats/record-play - Record a play event
router.post(
    '/record-play',
    [
        body('dsrcId').trim().notEmpty().withMessage('dsrcId is required.'),
        body('listenDurationSeconds').isInt({ min: 0 }).notEmpty().withMessage('listenDurationSeconds is required and must be a non-negative integer.'),
        body('platform').optional().trim().escape(), // e.g., 'web', 'mobile_android', 'mobile_ios', 'desktop_app'
        body('countryCode').optional().isISO31661Alpha2().withMessage('Invalid country code.'),
        body('userAgent').optional().trim().escape(),
        body('trackPositionSeconds').optional().isInt({ min: 0 }).withMessage('trackPositionSeconds must be a non-negative integer.'),
        // viewerId will be extracted from req.user or req.ip in controller
    ],
    streamingStatsController.recordPlay
);

// GET /streaming-stats/trending/overall - Get top trending DSRCs based on streaming
router.get(
    '/trending/overall',
    [
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be valid.'),
        query('timeframe').optional().isIn(['6h', '12h', '24h', '7d', '30d']).withMessage('Invalid timeframe.'),
        query('genre').optional().trim().escape(),
        query('region').optional().trim().escape() // e.g., country code, continent
    ],
    streamingStatsController.getTopTrendingDSRCsStreaming
);

// GET /streaming-stats/trending/theme/:theme - Get trending DSRCs by a specific theme
router.get(
    '/trending/theme/:theme',
    [
        param('theme').trim().notEmpty().escape().withMessage('Theme parameter is required.'),
        query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be valid.'),
        query('timeframe').optional().isIn(['24h', '7d', '30d']).withMessage('Invalid timeframe.'),
        query('region').optional().trim().escape()
    ],
    streamingStatsController.getTrendingByThemeStreaming
);

// GET /streaming-stats/:dsrcId - Get streaming statistics for a specific DSRC
router.get(
    '/:dsrcId',
    [
        param('dsrcId').trim().notEmpty().withMessage('dsrcId parameter is required.'),
        query('timeframe').optional().isIn(['24h', '7d', '30d', '90d', 'all_time']).withMessage('Invalid timeframe.'),
        query('interval').optional().isIn(['hourly', 'daily', 'weekly', 'monthly']).withMessage('Invalid interval.'),
        query('country').optional().isISO31661Alpha2().withMessage('Invalid country code for filter.')
    ],
    streamingStatsController.getStatsForDSRC
);

// GET /streaming-stats/:dsrcId/geo - Get geographic insights for a DSRC's streams
router.get(
    '/:dsrcId/geo',
    [
        param('dsrcId').trim().notEmpty().withMessage('dsrcId parameter is required.'),
        query('timeframe').optional().isIn(['24h', '7d', '30d', '90d', 'all_time']).withMessage('Invalid timeframe.')
    ],
    streamingStatsController.getGeographicInsightsStreaming
);

// GET /streaming-stats/:dsrcId/patterns - Get play patterns for a DSRC
router.get(
    '/:dsrcId/patterns',
    [
        param('dsrcId').trim().notEmpty().withMessage('dsrcId parameter is required.'),
        query('timeframe').optional().isIn(['7d', '30d', '90d']).withMessage('Invalid timeframe for pattern analysis.')
    ],
    streamingStatsController.getPlayPatternsStreaming
);

export default router;
