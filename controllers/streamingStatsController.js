import StreamingStats from '../models/StreamingStats.js';
import { body, param, query, validationResult } from 'express-validator';

const handleValidationErrors = (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
        return true;
    }
    return false;
};

// Record a play event
export const recordPlay = async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
        const playData = { ...req.body };
        // Assuming user context might be added if available and relevant
        playData.viewerId = req.user?.walletAddress || req.ip; // Example: use walletAddress or IP

        const stat = await StreamingStats.recordPlay(playData);
        res.status(201).json({ success: true, message: 'Play recorded successfully', data: stat });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error recording play', details: error.message });
    }
};

// Get streaming statistics for a specific DSRC
export const getStatsForDSRC = async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
        const { dsrcId } = req.params;
        const { timeframe, interval, country } = req.query;
        const stats = await StreamingStats.getDSRCStats({
            dsrcId,
            timeframe,
            interval,
            country
        });
        if (!stats) {
            return res.status(404).json({ success: false, message: 'No stats found for this DSRC or criteria' });
        }
        res.status(200).json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching stats for DSRC', details: error.message });
    }
};

// Get top trending DSRCs based on streaming data
export const getTopTrendingDSRCsStreaming = async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
        const { limit, timeframe, genre, region } = req.query;
        const trending = await StreamingStats.getTrendingDSRCs({
            limit: parseInt(limit) || 10,
            timeframe,
            genre,
            region
        });
        res.status(200).json({ success: true, data: trending });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching top trending DSRCs (streaming)', details: error.message });
    }
};

// Get trending DSRCs by a specific theme (e.g., mood, activity) based on streaming
export const getTrendingByThemeStreaming = async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
        const { theme } = req.params;
        const { limit, timeframe, region } = req.query;
        const themedTrending = await StreamingStats.getTrendingByTheme({
            theme,
            limit: parseInt(limit) || 10,
            timeframe,
            region
        });
        res.status(200).json({ success: true, data: themedTrending });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching trending by theme (streaming)', details: error.message });
    }
};

// Get geographic insights for a DSRC's streams
export const getGeographicInsightsStreaming = async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
        const { dsrcId } = req.params;
        const { timeframe } = req.query;
        const geoInsights = await StreamingStats.getGeographicInsights({
            dsrcId,
            timeframe
        });
        if (!geoInsights) {
            return res.status(404).json({ success: false, message: 'No geographic insights found for this DSRC' });
        }
        res.status(200).json({ success: true, data: geoInsights });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching geographic insights (streaming)', details: error.message });
    }
};

// Get play patterns (e.g., time of day, day of week) for a DSRC
export const getPlayPatternsStreaming = async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
        const { dsrcId } = req.params;
        const { timeframe } = req.query;
        const playPatterns = await StreamingStats.getPlayPatterns({
            dsrcId,
            timeframe
        });
        if (!playPatterns) {
            return res.status(404).json({ success: false, message: 'No play patterns found for this DSRC' });
        }
        res.status(200).json({ success: true, data: playPatterns });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching play patterns (streaming)', details: error.message });
    }
};
