import express from 'express';
import { 
  createCollection,
  getCollection,
  updateCollection,
  deleteCollection,
  addDSRCToCollection,
  removeDSRCFromCollection,
  reorderDSRCs,
  getCollectionsByCreator,
  getTopCollections,
  updateCollectionStats
} from '../controllers/collectionController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @route   POST /api/collections
 * @desc    Create a new collection
 * @access  Private
 * @body    {
 *            title: String (required),
 *            description: String,
 *            creator: String (required),
 *            collectionType: String (required) - 'album', 'mixtape', or 'pack',
 *            childDSRCs: Array,
 *            metadata: Object,
 *            revenueRecipients: Array (required),
 *            streamingTheme: String - 'Forge', 'Elysium', or 'Default',
 *            contractAddress: String (required),
 *            chain: String (required),
 *            tokenURI: String (required),
 *            collectorEditionPrice: String (required),
 *            licensingEditionPrice: String (required)
 *          }
 */
router.post('/', authMiddleware, createCollection);

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
 *            revenueRecipients: Array,
 *            streamingTheme: String - 'Forge', 'Elysium', or 'Default',
 *            tokenURI: String,
 *            coverArtUrl: String,
 *            isPublished: Boolean
 *          }
 */
router.put('/:collectionId', authMiddleware, updateCollection);

/**
 * @route   DELETE /api/collections/:collectionId
 * @desc    Delete a collection
 * @access  Private
 * @param   collectionId - Collection ID
 */
router.delete('/:collectionId', authMiddleware, deleteCollection);

/**
 * @route   POST /api/collections/:collectionId/dsrcs
 * @desc    Add a DSRC to a collection
 * @access  Private
 * @param   collectionId - Collection ID
 * @body    {
 *            dsrcId: String (required),
 *            title: String (required),
 *            uploadHash: String (required),
 *            order: Number
 *          }
 */
router.post('/:collectionId/dsrcs', authMiddleware, addDSRCToCollection);

/**
 * @route   DELETE /api/collections/:collectionId/dsrcs/:dsrcId
 * @desc    Remove a DSRC from a collection
 * @access  Private
 * @param   collectionId - Collection ID
 * @param   dsrcId - DSRC ID
 */
router.delete('/:collectionId/dsrcs/:dsrcId', authMiddleware, removeDSRCFromCollection);

/**
 * @route   PUT /api/collections/:collectionId/dsrcs/reorder
 * @desc    Reorder DSRCs in a collection
 * @access  Private
 * @param   collectionId - Collection ID
 * @body    {
 *            orderedDsrcIds: Array (required) - Array of DSRC IDs in desired order
 *          }
 */
router.put('/:collectionId/dsrcs/reorder', authMiddleware, reorderDSRCs);

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
 * @route   GET /api/collections/top
 * @desc    Get top/trending collections
 * @access  Public
 * @query   days - Number of days to consider (default: 7, max: 30)
 * @query   limit - Number of results (default: 10, max: 100)
 */
router.get('/top', getTopCollections);

/**
 * @route   PUT /api/collections/:collectionId/stats
 * @desc    Update collection stats
 * @access  Private
 * @param   collectionId - Collection ID
 * @body    {
 *            plays: Number,
 *            likes: Number,
 *            collectors: Number
 *          }
 */
router.put('/:collectionId/stats', authMiddleware, updateCollectionStats);

export default router;
