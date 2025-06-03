import express from 'express';
import { body, param, query } from 'express-validator';
import * as snipController from '../controllers/snipController.js';
// TODO: import authMiddleware and adminAuthMiddleware

const router = express.Router();

// POST /snips - Create a new snip
router.post(
    '/',
    // TODO: Add authMiddleware (user must be logged in)
    [
        body('dsrcId').trim().notEmpty().withMessage('dsrcId is required.'),
        body('startTime').isFloat({ min: 0 }).withMessage('startTime must be a non-negative number.'),
        body('endTime').isFloat().custom((value, { req }) => {
            if (value <= req.body.startTime) {
                throw new Error('endTime must be greater than startTime.');
            }
            return true;
        }).withMessage('endTime must be greater than startTime and be a number.'),
        body('title').optional().trim().escape(),
        body('description').optional().trim().escape(),
        body('tags').optional().isArray().withMessage('tags must be an array'),
        body('tags.*').optional().trim().escape(),
        body('visibility').optional().isIn(['public', 'unlisted', 'private', 'followers_only']).withMessage('Invalid visibility.'),
        body('snipType').optional().isIn(['short', 'live', 'highlight', 'trailer']).withMessage('Invalid snipType.'),
    ],
    snipController.createSnip
);

// GET /snips/trending - Get trending snips
router.get(
    '/trending',
    [
        query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be valid.'),
        query('timeframe').optional().isIn(['24h', '7d', '30d', 'all']).withMessage('Invalid timeframe.'),
        query('algorithm').optional().isIn(['hot', 'new', 'top_views', 'top_engagement']).withMessage('Invalid algorithm.')
    ],
    snipController.getTrendingSnips
);

// GET /snips/feed/foryou - Get "For You" feed
router.get(
    '/feed/foryou',
    // TODO: Add authMiddleware (user must be logged in)
    [
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
        query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be valid.')
    ],
    snipController.getForYouFeed
);

// GET /snips/live - Get currently live streams
router.get(
    '/live',
    [
        query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be valid.'),
        query('genre').optional().trim().escape()
    ],
    snipController.getLiveStreams
);

// GET /snips/dsrc/:dsrcId - Get snips by DSRC ID
router.get(
    '/dsrc/:dsrcId',
    [
        param('dsrcId').trim().notEmpty().withMessage('DSRC ID parameter is required.'),
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be valid.')
    ],
    snipController.getSnipsByDSRC
);

// GET /snips/creator/:creatorAddress/stats - Get snip statistics for a creator
router.get(
    '/creator/:creatorAddress/stats',
    // TODO: Add authMiddleware (could be public or private depending on policy)
    [
        param('creatorAddress').trim().notEmpty().isEthereumAddress().withMessage('Valid creator Ethereum address is required.')
    ],
    snipController.getCreatorSnipStats
);

// GET /snips/:snipId - Get a specific snip
router.get(
    '/:snipId',
    [
        param('snipId').trim().notEmpty().withMessage('Snip ID parameter is required.') // Usually a UUID or CUID
    ],
    snipController.getSnip
);

// POST /snips/:snipId/publish - Publish a snip
router.post(
    '/:snipId/publish',
    // TODO: Add authMiddleware (user must be creator of snip)
    [
        param('snipId').trim().notEmpty().withMessage('Snip ID parameter is required.')
    ],
    snipController.publishSnip
);

// POST /snips/:snipId/view - Record a view for a snip
router.post(
    '/:snipId/view',
    [
        param('snipId').trim().notEmpty().withMessage('Snip ID parameter is required.')
    ],
    snipController.recordSnipView
);

// POST /snips/:snipId/engage - Record engagement for a snip
router.post(
    '/:snipId/engage',
    // TODO: Add authMiddleware (user must be logged in)
    [
        param('snipId').trim().notEmpty().withMessage('Snip ID parameter is required.'),
        body('engagementType').isIn(['like', 'share', 'comment', 'save', 'remix_view']).withMessage('Invalid engagement type.'),
        body('metadata').optional().isObject()
    ],
    snipController.recordSnipEngagement
);

// POST /snips/:snipId/tip - Record a tip for a snip
router.post(
    '/:snipId/tip',
    // TODO: Add authMiddleware (user must be logged in)
    [
        param('snipId').trim().notEmpty().withMessage('Snip ID parameter is required.'),
        body('amount').isDecimal({ decimal_digits: '0,18' }).notEmpty().withMessage('Amount is required and must be a valid number.'), // Assuming token with up to 18 decimals
        body('transactionSignature').trim().notEmpty().withMessage('Transaction signature is required.')
    ],
    snipController.recordSnipTip
);

// POST /snips/:snipId/start-live - Start a livestream for a snip
router.post(
    '/:snipId/start-live',
    // TODO: Add authMiddleware (user must be creator of snip)
    [
        param('snipId').trim().notEmpty().withMessage('Snip ID parameter is required.'),
        body('streamUrl').optional().isURL().withMessage('Valid stream URL is required if provided.'),
        body('streamKey').optional().trim().notEmpty().withMessage('Stream key is required if provided.')
    ],
    snipController.startLivestream
);

// POST /snips/:snipId/end-live - End a livestream for a snip
router.post(
    '/:snipId/end-live',
    // TODO: Add authMiddleware (user must be creator of snip)
    [
        param('snipId').trim().notEmpty().withMessage('Snip ID parameter is required.')
    ],
    snipController.endLivestream
);

// POST /snips/:snipId/moderate - Moderate a snip
router.post(
    '/:snipId/moderate',
    // TODO: Add adminAuthMiddleware
    [
        param('snipId').trim().notEmpty().withMessage('Snip ID parameter is required.'),
        body('reason').trim().notEmpty().withMessage('Moderation reason is required.'),
        body('status').isIn(['hidden', 'active', 'restricted_audience']).withMessage('Invalid moderation status.')
    ],
    snipController.moderateSnip
);

export default router;
