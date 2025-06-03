import express from 'express';
import { body, param, query } from 'express-validator';
import * as hashtagController from '../controllers/hashtagController.js';
// TODO: import authMiddleware and adminAuthMiddleware when available

const router = express.Router();

// POST /hashtags - Create a new hashtag
router.post(
    '/',
    // TODO: Add authMiddleware - who can create hashtags?
    [
        body('tagName').trim().notEmpty().withMessage('tagName is required.'),
        body('category').optional().trim().escape(),
        // 'createdBy' will be taken from req.user or passed if system action
    ],
    hashtagController.createHashtag
);

// GET /hashtags/trending - Get trending hashtags
router.get(
    '/trending',
    [
        query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be a number between 1 and 50.')
    ],
    hashtagController.getTrendingHashtags
);

// GET /hashtags/search - Search for hashtags
router.get(
    '/search',
    [
        query('q').trim().notEmpty().withMessage('Search query "q" is required.'),
        query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be a number between 1 and 50.')
    ],
    hashtagController.searchHashtags
);

// GET /hashtags/stats/overall - Get overall hashtag statistics
router.get(
    '/stats/overall',
    // TODO: Add adminAuthMiddleware - Only admins should access this
    hashtagController.getHashtagStats
);

// GET /hashtags/:normalizedTag - Get a specific hashtag by its normalized form
router.get(
    '/:normalizedTag',
    [
        param('normalizedTag').trim().notEmpty().withMessage('Normalized tag parameter is required.')
    ],
    hashtagController.getHashtag
);

// PUT /hashtags/:normalizedTag - Update a hashtag
router.put(
    '/:normalizedTag',
    // TODO: Add adminAuthMiddleware or creator check
    [
        param('normalizedTag').trim().notEmpty().withMessage('Normalized tag parameter is required.'),
        body('category').optional().trim().escape(),
        body('description').optional().trim().escape(),
        body('isMature').optional().isBoolean().withMessage('isMature must be a boolean.'),
        body('isBlocked').optional().isBoolean().withMessage('isBlocked must be a boolean.')
    ],
    hashtagController.updateHashtag
);

// GET /hashtags/:normalizedTag/related - Get related hashtags
router.get(
    '/:normalizedTag/related',
    [
        param('normalizedTag').trim().notEmpty().withMessage('Normalized tag parameter is required.'),
        query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be a number between 1 and 20.')
    ],
    hashtagController.getRelatedHashtags
);

// POST /hashtags/record-usage - Record usage of a hashtag
router.post(
    '/record-usage',
    // TODO: Add authMiddleware - usage should be tied to an action by a user/system
    [
        body('tagName').trim().notEmpty().withMessage('tagName is required.'),
        body('dsrcId').optional().trim().escape().withMessage('dsrcId should be valid if provided.'),
        // usedBy will be taken from req.user if available
    ],
    hashtagController.recordHashtagUsage
);

// POST /hashtags/:normalizedTag/moderate - Moderate a hashtag
router.post(
    '/:normalizedTag/moderate',
    // TODO: Add adminAuthMiddleware
    [
        param('normalizedTag').trim().notEmpty().withMessage('Normalized tag parameter is required.'),
        body('moderationStatus').isIn(['approved', 'rejected', 'pending']).withMessage('Invalid moderation status.'),
        body('reason').optional().trim().escape()
    ],
    hashtagController.moderateHashtag
);

export default router;
