import Snip from '../models/Snip.js';
import { body, param, query, validationResult } from 'express-validator';

const handleValidationErrors = (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
        return true;
    }
    return false;
};

// Create a new snip
export const createSnip = async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
        const creatorAddress = req.user?.walletAddress; // Requires auth middleware
        if (!creatorAddress) {
            return res.status(401).json({ success: false, message: 'User authentication required to create a snip.' });
        }
        const snipData = { ...req.body, creatorAddress };
        const snip = await Snip.createSnip(snipData);
        res.status(201).json({ success: true, message: 'Snip created successfully', data: snip });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error creating snip', details: error.message });
    }
};

// Get a snip by its ID
export const getSnip = async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
        const snip = await Snip.findBySnipId(req.params.snipId);
        if (!snip) {
            return res.status(404).json({ success: false, message: 'Snip not found' });
        }
        res.status(200).json({ success: true, data: snip });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching snip', details: error.message });
    }
};

// Publish a snip
export const publishSnip = async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
        const creatorAddress = req.user?.walletAddress; // Requires auth middleware
        if (!creatorAddress) {
            return res.status(401).json({ success: false, message: 'User authentication required.' });
        }
        const snip = await Snip.publishSnip(req.params.snipId, creatorAddress);
        if (!snip) {
            return res.status(404).json({ success: false, message: 'Snip not found or user not authorized to publish' });
        }
        res.status(200).json({ success: true, message: 'Snip published successfully', data: snip });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error publishing snip', details: error.message });
    }
};

// Record a view for a snip
export const recordSnipView = async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
        const viewerId = req.user?.walletAddress || req.ip; // Use walletAddress if logged in, else IP
        await Snip.recordView(req.params.snipId, viewerId);
        res.status(200).json({ success: true, message: 'Snip view recorded' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error recording snip view', details: error.message });
    }
};

// Record engagement for a snip
export const recordSnipEngagement = async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
        const interactorId = req.user?.walletAddress; // Requires auth for meaningful engagement
        if (!interactorId) {
            return res.status(401).json({ success: false, message: 'User authentication required for engagement.' });
        }
        const { engagementType, metadata } = req.body;
        await Snip.recordEngagement(req.params.snipId, interactorId, engagementType, metadata);
        res.status(200).json({ success: true, message: 'Snip engagement recorded' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error recording snip engagement', details: error.message });
    }
};

// Record a tip for a snip
export const recordSnipTip = async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
        const tipperAddress = req.user?.walletAddress; // Requires auth
        if (!tipperAddress) {
            return res.status(401).json({ success: false, message: 'User authentication required to tip.' });
        }
        const { amount, transactionSignature } = req.body; // Assuming 'amount' is in Stars or a token
        await Snip.recordTip(req.params.snipId, tipperAddress, amount, transactionSignature);
        res.status(200).json({ success: true, message: 'Snip tip recorded' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error recording snip tip', details: error.message });
    }
};

// Get trending snips
export const getTrendingSnips = async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
        const { limit, timeframe, algorithm } = req.query;
        const snips = await Snip.getTrending({
            limit: parseInt(limit) || 10,
            timeframe,
            algorithm
        });
        res.status(200).json({ success: true, data: snips });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching trending snips', details: error.message });
    }
};

// Get "For You" feed for the authenticated user
export const getForYouFeed = async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
        const userAddress = req.user?.walletAddress; // Requires auth
        if (!userAddress) {
            return res.status(401).json({ success: false, message: 'User authentication required for "For You" feed.' });
        }
        const { page, limit } = req.query;
        const feed = await Snip.getForYouFeed(userAddress, { page: parseInt(page) || 1, limit: parseInt(limit) || 20 });
        res.status(200).json({ success: true, data: feed });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching For You feed', details: error.message });
    }
};

// Get currently live streams (snips)
export const getLiveStreams = async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
        const { limit, genre } = req.query;
        const liveStreams = await Snip.getLive({ limit: parseInt(limit) || 10, genre });
        res.status(200).json({ success: true, data: liveStreams });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching live streams', details: error.message });
    }
};

// Start a livestream for a snip
export const startLivestream = async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
        const creatorAddress = req.user?.walletAddress; // Requires auth
        if (!creatorAddress) {
            return res.status(401).json({ success: false, message: 'User authentication required.' });
        }
        const { streamUrl, streamKey } = req.body; // Example parameters
        const snip = await Snip.startLivestream(req.params.snipId, creatorAddress, streamUrl, streamKey);
        if (!snip) {
            return res.status(404).json({ success: false, message: 'Snip not found or user not authorized.' });
        }
        res.status(200).json({ success: true, message: 'Livestream started', data: snip });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error starting livestream', details: error.message });
    }
};

// End a livestream for a snip
export const endLivestream = async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
        const creatorAddress = req.user?.walletAddress; // Requires auth
        if (!creatorAddress) {
            return res.status(401).json({ success: false, message: 'User authentication required.' });
        }
        const snip = await Snip.endLivestream(req.params.snipId, creatorAddress);
         if (!snip) {
            return res.status(404).json({ success: false, message: 'Snip not found or user not authorized.' });
        }
        res.status(200).json({ success: true, message: 'Livestream ended', data: snip });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error ending livestream', details: error.message });
    }
};

// Moderate a snip
export const moderateSnip = async (req, res) => {
    // TODO: Add admin authentication middleware
    if (handleValidationErrors(req, res)) return;
    try {
        const moderatorAddress = req.user?.walletAddress; // Requires admin auth
        if (!moderatorAddress) {
            return res.status(401).json({ success: false, message: 'Admin authentication required.' });
        }
        const { reason, status } = req.body;
        const snip = await Snip.moderate(req.params.snipId, moderatorAddress, reason, status);
        if (!snip) {
            return res.status(404).json({ success: false, message: 'Snip not found for moderation.' });
        }
        res.status(200).json({ success: true, message: 'Snip moderated successfully', data: snip });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error moderating snip', details: error.message });
    }
};

// Get snips by DSRC ID
export const getSnipsByDSRC = async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
        const { dsrcId } = req.params;
        const { page, limit } = req.query;
        const snips = await Snip.findAllByDSRC(dsrcId, { page: parseInt(page) || 1, limit: parseInt(limit) || 10 });
        res.status(200).json({ success: true, data: snips });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching snips by DSRC', details: error.message });
    }
};

// Get snip statistics for a creator
export const getCreatorSnipStats = async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
        const creatorAddress = req.params.creatorAddress;
        // Optional: check if req.user.walletAddress matches creatorAddress or if user is admin
        const stats = await Snip.getCreatorStats(creatorAddress);
        res.status(200).json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching creator snip stats', details: error.message });
    }
};
