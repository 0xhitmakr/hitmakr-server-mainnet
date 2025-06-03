import Collection from "../models/Collection.js";
import { body, param, query, validationResult } from "express-validator";

// Helper to check if user is creator
const isCreatorOrAdmin = (req, collection) => {
  const userAddress = req.headers["x-user-address"];
  if (!userAddress || !collection || !collection.creator) {
    return false;
  }
  return userAddress.toLowerCase() === collection.creator.toLowerCase();
};

export const createCollection = [
  body("title").trim().notEmpty().withMessage("Collection title is required"),
  body("creator").trim().notEmpty().withMessage("Creator address is required"),
  body("collectionType").isIn(["album", "mixtape", "pack"]).withMessage("Invalid collection type"),
  body("collectorEditionPrice").trim().notEmpty().withMessage("Collector edition price is required"),
  body("licensingEditionPrice").trim().notEmpty().withMessage("Licensing edition price is required"),
  
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userAddress = req.headers["x-user-address"];
      if (!userAddress) {
        return res.status(401).json({ error: "Unauthorized: User address required in headers" });
      }

      if (userAddress.toLowerCase() !== req.body.creator.toLowerCase()) {
        return res.status(403).json({ error: "Unauthorized: Creator address does not match authenticated user" });
      }

      const collectionId = `col_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      
      const collection = new Collection({
        collectionId,
        title: req.body.title,
        description: req.body.description || "",
        creator: req.body.creator.toLowerCase(),
        collectionType: req.body.collectionType,
        collectorEditionPrice: req.body.collectorEditionPrice,
        licensingEditionPrice: req.body.licensingEditionPrice,
        distributionType: req.body.distributionType || "EVEN",
        chain: req.body.chain || "SKL"
      });

      await collection.save();
      
      res.status(201).json({
        success: true,
        message: "Collection created successfully",
        collection
      });
    } catch (error) {
      console.error("Error creating collection:", error);
      res.status(500).json({ error: "Failed to create collection", details: error.message });
    }
  }
];

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

export const getCollectionsByCreator = [
  param('creator').trim().notEmpty().withMessage('Creator address is required'),
  
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
