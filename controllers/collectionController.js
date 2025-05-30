import Collection from '../models/Collection.js';
import { body, param, query, validationResult } from 'express-validator';
import mongoose from 'mongoose';

// Create a new collection
export const createCollection = [
  // Validation middleware
  body('title').trim().notEmpty().withMessage('Collection title is required'),
  body('creator').trim().notEmpty().withMessage('Creator address is required'),
  body('collectionType').isIn(['album', 'mixtape', 'pack']).withMessage('Invalid collection type'),
  body('contractAddress').trim().notEmpty().withMessage('Contract address is required'),
  body('chain').trim().notEmpty().withMessage('Chain is required'),
  body('tokenURI').trim().notEmpty().withMessage('Token URI is required'),
  body('collectorEditionPrice').trim().notEmpty().withMessage('Collector edition price is required'),
  body('licensingEditionPrice').trim().notEmpty().withMessage('Licensing edition price is required'),
  body('streamingTheme').optional().isIn(['Forge', 'Elysium', 'Default']).withMessage('Invalid streaming theme'),
  body('revenueRecipients').isArray().withMessage('Revenue recipients must be an array'),
  body('revenueRecipients.*.address').trim().notEmpty().withMessage('Recipient address is required'),
  body('revenueRecipients.*.percentage').isFloat({ min: 0, max: 100 }).withMessage('Percentage must be between 0 and 100'),
  body('childDSRCs').optional().isArray().withMessage('Child DSRCs must be an array'),
  
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Verify creator matches authenticated user
      if (req.user.walletAddress.toLowerCase() !== req.body.creator.toLowerCase()) {
        return res.status(403).json({ error: 'Unauthorized: Creator address does not match authenticated user' });
      }

      // Verify revenue recipients total 100%
      if (req.body.revenueRecipients && req.body.revenueRecipients.length > 0) {
        const totalPercentage = req.body.revenueRecipients.reduce((sum, recipient) => sum + recipient.percentage, 0);
        if (Math.abs(totalPercentage - 100) > 0.01) { // Allow small floating point errors
          return res.status(400).json({ error: 'Revenue recipient percentages must total 100%' });
        }
      }

      // Generate a unique collectionId
      const collectionId = `col_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      
      // Create the collection
      const collection = new Collection({
        collectionId,
        title: req.body.title,
        description: req.body.description || '',
        creator: req.body.creator.toLowerCase(),
        collectionType: req.body.collectionType,
        childDSRCs: req.body.childDSRCs || [],
        metadata: req.body.metadata || { attributes: [], collectionDetails: null },
        revenueRecipients: req.body.revenueRecipients,
        streamingTheme: req.body.streamingTheme || 'Default',
        themeMetadata: req.body.themeMetadata || {},
        streamingEditionPrice: req.body.streamingEditionPrice || '0',
        collectorEditionPrice: req.body.collectorEditionPrice,
        licensingEditionPrice: req.body.licensingEditionPrice,
        contractAddress: req.body.contractAddress.toLowerCase(),
        chain: req.body.chain,
        tokenURI: req.body.tokenURI,
        coverArtUrl: req.body.coverArtUrl || '',
        releaseDate: req.body.releaseDate || new Date(),
        isPublished: req.body.isPublished || false
      });

      await collection.save();
      
      res.status(201).json({
        success: true,
        message: 'Collection created successfully',
        collection
      });
    } catch (error) {
      console.error('Error creating collection:', error);
      res.status(500).json({ error: 'Failed to create collection', details: error.message });
    }
  }
];

// Get collection details
export const getCollection = [
  param('collectionId').trim().notEmpty().withMessage('Collection ID is required'),
  
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const collection = await Collection.findOne({ collectionId: req.params.collectionId });
      
      if (!collection) {
        return res.status(404).json({ error: 'Collection not found' });
      }

      res.status(200).json({
        success: true,
        collection
      });
    } catch (error) {
      console.error('Error fetching collection:', error);
      res.status(500).json({ error: 'Failed to fetch collection', details: error.message });
    }
  }
];

// Update collection
export const updateCollection = [
  param('collectionId').trim().notEmpty().withMessage('Collection ID is required'),
  body('title').optional().trim().notEmpty().withMessage('Collection title cannot be empty'),
  body('collectionType').optional().isIn(['album', 'mixtape', 'pack']).withMessage('Invalid collection type'),
  body('streamingTheme').optional().isIn(['Forge', 'Elysium', 'Default']).withMessage('Invalid streaming theme'),
  body('revenueRecipients').optional().isArray().withMessage('Revenue recipients must be an array'),
  body('revenueRecipients.*.address').optional().trim().notEmpty().withMessage('Recipient address is required'),
  body('revenueRecipients.*.percentage').optional().isFloat({ min: 0, max: 100 }).withMessage('Percentage must be between 0 and 100'),
  
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Find the collection
      const collection = await Collection.findOne({ collectionId: req.params.collectionId });
      
      if (!collection) {
        return res.status(404).json({ error: 'Collection not found' });
      }

      // Verify creator matches authenticated user
      if (req.user.walletAddress.toLowerCase() !== collection.creator.toLowerCase()) {
        return res.status(403).json({ error: 'Unauthorized: Only the creator can update this collection' });
      }

      // Verify revenue recipients total 100% if provided
      if (req.body.revenueRecipients && req.body.revenueRecipients.length > 0) {
        const totalPercentage = req.body.revenueRecipients.reduce((sum, recipient) => sum + recipient.percentage, 0);
        if (Math.abs(totalPercentage - 100) > 0.01) { // Allow small floating point errors
          return res.status(400).json({ error: 'Revenue recipient percentages must total 100%' });
        }
      }

      // Update allowed fields
      const updatableFields = [
        'title', 'description', 'collectionType', 'metadata', 'revenueRecipients',
        'streamingTheme', 'themeMetadata', 'streamingEditionPrice', 'collectorEditionPrice',
        'licensingEditionPrice', 'tokenURI', 'coverArtUrl', 'releaseDate', 'isPublished'
      ];

      updatableFields.forEach(field => {
        if (req.body[field] !== undefined) {
          collection[field] = req.body[field];
        }
      });

      await collection.save();
      
      res.status(200).json({
        success: true,
        message: 'Collection updated successfully',
        collection
      });
    } catch (error) {
      console.error('Error updating collection:', error);
      res.status(500).json({ error: 'Failed to update collection', details: error.message });
    }
  }
];

// Delete collection
export const deleteCollection = [
  param('collectionId').trim().notEmpty().withMessage('Collection ID is required'),
  
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Find the collection
      const collection = await Collection.findOne({ collectionId: req.params.collectionId });
      
      if (!collection) {
        return res.status(404).json({ error: 'Collection not found' });
      }

      // Verify creator matches authenticated user
      if (req.user.walletAddress.toLowerCase() !== collection.creator.toLowerCase()) {
        return res.status(403).json({ error: 'Unauthorized: Only the creator can delete this collection' });
      }

      // Delete the collection
      await Collection.deleteOne({ collectionId: req.params.collectionId });
      
      res.status(200).json({
        success: true,
        message: 'Collection deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting collection:', error);
      res.status(500).json({ error: 'Failed to delete collection', details: error.message });
    }
  }
];

// Add DSRC to collection
export const addDSRCToCollection = [
  param('collectionId').trim().notEmpty().withMessage('Collection ID is required'),
  body('dsrcId').trim().notEmpty().withMessage('DSRC ID is required'),
  body('title').trim().notEmpty().withMessage('DSRC title is required'),
  body('uploadHash').trim().notEmpty().withMessage('Upload hash is required'),
  body('order').optional().isInt({ min: 1 }).withMessage('Order must be a positive integer'),
  
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Find the collection
      const collection = await Collection.findOne({ collectionId: req.params.collectionId });
      
      if (!collection) {
        return res.status(404).json({ error: 'Collection not found' });
      }

      // Verify creator matches authenticated user
      if (req.user.walletAddress.toLowerCase() !== collection.creator.toLowerCase()) {
        return res.status(403).json({ error: 'Unauthorized: Only the creator can modify this collection' });
      }

      // Add DSRC to collection
      const dsrcData = {
        dsrcId: req.body.dsrcId,
        title: req.body.title,
        uploadHash: req.body.uploadHash,
        order: req.body.order // If not provided, the static method will assign the next order
      };

      const updatedCollection = await Collection.addDSRCToCollection(req.params.collectionId, dsrcData);
      
      res.status(200).json({
        success: true,
        message: 'DSRC added to collection successfully',
        collection: updatedCollection
      });
    } catch (error) {
      console.error('Error adding DSRC to collection:', error);
      res.status(500).json({ error: 'Failed to add DSRC to collection', details: error.message });
    }
  }
];

// Remove DSRC from collection
export const removeDSRCFromCollection = [
  param('collectionId').trim().notEmpty().withMessage('Collection ID is required'),
  param('dsrcId').trim().notEmpty().withMessage('DSRC ID is required'),
  
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Find the collection
      const collection = await Collection.findOne({ collectionId: req.params.collectionId });
      
      if (!collection) {
        return res.status(404).json({ error: 'Collection not found' });
      }

      // Verify creator matches authenticated user
      if (req.user.walletAddress.toLowerCase() !== collection.creator.toLowerCase()) {
        return res.status(403).json({ error: 'Unauthorized: Only the creator can modify this collection' });
      }

      // Remove DSRC from collection
      const updatedCollection = await Collection.removeDSRCFromCollection(
        req.params.collectionId, 
        req.params.dsrcId
      );
      
      res.status(200).json({
        success: true,
        message: 'DSRC removed from collection successfully',
        collection: updatedCollection
      });
    } catch (error) {
      console.error('Error removing DSRC from collection:', error);
      res.status(500).json({ error: 'Failed to remove DSRC from collection', details: error.message });
    }
  }
];

// Reorder DSRCs in collection
export const reorderDSRCs = [
  param('collectionId').trim().notEmpty().withMessage('Collection ID is required'),
  body('orderedDsrcIds').isArray().withMessage('Ordered DSRC IDs must be an array'),
  body('orderedDsrcIds.*').trim().notEmpty().withMessage('DSRC ID cannot be empty'),
  
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Find the collection
      const collection = await Collection.findOne({ collectionId: req.params.collectionId });
      
      if (!collection) {
        return res.status(404).json({ error: 'Collection not found' });
      }

      // Verify creator matches authenticated user
      if (req.user.walletAddress.toLowerCase() !== collection.creator.toLowerCase()) {
        return res.status(403).json({ error: 'Unauthorized: Only the creator can modify this collection' });
      }

      // Reorder DSRCs
      const updatedCollection = await Collection.reorderDSRCs(
        req.params.collectionId, 
        req.body.orderedDsrcIds
      );
      
      res.status(200).json({
        success: true,
        message: 'DSRCs reordered successfully',
        collection: updatedCollection
      });
    } catch (error) {
      console.error('Error reordering DSRCs:', error);
      res.status(500).json({ error: 'Failed to reorder DSRCs', details: error.message });
    }
  }
];

// Get collections by creator
export const getCollectionsByCreator = [
  param('creator').trim().notEmpty().withMessage('Creator address is required'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const creator = req.params.creator.toLowerCase();

      const result = await Collection.getCollectionsByCreator(creator, page, limit);
      
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error fetching collections by creator:', error);
      res.status(500).json({ error: 'Failed to fetch collections', details: error.message });
    }
  }
];

// Get top/trending collections
export const getTopCollections = [
  query('days').optional().isInt({ min: 1, max: 30 }).withMessage('Days must be between 1 and 30'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const days = parseInt(req.query.days) || 7;
      const limit = parseInt(req.query.limit) || 10;

      const collections = await Collection.getTopCollections(days, limit);
      
      res.status(200).json({
        success: true,
        collections
      });
    } catch (error) {
      console.error('Error fetching top collections:', error);
      res.status(500).json({ error: 'Failed to fetch top collections', details: error.message });
    }
  }
];

// Update collection stats
export const updateCollectionStats = [
  param('collectionId').trim().notEmpty().withMessage('Collection ID is required'),
  body('plays').optional().isInt().withMessage('Plays must be an integer'),
  body('likes').optional().isInt().withMessage('Likes must be an integer'),
  body('collectors').optional().isInt().withMessage('Collectors must be an integer'),
  
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Find the collection
      const collection = await Collection.findOne({ collectionId: req.params.collectionId });
      
      if (!collection) {
        return res.status(404).json({ error: 'Collection not found' });
      }

      // Update stats
      const statsUpdate = {};
      if (req.body.plays !== undefined) statsUpdate.plays = req.body.plays;
      if (req.body.likes !== undefined) statsUpdate.likes = req.body.likes;
      if (req.body.collectors !== undefined) statsUpdate.collectors = req.body.collectors;

      const updatedCollection = await Collection.updateCollectionStats(
        req.params.collectionId, 
        statsUpdate
      );
      
      if (!updatedCollection) {
        return res.status(400).json({ error: 'No stats were updated' });
      }
      
      res.status(200).json({
        success: true,
        message: 'Collection stats updated successfully',
        collection: updatedCollection
      });
    } catch (error) {
      console.error('Error updating collection stats:', error);
      res.status(500).json({ error: 'Failed to update collection stats', details: error.message });
    }
  }
];
