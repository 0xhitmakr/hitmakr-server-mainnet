import mongoose from 'mongoose';

const collectionSchema = new mongoose.Schema({
  // Basic collection info
  collectionId: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true,
    index: true
  },
  description: {
    type: String
  },
  creator: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  
  // Collection type
  collectionType: {
    type: String,
    required: true,
    enum: ['album', 'mixtape', 'pack'],
    default: 'album'
  },
  
  // Child DSRCs with ordering
  childDSRCs: [{
    dsrcId: {
      type: String,
      required: true
    },
    order: {
      type: Number,
      required: true
    },
    title: String,
    uploadHash: String
  }],
  
  // Shared metadata and revenue
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      attributes: [],
      collectionDetails: null
    }
  },
  
  // Revenue split for the collection
  revenueRecipients: [{
    address: {
      type: String,
      required: true,
      lowercase: true
    },
    percentage: {
      type: Number,
      required: true
    }
  }],
  
  // Streaming theme inheritance
  streamingTheme: {
    type: String,
    enum: ['Forge', 'Elysium', 'Default'],
    default: 'Default'
  },
  themeMetadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Collection-level pricing
  streamingEditionPrice: {
    type: String,
    default: '0'
  },
  collectorEditionPrice: {
    type: String,
    required: true
  },
  licensingEditionPrice: {
    type: String,
    required: true
  },
  
  // Blockchain integration
  contractAddress: {
    type: String,
    required: true,
    lowercase: true
  },
  chain: {
    type: String,
    required: true
  },
  tokenURI: {
    type: String,
    required: true
  },
  
  // Performance tracking
  totalPlays: {
    type: Number,
    default: 0
  },
  totalLikes: {
    type: Number,
    default: 0
  },
  totalCollectors: {
    type: Number,
    default: 0
  },
  
  // Cover art
  coverArtUrl: {
    type: String
  },
  
  // Release info
  releaseDate: {
    type: Date,
    default: Date.now
  },
  
  // Status
  isPublished: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
collectionSchema.index({ title: 'text', description: 'text' });
collectionSchema.index({ creator: 1, createdAt: -1 });
collectionSchema.index({ collectionType: 1 });
collectionSchema.index({ 'childDSRCs.dsrcId': 1 });
collectionSchema.index({ totalPlays: -1 });
collectionSchema.index({ totalLikes: -1 });

// Static methods
collectionSchema.statics.addDSRCToCollection = async function(collectionId, dsrcData) {
  const collection = await this.findOne({ collectionId });
  if (!collection) {
    throw new Error('Collection not found');
  }
  
  // Check if DSRC already exists in collection
  const existingIndex = collection.childDSRCs.findIndex(child => child.dsrcId === dsrcData.dsrcId);
  if (existingIndex >= 0) {
    // Update existing DSRC
    collection.childDSRCs[existingIndex] = {
      ...collection.childDSRCs[existingIndex],
      ...dsrcData
    };
  } else {
    // Add new DSRC
    const order = collection.childDSRCs.length > 0 
      ? Math.max(...collection.childDSRCs.map(child => child.order)) + 1 
      : 1;
    
    collection.childDSRCs.push({
      ...dsrcData,
      order
    });
  }
  
  return collection.save();
};

collectionSchema.statics.removeDSRCFromCollection = async function(collectionId, dsrcId) {
  const collection = await this.findOne({ collectionId });
  if (!collection) {
    throw new Error('Collection not found');
  }
  
  const initialLength = collection.childDSRCs.length;
  collection.childDSRCs = collection.childDSRCs.filter(child => child.dsrcId !== dsrcId);
  
  if (collection.childDSRCs.length === initialLength) {
    throw new Error('DSRC not found in collection');
  }
  
  // Reorder remaining DSRCs
  collection.childDSRCs = collection.childDSRCs
    .sort((a, b) => a.order - b.order)
    .map((child, index) => ({
      ...child,
      order: index + 1
    }));
  
  return collection.save();
};

collectionSchema.statics.reorderDSRCs = async function(collectionId, orderedDsrcIds) {
  const collection = await this.findOne({ collectionId });
  if (!collection) {
    throw new Error('Collection not found');
  }
  
  // Validate all DSRCs exist
  const existingIds = new Set(collection.childDSRCs.map(child => child.dsrcId));
  for (const dsrcId of orderedDsrcIds) {
    if (!existingIds.has(dsrcId)) {
      throw new Error(`DSRC ${dsrcId} not found in collection`);
    }
  }
  
  // Create a map for quick lookup
  const dsrcMap = {};
  collection.childDSRCs.forEach(child => {
    dsrcMap[child.dsrcId] = child;
  });
  
  // Reorder based on input
  collection.childDSRCs = orderedDsrcIds.map((dsrcId, index) => ({
    ...dsrcMap[dsrcId],
    order: index + 1
  }));
  
  return collection.save();
};

collectionSchema.statics.updateCollectionStats = async function(collectionId, { plays = 0, likes = 0, collectors = 0 }) {
  const updateObj = {};
  
  if (plays !== 0) {
    updateObj.totalPlays = plays > 0 ? { $inc: { totalPlays: plays } } : { $set: { totalPlays: Math.abs(plays) } };
  }
  
  if (likes !== 0) {
    updateObj.totalLikes = likes > 0 ? { $inc: { totalLikes: likes } } : { $set: { totalLikes: Math.abs(likes) } };
  }
  
  if (collectors !== 0) {
    updateObj.totalCollectors = collectors > 0 ? { $inc: { totalCollectors: collectors } } : { $set: { totalCollectors: Math.abs(collectors) } };
  }
  
  if (Object.keys(updateObj).length === 0) {
    return null;
  }
  
  return this.findOneAndUpdate(
    { collectionId },
    updateObj,
    { new: true }
  );
};

collectionSchema.statics.getCollectionsByCreator = async function(creator, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  const [collections, totalCount] = await Promise.all([
    this.find({ creator })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v'),
    
    this.countDocuments({ creator })
  ]);

  return {
    collections,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit),
    totalCollections: totalCount
  };
};

collectionSchema.statics.getTopCollections = async function(days = 7, limit = 10) {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - days);

  return this.find({
    createdAt: { $gte: dateThreshold },
    isPublished: true
  })
  .sort({ totalPlays: -1, totalLikes: -1 })
  .limit(limit)
  .select('-__v');
};

// Create the model
const Collection = mongoose.models.Collection || mongoose.model('Collection', collectionSchema);

export default Collection;
