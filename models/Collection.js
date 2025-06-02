import mongoose from 'mongoose';

/**
 * Collection schema for managing groups of DSRCs (albums, mixtapes, packs)
 * Integrates with HitmakrCollections smart contract for on-chain revenue distribution
 */
const collectionSchema = new mongoose.Schema({
  // Basic collection info
  collectionId: {
    type: String,
    required: true,
    unique: true,
    index: true
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
    default: 'album',
    index: true
  },
  
  // Smart contract integration
  contractAddress: {
    type: String,
    lowercase: true,
    index: true
  },
  chain: {
    type: String,
    required: true,
    default: 'SKL',
    index: true
  },
  onChainId: {
    type: String,
    index: true
  },
  transactionHash: String,
  
  // Distribution settings
  distributionType: {
    type: String,
    enum: ['EVEN', 'WEIGHTED', 'CUSTOM'],
    default: 'EVEN'
  },
  
  // Child DSRCs with ordering and weights
  childDSRCs: [{
    dsrcId: {
      type: String,
      required: true
    },
    contractAddress: {
      type: String,
      lowercase: true
    },
    order: {
      type: Number,
      required: true
    },
    title: String,
    uploadHash: String,
    weight: {
      type: Number,
      default: 0
    },
    isAuthorized: {
      type: Boolean,
      default: false
    }
  }],
  
  // Shared metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      attributes: [],
      collectionDetails: null
    }
  },
  
  // Revenue tracking
  earnings: {
    totalReceived: {
      type: Number,
      default: 0
    },
    totalDistributed: {
      type: Number,
      default: 0
    },
    pendingDistribution: {
      type: Number,
      default: 0
    }
  },
  
  // Distribution history
  distributions: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    amount: Number,
    dsrcs: [{
      dsrcId: String,
      amount: Number
    }],
    transactionHash: String
  }],
  
  // Revenue split for the collection (for future use)
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
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
collectionSchema.index({ title: 'text', description: 'text' });
collectionSchema.index({ creator: 1, createdAt: -1 });
collectionSchema.index({ collectionType: 1 });
collectionSchema.index({ 'childDSRCs.dsrcId': 1 });
collectionSchema.index({ 'earnings.totalReceived': -1 });
collectionSchema.index({ isPublished: 1, isActive: 1 });

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
      order: dsrcData.order || order
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

collectionSchema.statics.updateDSRCWeights = async function(collectionId, dsrcWeights) {
  const collection = await this.findOne({ collectionId });
  if (!collection) {
    throw new Error('Collection not found');
  }
  
  // Update weights
  Object.entries(dsrcWeights).forEach(([dsrcId, weight]) => {
    const dsrcIndex = collection.childDSRCs.findIndex(child => child.dsrcId === dsrcId);
    if (dsrcIndex >= 0) {
      collection.childDSRCs[dsrcIndex].weight = weight;
    }
  });
  
  // Set distribution type to WEIGHTED if not already
  if (collection.distributionType !== 'WEIGHTED') {
    collection.distributionType = 'WEIGHTED';
  }
  
  return collection.save();
};

collectionSchema.statics.recordRevenue = async function(collectionId, amount, source = 'external') {
  const collection = await this.findOne({ collectionId });
  if (!collection) {
    throw new Error('Collection not found');
  }
  
  // Update earnings
  collection.earnings.totalReceived += amount;
  collection.earnings.pendingDistribution += amount;
  
  return collection.save();
};

collectionSchema.statics.recordDistribution = async function(collectionId, distributionData) {
  const collection = await this.findOne({ collectionId });
  if (!collection) {
    throw new Error('Collection not found');
  }
  
  const { amount, dsrcs, transactionHash } = distributionData;
  
  // Update earnings
  collection.earnings.totalDistributed += amount;
  collection.earnings.pendingDistribution -= amount;
  
  // Record distribution
  collection.distributions.push({
    timestamp: new Date(),
    amount,
    dsrcs,
    transactionHash
  });
  
  return collection.save();
};

collectionSchema.statics.updateContractAddress = async function(collectionId, contractAddress, onChainId, transactionHash) {
  const collection = await this.findOne({ collectionId });
  if (!collection) {
    throw new Error('Collection not found');
  }
  
  collection.contractAddress = contractAddress.toLowerCase();
  collection.onChainId = onChainId;
  collection.transactionHash = transactionHash;
  
  return collection.save();
};

collectionSchema.statics.updateDSRCAuthorization = async function(collectionId, dsrcId, isAuthorized) {
  const collection = await this.findOne({ collectionId });
  if (!collection) {
    throw new Error('Collection not found');
  }
  
  const dsrcIndex = collection.childDSRCs.findIndex(child => child.dsrcId === dsrcId);
  if (dsrcIndex < 0) {
    throw new Error('DSRC not found in collection');
  }
  
  collection.childDSRCs[dsrcIndex].isAuthorized = isAuthorized;
  
  return collection.save();
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
    isPublished: true,
    isActive: true
  })
  .sort({ 'earnings.totalReceived': -1 })
  .limit(limit)
  .select('-__v');
};

collectionSchema.statics.getCollectionsByDSRC = async function(dsrcId) {
  return this.find({ 'childDSRCs.dsrcId': dsrcId })
    .sort({ createdAt: -1 })
    .select('-__v');
};

// Create the model
const Collection = mongoose.model('Collection', collectionSchema);

export default Collection;
