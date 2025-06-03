import express from 'express';
import { body, param, query } from 'express-validator';
import * as starController from '../controllers/starController.js';
// TODO: import authMiddleware and adminAuthMiddleware

const router = express.Router();

// GET /stars/balance/:walletAddress - Get star balance for a user
router.get(
    '/balance/:walletAddress',
    // TODO: Add authMiddleware (user can get own balance, or admin can get any)
    [
        param('walletAddress').trim().notEmpty().isEthereumAddress().withMessage('Valid wallet address is required.')
    ],
    starController.getBalance
);

// POST /stars/transfer - Transfer stars between users
router.post(
    '/transfer',
    // TODO: Add authMiddleware (sender must be authenticated)
    [
        body('fromAddress').trim().notEmpty().isEthereumAddress().withMessage('Valid sender wallet address is required.'),
        body('toAddress').trim().notEmpty().isEthereumAddress().withMessage('Valid recipient wallet address is required.'),
        body('amount').isDecimal({ decimal_digits: '0,2' }).notEmpty().custom(value => parseFloat(value) > 0).withMessage('Amount must be a positive number with up to 2 decimal places.'), // Assuming stars can have decimals
        body('transferType').isIn(['tip', 'purchase', 'reward_payout', 'system_adjustment', 'other']).withMessage('Invalid transfer type.'),
        body('referenceId').optional().trim().escape() // e.g., snipId for a tip, orderId for a purchase
    ],
    starController.transferStars
);

// POST /stars/award - Award stars to a user (admin/system action)
router.post(
    '/award',
    // TODO: Add adminAuthMiddleware
    [
        body('toAddress').trim().notEmpty().isEthereumAddress().withMessage('Valid recipient wallet address is required.'),
        body('amount').isDecimal({ decimal_digits: '0,2' }).notEmpty().custom(value => parseFloat(value) > 0).withMessage('Amount must be a positive number.'),
        body('reason').trim().notEmpty().withMessage('Reason for the award is required.'),
        body('referenceId').optional().trim().escape()
    ],
    starController.awardStars
);

// GET /stars/history/:walletAddress - Get transaction history for a user
router.get(
    '/history/:walletAddress',
    // TODO: Add authMiddleware (user can get own history, or admin can get any)
    [
        param('walletAddress').trim().notEmpty().isEthereumAddress().withMessage('Valid wallet address is required.'),
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100.'),
        query('type').optional().isIn(['credit', 'debit', 'all']).withMessage('Invalid transaction type filter.')
    ],
    starController.getTransactionHistory
);

// GET /stars/achievements/:walletAddress - Get achievements for a user
router.get(
    '/achievements/:walletAddress',
    // TODO: Add authMiddleware (user can get own achievements, or admin can get any)
    [
        param('walletAddress').trim().notEmpty().isEthereumAddress().withMessage('Valid wallet address is required.')
    ],
    starController.getUserAchievements
);

// GET /stars/leaderboard/tipping - Get tipping leaderboard
router.get(
    '/leaderboard/tipping',
    [
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be valid.'),
        query('timeframe').optional().isIn(['24h', '7d', '30d', 'all_time']).withMessage('Invalid timeframe.')
    ],
    starController.getTippingLeaderboard
);

// GET /stars/leaderboard/earners - Get top earners leaderboard
router.get(
    '/leaderboard/earners',
    [
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be valid.'),
        query('timeframe').optional().isIn(['7d', '30d', '90d', 'all_time']).withMessage('Invalid timeframe.')
    ],
    starController.getTopEarnersLeaderboard
);

// POST /stars/subscriptions - Create or update a subscription reward configuration
router.post(
    '/subscriptions',
    // TODO: Add adminAuthMiddleware
    [
        body('tierName').trim().notEmpty().withMessage('Tier name is required.'),
        body('monthlyStars').isInt({ min: 0 }).withMessage('Monthly stars must be a non-negative integer.'),
        body('benefits').optional().isArray().withMessage('Benefits must be an array.'),
        body('benefits.*').optional().trim().escape(),
        body('isActive').optional().isBoolean().withMessage('isActive must be a boolean.')
    ],
    starController.createOrUpdateSubscriptionReward
);

// GET /stars/config/system - Get system-wide star configuration
router.get(
    '/config/system',
    // TODO: Add adminAuthMiddleware
    starController.getSystemStarConfig
);

// PUT /stars/config/system - Update system-wide star configuration
router.put(
    '/config/system',
    // TODO: Add adminAuthMiddleware
    [
        body('starValueUSD').optional().isDecimal({ decimal_digits: '0,4' }).custom(v => parseFloat(v) > 0).withMessage('Star value must be positive.'),
        body('minTipAmount').optional().isInt({ min: 1 }).withMessage('Min tip amount must be a positive integer.'),
        body('maxTipAmount').optional().isInt({ min: 1 }).custom((val, {req}) => !req.body.minTipAmount || val >= req.body.minTipAmount).withMessage('Max tip must be >= min tip.'),
        body('dailyAwardLimitPerUser').optional().isInt({ min: 0 }).withMessage('Daily award limit must be non-negative.'),
        // Add more config fields as needed
    ],
    starController.updateSystemStarConfig
);

export default router;
