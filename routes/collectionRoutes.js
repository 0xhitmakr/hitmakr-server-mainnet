import express from 'express';
import { 
  createCollection,
  getCollection,
  getCollectionsByCreator
} from '../controllers/collectionController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Create collection (private)
router.post('/', verifyToken, createCollection);

// Get collection by ID (public)
router.get('/:collectionId', getCollection);

// Get collections by creator (public)
router.get('/creator/:creator', getCollectionsByCreator);

export default router;
