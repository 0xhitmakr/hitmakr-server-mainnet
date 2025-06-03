import Hashtag from '../models/Hashtag.js';
import { body, param, query, validationResult } from 'express-validator';

const handleValidationErrors = (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
        return true;
    }
    return false;
};

export const createHashtag = async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
        // Assuming req.user.walletAddress is available from auth middleware
        const createdBy = req.user?.walletAddress || req.body.createdBy; // Fallback for now
        if (!createdBy) {
            return res.status(400).json({ success: false, message: 'createdBy field or authenticated user is required.' });
        }
        const hashtag = await Hashtag.createOrUpdate({ ...req.body, createdBy });
        res.status(201).json({ success: true, message: 'Hashtag created/updated successfully', data: hashtag });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error creating hashtag', details: error.message });
    }
};

export const getHashtag = async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
        const hashtag = await Hashtag.findByNormalizedTag(req.params.normalizedTag);
        if (!hashtag) {
            return res.status(404).json({ success: false, message: 'Hashtag not found' });
        }
        res.status(200).json({ success: true, data: hashtag });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching hashtag', details: error.message });
    }
};

export const updateHashtag = async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
        // TODO: Add admin authentication middleware or check if user is original creator
        const updatedData = { ...req.body };
        // Ensure normalizedTag is not changed directly, or handle re-normalization
        delete updatedData.normalizedTag;
        delete updatedData.tagName; // tagName change should go through createOrUpdate or a specific method

        const hashtag = await Hashtag.findOneAndUpdate(
            { normalizedTag: req.params.normalizedTag },
            { $set: updatedData },
            { new: true }
        );
        if (!hashtag) {
            return res.status(404).json({ success: false, message: 'Hashtag not found for update' });
        }
        res.status(200).json({ success: true, message: 'Hashtag updated successfully', data: hashtag });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating hashtag', details: error.message });
    }
};

export const getTrendingHashtags = async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
        const limit = parseInt(req.query.limit) || 10;
        const hashtags = await Hashtag.getTrending(limit);
        res.status(200).json({ success: true, data: hashtags });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching trending hashtags', details: error.message });
    }
};

export const searchHashtags = async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
        const query = req.query.q;
        const limit = parseInt(req.query.limit) || 10;
        const hashtags = await Hashtag.search(query, limit);
        res.status(200).json({ success: true, data: hashtags });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error searching hashtags', details: error.message });
    }
};

export const getRelatedHashtags = async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
        const limit = parseInt(req.query.limit) || 5;
        const hashtags = await Hashtag.getRelated(req.params.normalizedTag, limit);
        res.status(200).json({ success: true, data: hashtags });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching related hashtags', details: error.message });
    }
};

export const recordHashtagUsage = async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
        const { tagName, dsrcId } = req.body;
        // Assuming req.user.walletAddress for usedBy if available
        const usedBy = req.user?.walletAddress;
        await Hashtag.recordUsage(tagName, dsrcId, usedBy);
        res.status(200).json({ success: true, message: 'Hashtag usage recorded' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error recording hashtag usage', details: error.message });
    }
};

export const moderateHashtag = async (req, res) => {
    // TODO: Add admin authentication middleware
    if (handleValidationErrors(req, res)) return;
    try {
        const { moderationStatus, reason } = req.body;
        const moderatedBy = req.user?.walletAddress; // Assuming admin user context
        if (!moderatedBy) {
             return res.status(401).json({ success: false, message: 'Admin authentication required.' });
        }
        const hashtag = await Hashtag.moderate(req.params.normalizedTag, moderationStatus, reason, moderatedBy);
        if (!hashtag) {
            return res.status(404).json({ success: false, message: 'Hashtag not found for moderation' });
        }
        res.status(200).json({ success: true, message: 'Hashtag moderated successfully', data: hashtag });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error moderating hashtag', details: error.message });
    }
};

export const getHashtagStats = async (req, res) => {
    // TODO: Add admin authentication middleware if stats are sensitive
    try {
        const stats = await Hashtag.getOverallStats(); // Assuming a static method for this
        res.status(200).json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching hashtag stats', details: error.message });
    }
};
