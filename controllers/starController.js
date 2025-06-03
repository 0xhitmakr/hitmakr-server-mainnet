import Star from '../models/Star.js';
import { body, param, query, validationResult } from 'express-validator';

const handleValidationErrors = (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
        return true;
    }
    return false;
};

// Get star balance for a user
export const getBalance = async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
        const walletAddress = req.params.walletAddress;
        // Optional: Could check if req.user.walletAddress matches params.walletAddress or if admin
        const balance = await Star.getBalance(walletAddress);
        res.status(200).json({ success: true, data: { walletAddress, balance } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching star balance', details: error.message });
    }
};

// Transfer stars between users
export const transferStars = async (req, res) => {
    // TODO: This is a critical transaction. Requires robust auth and potentially 2FA or user confirmation.
    // Auth middleware should confirm sender's identity.
    if (handleValidationErrors(req, res)) return;
    try {
        const senderAddress = req.user?.walletAddress;
        if (!senderAddress || senderAddress !== req.body.fromAddress) {
            return res.status(401).json({ success: false, message: 'Unauthorized: Sender address does not match authenticated user.' });
        }
        const { fromAddress, toAddress, amount, transferType, referenceId } = req.body;
        const result = await Star.transfer({ fromAddress, toAddress, amount, transferType, referenceId, initiatedBy: senderAddress });
        res.status(200).json({ success: true, message: 'Star transfer processed successfully', data: result });
    } catch (error) {
        if (error.message.includes("Insufficient balance") || error.message.includes("Invalid addresses")) {
            return res.status(400).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'Error transferring stars', details: error.message });
    }
};

// Award stars to a user (admin/system action)
export const awardStars = async (req, res) => {
    // TODO: Add admin authentication middleware
    if (handleValidationErrors(req, res)) return;
    try {
        const awardedBy = req.user?.walletAddress; // Admin's address
        if (!awardedBy) { // Basic check, real admin role check needed
            return res.status(401).json({ success: false, message: 'Admin authentication required.' });
        }
        const { toAddress, amount, reason, referenceId } = req.body;
        const result = await Star.award({ toAddress, amount, reason, referenceId, awardedBy });
        res.status(200).json({ success: true, message: 'Stars awarded successfully', data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error awarding stars', details: error.message });
    }
};

// Get transaction history for a user
export const getTransactionHistory = async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
        const walletAddress = req.params.walletAddress;
        // Optional: Check if req.user.walletAddress matches or is admin
        const { page, limit, type } = req.query;
        const history = await Star.getTransactionHistory(walletAddress, {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20,
            type
        });
        res.status(200).json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching transaction history', details: error.message });
    }
};

// Get achievements for a user
export const getUserAchievements = async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
        const walletAddress = req.params.walletAddress;
        const achievements = await Star.getAchievements(walletAddress);
        res.status(200).json({ success: true, data: achievements });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching user achievements', details: error.message });
    }
};

// Get tipping leaderboard
export const getTippingLeaderboard = async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
        const { limit, timeframe } = req.query;
        const leaderboard = await Star.getLeaderboard({
            type: 'tippers',
            limit: parseInt(limit) || 10,
            timeframe
        });
        res.status(200).json({ success: true, data: leaderboard });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching tipping leaderboard', details: error.message });
    }
};

// Get top earners leaderboard
export const getTopEarnersLeaderboard = async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
        const { limit, timeframe } = req.query;
        const leaderboard = await Star.getLeaderboard({
            type: 'earners',
            limit: parseInt(limit) || 10,
            timeframe
        });
        res.status(200).json({ success: true, data: leaderboard });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching top earners leaderboard', details: error.message });
    }
};

// Create or update a subscription reward configuration
export const createOrUpdateSubscriptionReward = async (req, res) => {
    // TODO: Add admin authentication middleware
    if (handleValidationErrors(req, res)) return;
    try {
        const updatedBy = req.user?.walletAddress; // Admin's address
         if (!updatedBy) {
            return res.status(401).json({ success: false, message: 'Admin authentication required.' });
        }
        const rewardData = req.body;
        const result = await Star.setSubscriptionReward(rewardData, updatedBy);
        res.status(200).json({ success: true, message: 'Subscription reward configuration updated', data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating subscription reward', details: error.message });
    }
};

// Get system-wide star configuration
export const getSystemStarConfig = async (req, res) => {
    // TODO: Add admin authentication middleware
    try {
        const config = await Star.getSystemConfig();
        res.status(200).json({ success: true, data: config });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching system star configuration', details: error.message });
    }
};

// Update system-wide star configuration
export const updateSystemStarConfig = async (req, res) => {
    // TODO: Add admin authentication middleware
    if (handleValidationErrors(req, res)) return;
    try {
        const updatedBy = req.user?.walletAddress; // Admin's address
        if (!updatedBy) {
            return res.status(401).json({ success: false, message: 'Admin authentication required.' });
        }
        const configData = req.body;
        const result = await Star.updateSystemConfig(configData, updatedBy);
        res.status(200).json({ success: true, message: 'System star configuration updated', data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating system star configuration', details: error.message });
    }
};
