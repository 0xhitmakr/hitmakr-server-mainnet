import express from 'express';
import { 
  createCollection,
  getCollection,
  updateCollection,
  deleteCollection,
  addDSRCToCollection,
  removeDSRCFromCollection,
  reorderDSRCs,
  updateDSRCWeights,
  getCollectionsByCreator,
  getCollectionsByDSRC,
  getTopCollections,
  deployCollectionContract,
  updateDSRCAuthorization,
  recordCollectionRevenue,
  distributeCollectionRevenue,
  getCollectionEarnings
} from '../controllers/collectionController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

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
router.post('/', verifyToken, createCollection);

/**
 * @route   GET /api/collections/:collectionId
 * @desc    Get collection details
 * @access  Public
 * @param   collectionId - Collection ID
 */
router.get('/:collectionId', getCollection);

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
router.put('/:collectionId', verifyToken, updateCollection);

/**
 * @route   DELETE /api/collections/:collectionId
 * @desc    Delete a collection
 * @access  Private
 * @param   collectionId - Collection ID
 */
router.delete('/:collectionId', verifyToken, deleteCollection);

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
router.post('/:collectionId/dsrcs', verifyToken, addDSRCToCollection);

/**
 * @route   DELETE /api/collections/:collectionId/dsrcs/:dsrcId
 * @desc    Remove a DSRC from a collection
 * @access  Private
 * @param   collectionId - Collection ID
 * @param   dsrcId - DSRC ID
 */
router.delete('/:collectionId/dsrcs/:dsrcId', verifyToken, removeDSRCFromCollection);

/**
 * @route   PUT /api/collections/:collectionId/dsrcs/reorder
 * @desc    Reorder DSRCs in a collection
 * @access  Private
 * @param   collectionId - Collection ID
 * @body    {
 *            orderedDsrcIds: Array (required) - Array of DSRC IDs in desired order
 *          }
 */
router.put('/:collectionId/dsrcs/reorder', verifyToken, reorderDSRCs);

/**
 * @route   PUT /api/collections/:collectionId/dsrcs/weights
 * @desc    Update DSRC weights for weighted distribution
 * @access  Private
 * @param   collectionId - Collection ID
 * @body    {
 *            weights: Object (required) - { dsrcId: weight, ... }
 *          }
 */
router.put('/:collectionId/dsrcs/weights', verifyToken, updateDSRCWeights);

/**
 * @route   GET /api/collections/creator/:creator
 * @desc    Get collections by creator
 * @access  Public
 * @param   creator - Creator wallet address
 * @query   page - Page number (default: 1)
 * @query   limit - Results per page (default: 20, max: 100)
 */
router.get('/creator/:creator', getCollectionsByCreator);

/**
 * @route   GET /api/collections/dsrc/:dsrcId
 * @desc    Get collections containing a specific DSRC
 * @access  Public
 * @param   dsrcId - DSRC ID
 */
router.get('/dsrc/:dsrcId', getCollectionsByDSRC);

/**
 * @route   GET /api/collections/top
 * @desc    Get top/trending collections
 * @access  Public
 * @query   days - Number of days to consider (default: 7, max: 30)
 * @query   limit - Number of results (default: 10, max: 100)
 */
router.get('/top', getTopCollections);

/**
 * @route   POST /api/collections/:collectionId/deploy
 * @desc    Deploy collection to blockchain
 * @access  Private
 * @param   collectionId - Collection ID
 */
router.post('/:collectionId/deploy', verifyToken, deployCollectionContract);

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
router.post('/:collectionId/dsrcs/:dsrcId/authorize', verifyToken, updateDSRCAuthorization);

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
router.post('/:collectionId/revenue', verifyToken, recordCollectionRevenue);

/**
 * @route   POST /api/collections/:collectionId/distribute
 * @desc    Distribute collection revenue to DSRCs (triggers on-chain distribution)
 * @access  Private
 * @param   collectionId - Collection ID
 */
router.post('/:collectionId/distribute', verifyToken, distributeCollectionRevenue);

/**
 * @route   GET /api/collections/:collectionId/earnings
 * @desc    Get collection earnings (off-chain and potentially on-chain)
 * @access  Private
 * @param   collectionId - Collection ID
 */
router.get('/:collectionId/earnings', verifyToken, getCollectionEarnings);

export default router;
