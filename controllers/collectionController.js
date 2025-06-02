import Collection from '../models/Collection.js';
import { body, param, query, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { 
    deployCollectionContract as deployCollectionContractService, 
    authorizeDSRCForCollection as authorizeDSRCForCollectionService, 
    distributeCollectionRevenueOnChain as distributeCollectionRevenueOnChainService,
    getCollectionOnChainEarnings // Assuming this will be added to the service stub
} from '../services/collectionContractService.js';

// Helper to check if user is creator or admin
const isCreatorOrAdmin = (req, collection) => {
  // Use req.headers['x-user-address'] for consistency with dsrcController.js
  const userAddress = req.headers['x-user-address'];
  if (!userAddress || !collection || !collection.creator) {
    return false;
  }
  // Only check if the user is the creator, as req.user.isAdmin is not provided by authMiddleware
  return userAddress.toLowerCase() === collection.creator.toLowerCase();
};

/**
 * @route   POST /api/collections
 * @desc    Create a new collection
 * @access  Private
 * @body    {
 *            title: String (required),
 *            description: String,
 *            creator: String (required), // Should match authenticated user
 *            collectionType: String (required) - 'album', 'mixtape', or 'pack',
 *            initialDsrcs: Array - [{ dsrcId, contractAddress, title, uploadHash, order, weight }],
 *            metadata: Object,
 *            revenueRecipients: Array, // For future direct collection splits, not primary now
 *            streamingTheme: String - 'Forge', 'Elysium', or 'Default',
 *            collectorEditionPrice: String (required),
 *            licensingEditionPrice: String (required),
 *            isPublished: Boolean,
 *            distributionType: String - 'EVEN', 'WEIGHTED', 'CUSTOM',
 *            chain: String
 *          }
 */
export const createCollection = [
  // Validation middleware
  body('title').trim().notEmpty().withMessage('Collection title is required'),
  body('creator').trim().notEmpty().withMessage('Creator address is required'),
  body('collectionType').isIn(['album', 'mixtape', 'pack']).withMessage('Invalid collection type'),
  body('collectorEditionPrice').trim().notEmpty().withMessage('Collector edition price is required'),
  body('licensingEditionPrice').trim().notEmpty().withMessage('Licensing edition price is required'),
  body('streamingTheme').optional().isIn(['Forge', 'Elysium', 'Default']).withMessage('Invalid streaming theme'),
  body('revenueRecipients').optional().isArray().withMessage('Revenue recipients must be an array'),
  body('revenueRecipients.*.address').optional().trim().notEmpty().withMessage('Recipient address is required'),
  body('revenueRecipients.*.percentage').optional().isFloat({ min: 0, max: 100 }).withMessage('Percentage must be between 0 and 100'),
  body('initialDsrcs').optional().isArray().withMessage('Initial DSRCs must be an array'),
  body('distributionType').optional().isIn(['EVEN', 'WEIGHTED', 'CUSTOM']).withMessage('Invalid distribution type'),
  
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Use req.headers['x-user-address'] for consistency with dsrcController.js
      const userAddress = req.headers['x-user-address'];
      if (!userAddress) {
        return res.status(401).json({ error: 'Unauthorized: User address required in headers' });
      }

      // Verify creator matches authenticated user
      if (userAddress.toLowerCase() !== req.body.creator.toLowerCase()) {
        return res.status(403).json({ error: 'Unauthorized: Creator address does not match authenticated user' });
      }

      // Verify revenue recipients total 100% if provided
      if (req.body.revenueRecipients && req.body.revenueRecipients.length > 0) {
        const totalPercentage = req.body.revenueRecipients.reduce((sum, recipient) => sum + Number(recipient.percentage), 0);
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
        childDSRCs: [],
        metadata: req.body.metadata || { attributes: [], collectionDetails: null },
        revenueRecipients: req.body.revenueRecipients || [],
        streamingTheme: req.body.streamingTheme || 'Default',
        themeMetadata: req.body.themeMetadata || {},
        streamingEditionPrice: req.body.streamingEditionPrice || '0',
        collectorEditionPrice: req.body.collectorEditionPrice,
        licensingEditionPrice: req.body.licensingEditionPrice,
        coverArtUrl: req.body.coverArtUrl || '',
        releaseDate: req.body.releaseDate || new Date(),
        isPublished: req.body.isPublished || false,
        distributionType: req.body.distributionType || 'EVEN',
        chain: req.body.chain || 'SKL' // Default to SKALE or allow user to specify
      });

      await collection.save();
      
      // Add initial DSRCs if provided
      if (req.body.initialDsrcs && req.body.initialDsrcs.length > 0) {
        for (const dsrc of req.body.initialDsrcs) {
          await Collection.addDSRCToCollection(collectionId, dsrc);
        }
      }
      
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

/**
 * @route   GET /api/collections/:collectionId
 * @desc    Get collection details
 * @access  Public
 * @param   collectionId - Collection ID
 */
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

/**
 * @route   PUT /api/collections/:collectionId
 * @desc    Update a collection
 * @access  Private
 * @param   collectionId - Collection ID
 * @body    {
 *            title: String,
 *            description: String,
 *            collectionType: String - 'album', 'mixtape', or 'pack',
 *            metadata: Object,
 *            revenueRecipients: Array, // For future direct collection splits
 *            streamingTheme: String - 'Forge', 'Elysium', or 'Default',
 *            collectorEditionPrice: String,
 *            licensingEditionPrice: String,
 *            coverArtUrl: String,
 *            releaseDate: Date,
 *            isPublished: Boolean,
 *            isActive: Boolean,
 *            distributionType: String - 'EVEN', 'WEIGHTED', or 'CUSTOM'
 *          }
 */
export const updateCollection = [
  param('collectionId').trim().notEmpty().withMessage('Collection ID is required'),
  body('title').optional().trim().notEmpty().withMessage('Collection title cannot be empty'),
  body('collectionType').optional().isIn(['album', 'mixtape', 'pack']).withMessage('Invalid collection type'),
  body('streamingTheme').optional().isIn(['Forge', 'Elysium', 'Default']).withMessage('Invalid streaming theme'),
  body('distributionType').optional().isIn(['EVEN', 'WEIGHTED', 'CUSTOM']).withMessage('Invalid distribution type'),
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

      // Verify creator or admin
      if (!isCreatorOrAdmin(req, collection)) {
        return res.status(403).json({ error: 'Unauthorized: Only the creator can update this collection' });
      }

      // Verify revenue recipients total 100% if provided
      if (req.body.revenueRecipients && req.body.revenueRecipients.length > 0) {
        const totalPercentage = req.body.revenueRecipients.reduce((sum, recipient) => sum + Number(recipient.percentage), 0);
        if (Math.abs(totalPercentage - 100) > 0.01) { // Allow small floating point errors
          return res.status(400).json({ error: 'Revenue recipient percentages must total 100%' });
        }
      }

      // Update allowed fields
      const updatableFields = [
        'title', 'description', 'collectionType', 'metadata', 'revenueRecipients',
        'streamingTheme', 'themeMetadata', 'streamingEditionPrice', 'collectorEditionPrice',
        'licensingEditionPrice', 'coverArtUrl', 'releaseDate', 'isPublished', 'isActive',
        'distributionType'
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

/**
 * @route   DELETE /api/collections/:collectionId
 * @desc    Delete a collection
 * @access  Private
 * @param   collectionId - Collection ID
 */
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

      // Verify creator or admin
      if (!isCreatorOrAdmin(req, collection)) {
        return res.status(403).json({ error: 'Unauthorized: Only the creator can delete this collection' });
      }

      // Don't allow deletion if deployed to blockchain
      if (collection.contractAddress) {
        return res.status(400).json({ 
          error: 'Cannot delete collection that has been deployed to blockchain',
          message: 'This collection has been deployed to the blockchain and cannot be deleted. You can set isActive to false instead.'
        });
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

/**
 * @route   POST /api/collections/:collectionId/dsrcs
 * @desc    Add a DSRC to a collection
 * @access  Private
 * @param   collectionId - Collection ID
 * @body    {
 *            dsrcId: String (required),
 *            title: String (required),
 *            uploadHash: String (required),
 *            contractAddress: String, // DSRC contract address
 *            order: Number,
 *            weight: Number // For weighted distribution
 *          }
 */
export const addDSRCToCollection = [
  param('collectionId').trim().notEmpty().withMessage('Collection ID is required'),
  body('dsrcId').trim().notEmpty().withMessage('DSRC ID is required'),
  body('title').trim().notEmpty().withMessage('DSRC title is required'),
  body('uploadHash').trim().notEmpty().withMessage('Upload hash is required'),
  body('order').optional().isInt({ min: 1 }).withMessage('Order must be a positive integer'),
  body('weight').optional().isInt({ min: 0 }).withMessage('Weight must be a non-negative integer'),
  
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

      // Verify creator or admin
      if (!isCreatorOrAdmin(req, collection)) {
        return res.status(403).json({ error: 'Unauthorized: Only the creator can modify this collection' });
      }

      // Add DSRC to collection
      const dsrcData = {
        dsrcId: req.body.dsrcId,
        title: req.body.title,
        uploadHash: req.body.uploadHash,
        contractAddress: req.body.contractAddress, // DSRC contract address
        order: req.body.order, // If not provided, the static method will assign the next order
        weight: req.body.weight || 0,
        isAuthorized: false // Default to not authorized
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

/**
 * @route   DELETE /api/collections/:collectionId/dsrcs/:dsrcId
 * @desc    Remove a DSRC from a collection
 * @access  Private
 * @param   collectionId - Collection ID
 * @param   dsrcId - DSRC ID
 */
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

      // Verify creator or admin
      if (!isCreatorOrAdmin(req, collection)) {
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

/**
 * @route   PUT /api/collections/:collectionId/dsrcs/reorder
 * @desc    Reorder DSRCs in a collection
 * @access  Private
 * @param   collectionId - Collection ID
 * @body    {
 *            orderedDsrcIds: Array (required) - Array of DSRC IDs in desired order
 *          }
 */
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

      // Verify creator or admin
      if (!isCreatorOrAdmin(req, collection)) {
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

/**
 * @route   PUT /api/collections/:collectionId/dsrcs/weights
 * @desc    Update DSRC weights for weighted distribution
 * @access  Private
 * @param   collectionId - Collection ID
 * @body    {
 *            weights: Object (required) - { dsrcId: weight, ... }
 *          }
 */
export const updateDSRCWeights = [
  param('collectionId').trim().notEmpty().withMessage('Collection ID is required'),
  body('weights').isObject().withMessage('Weights must be an object'),
  
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

      // Verify creator or admin
      if (!isCreatorOrAdmin(req, collection)) {
        return res.status(403).json({ error: 'Unauthorized: Only the creator can modify this collection' });
      }

      // Validate weights
      const weights = req.body.weights;
      const dsrcIds = Object.keys(weights);
      
      if (dsrcIds.length === 0) {
        return res.status(400).json({ error: 'No weights provided' });
      }
      
      // Check if all DSRCs exist in collection
      const existingDsrcIds = collection.childDSRCs.map(dsrc => dsrc.dsrcId);
      const invalidDsrcIds = dsrcIds.filter(id => !existingDsrcIds.includes(id));
      
      if (invalidDsrcIds.length > 0) {
        return res.status(400).json({ 
          error: 'Some DSRCs do not exist in this collection', 
          invalidDsrcIds 
        });
      }

      // Update weights
      const updatedCollection = await Collection.updateDSRCWeights(
        req.params.collectionId, 
        weights
      );
      
      res.status(200).json({
        success: true,
        message: 'DSRC weights updated successfully',
        collection: updatedCollection
      });
    } catch (error) {
      console.error('Error updating DSRC weights:', error);
      res.status(500).json({ error: 'Failed to update DSRC weights', details: error.message });
    }
  }
];

/**
 * @route   GET /api/collections/creator/:creator
 * @desc    Get collections by creator
 * @access  Public
 * @param   creator - Creator wallet address
 * @query   page - Page number (default: 1)
 * @query   limit - Results per page (default: 20, max: 100)
 */
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

/**
 * @route   GET /api/collections/dsrc/:dsrcId
 * @desc    Get collections containing a specific DSRC
 * @access  Public
 * @param   dsrcId - DSRC ID
 */
export const getCollectionsByDSRC = [
  param('dsrcId').trim().notEmpty().withMessage('DSRC ID is required'),
  
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const collections = await Collection.getCollectionsByDSRC(req.params.dsrcId);
      
      res.status(200).json({
        success: true,
        collections
      });
    } catch (error) {
      console.error('Error fetching collections by DSRC:', error);
      res.status(500).json({ error: 'Failed to fetch collections', details: error.message });
    }
  }
];

/**
 * @route   GET /api/collections/top
 * @desc    Get top/trending collections
 * @access  Public
 * @query   days - Number of days to consider (default: 7, max: 30)
 * @query   limit - Number of results (default: 10, max: 100)
 */
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

/**
 * @route   POST /api/collections/:collectionId/deploy
 * @desc    Deploy collection to blockchain
 * @access  Private
 * @param   collectionId - Collection ID
 */
export const deployCollectionContract = [
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

      // Verify creator or admin
      if (!isCreatorOrAdmin(req, collection)) {
        return res.status(403).json({ error: 'Unauthorized: Only the creator can deploy this collection' });
      }

      // Check if already deployed
      if (collection.contractAddress) {
        return res.status(400).json({ 
          error: 'Collection already deployed', 
          contractAddress: collection.contractAddress 
        });
      }

      // Check if collection has DSRCs
      if (!collection.childDSRCs || collection.childDSRCs.length === 0) {
        return res.status(400).json({ error: 'Collection must have at least one DSRC to deploy' });
      }

      // Prepare deployment data
      const deploymentData = {
        title: collection.title,
        description: collection.description,
        creator: collection.creator,
        distributionType: collection.distributionType,
        dsrcIds: collection.childDSRCs.map(dsrc => dsrc.dsrcId),
        dsrcAddresses: collection.childDSRCs.map(dsrc => dsrc.contractAddress), // Ensure these are populated
        weights: collection.childDSRCs.map(dsrc => dsrc.weight),
        chain: collection.chain
      };

      // Deploy collection contract
      const deployResult = await deployCollectionContractService(deploymentData);
      
      if (!deployResult.success) {
        return res.status(500).json({
          error: 'Failed to deploy collection contract',
          details: deployResult.error
        });
      }

      // Update collection with contract address
      const updatedCollection = await Collection.updateContractAddress(
        collection.collectionId,
        deployResult.contractAddress,
        deployResult.onChainId,
        deployResult.transactionHash
      );
      
      res.status(200).json({
        success: true,
        message: 'Collection deployed successfully',
        contractAddress: deployResult.contractAddress,
        transactionHash: deployResult.transactionHash,
        onChainId: deployResult.onChainId,
        collection: updatedCollection
      });
    } catch (error) {
      console.error('Error deploying collection:', error);
      res.status(500).json({ error: 'Failed to deploy collection', details: error.message });
    }
  }
];

/**
 * @route   POST /api/collections/:collectionId/dsrcs/:dsrcId/authorize
 * @desc    Authorize DSRC to receive royalties from collection
 * @access  Private
 * @param   collectionId - Collection ID
 * @param   dsrcId - DSRC ID
 * @body    {
 *            isAuthorized: Boolean (required)
 *          }
 */
export const updateDSRCAuthorization = [
  param('collectionId').trim().notEmpty().withMessage('Collection ID is required'),
  param('dsrcId').trim().notEmpty().withMessage('DSRC ID is required'),
  body('isAuthorized').isBoolean().withMessage('isAuthorized must be a boolean'),
  
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

      // Verify creator or admin
      if (!isCreatorOrAdmin(req, collection)) {
        return res.status(403).json({ error: 'Unauthorized: Only the creator can update DSRC authorization' });
      }

      // Check if collection is deployed
      if (!collection.contractAddress) {
        return res.status(400).json({ error: 'Collection must be deployed before authorizing DSRCs' });
      }

      // Find the DSRC in the collection
      const dsrc = collection.childDSRCs.find(d => d.dsrcId === req.params.dsrcId);
      if (!dsrc) {
        return res.status(404).json({ error: 'DSRC not found in collection' });
      }

      // Check if DSRC has contract address
      if (!dsrc.contractAddress) {
        return res.status(400).json({ error: 'DSRC must have a contract address to authorize' });
      }

      // Call contract service to authorize DSRC
      const authResult = await authorizeDSRCForCollectionService({
        collectionAddress: collection.contractAddress,
        dsrcAddress: dsrc.contractAddress,
        isAuthorized: req.body.isAuthorized,
        chain: collection.chain
      });
      
      if (!authResult.success) {
        return res.status(500).json({
          error: 'Failed to authorize DSRC',
          details: authResult.error
        });
      }

      // Update collection with authorization status
      const updatedCollection = await Collection.updateDSRCAuthorization(
        collection.collectionId,
        req.params.dsrcId,
        req.body.isAuthorized
      );
      
      res.status(200).json({
        success: true,
        message: req.body.isAuthorized 
          ? 'DSRC authorized to receive royalties from collection' 
          : 'DSRC authorization revoked',
        transactionHash: authResult.transactionHash,
        collection: updatedCollection
      });
    } catch (error) {
      console.error('Error updating DSRC authorization:', error);
      res.status(500).json({ error: 'Failed to update DSRC authorization', details: error.message });
    }
  }
];

/**
 * @route   POST /api/collections/:collectionId/revenue
 * @desc    Record revenue for a collection (off-chain for now, or to trigger on-chain deposit)
 * @access  Private
 * @param   collectionId - Collection ID
 * @body    {
 *            amount: Number (required) - Amount of revenue
 *            source: String - Source of revenue
 *          }
 */
export const recordCollectionRevenue = [
  param('collectionId').trim().notEmpty().withMessage('Collection ID is required'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('source').optional().trim(),
  
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

      // Only admin or creator can record revenue
      if (!isCreatorOrAdmin(req, collection)) {
        return res.status(403).json({ error: 'Unauthorized: Only the creator can record revenue' });
      }

      // Record revenue
      const amount = parseFloat(req.body.amount);
      if (amount <= 0) {
        return res.status(400).json({ error: 'Amount must be greater than zero' });
      }

      // If collection is on-chain, this might trigger an on-chain deposit via service
      // For now, just records it in the DB
      const updatedCollection = await Collection.recordRevenue(
        collection.collectionId,
        amount,
        req.body.source || 'external'
      );
      
      res.status(200).json({
        success: true,
        message: 'Revenue recorded successfully',
        collection: updatedCollection
      });
    } catch (error) {
      console.error('Error recording revenue:', error);
      res.status(500).json({ error: 'Failed to record revenue', details: error.message });
    }
  }
];

/**
 * @route   POST /api/collections/:collectionId/distribute
 * @desc    Distribute collection revenue to DSRCs (triggers on-chain distribution)
 * @access  Private
 * @param   collectionId - Collection ID
 */
export const distributeCollectionRevenue = [
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

      // Only admin or creator can distribute revenue
      if (!isCreatorOrAdmin(req, collection)) {
        return res.status(403).json({ error: 'Unauthorized: Only the creator can distribute revenue' });
      }

      // Check if collection is deployed
      if (!collection.contractAddress) {
        return res.status(400).json({ error: 'Collection must be deployed before distributing revenue' });
      }

      // Check if there's pending revenue to distribute
      if (!collection.earnings.pendingDistribution || collection.earnings.pendingDistribution <= 0) {
        return res.status(400).json({ error: 'No pending revenue to distribute' });
      }

      // Call contract service to distribute revenue
      const distributeResult = await distributeCollectionRevenueOnChainService({
        collectionAddress: collection.contractAddress,
        collectionId: collection.onChainId, // Assuming onChainId is the ID used in the contract
        chain: collection.chain
      });
      
      if (!distributeResult.success) {
        return res.status(500).json({
          error: 'Failed to distribute revenue on-chain',
          details: distributeResult.error
        });
      }

      // Prepare distribution data for DB record
      const distributionData = {
        amount: collection.earnings.pendingDistribution, // Distribute the entire pending amount
        dsrcs: distributeResult.dsrcDistributions || [], // From contract event logs
        transactionHash: distributeResult.transactionHash
      };

      // Record distribution in DB
      const updatedCollection = await Collection.recordDistribution(
        collection.collectionId,
        distributionData
      );
      
      res.status(200).json({
        success: true,
        message: 'Revenue distribution initiated successfully',
        transactionHash: distributeResult.transactionHash,
        dsrcDistributions: distributeResult.dsrcDistributions,
        collection: updatedCollection
      });
    } catch (error) {
      console.error('Error distributing revenue:', error);
      res.status(500).json({ error: 'Failed to distribute revenue', details: error.message });
    }
  }
];

/**
 * @route   GET /api/collections/:collectionId/earnings
 * @desc    Get collection earnings (off-chain and potentially on-chain)
 * @access  Private
 * @param   collectionId - Collection ID
 */
export const getCollectionEarnings = [
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

      // Only creator can view earnings
      if (!isCreatorOrAdmin(req, collection)) {
        return res.status(403).json({ error: 'Unauthorized: Only the creator can view earnings' });
      }

      // Get earnings from DB
      const offChainEarnings = collection.earnings;
      const distributions = collection.distributions || [];
      
      // Get additional on-chain data if deployed
      let onChainData = null;
      if (collection.contractAddress) {
        // This would be implemented in a real service
        onChainData = await getCollectionOnChainEarnings(collection.contractAddress, collection.chain);
      }
      
      res.status(200).json({
        success: true,
        offChainEarnings,
        distributions,
        onChainData // Contains on-chain earnings if available
      });
    } catch (error) {
      console.error('Error fetching collection earnings:', error);
      res.status(500).json({ error: 'Failed to fetch collection earnings', details: error.message });
    }
  }
];
