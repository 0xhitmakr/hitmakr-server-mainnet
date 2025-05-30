import mongoose from 'mongoose';

// Schema for version history entries
const hashtagVersionSchema = new mongoose.Schema({
  versionId: {
    type: String,
    required: true
  },
  tagName: {
    type: String,
    required: true
  },
  normalizedTag: {
    type: String,
    required: true
  },
  changedBy: {
    type: String,
    required: true,
    lowercase: true
  },
  changeType: {
    type: String,
    enum: ['created', 'updated', 'merged', 'split', 'categorized', 'moderated'],
    default: 'created'
  },
  previousVersion: String,
  changeReason: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Main hashtag schema
const hashtagSchema = new mongoose.Schema({
  // Basic tag information
  tagName: {
    type: String,
    required: true,
    index: true
  },
  normalizedTag: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Categorization
  category: {
    type: String,
    enum: ['genre', 'mood', 'instrument', 'technique', 'location', 'event', 'artist', 'era', 'theme', 'other'],
    default: 'other',
    index: true
  },
  
  // Related tags and synonyms
  relatedTags: [{
    type: String,
    index: true
  }],
  synonyms: [{
    type: String,
    index: true
  }],
  
  // Usage statistics
  usageCount: {
    type: Number,
    default: 0,
    index: true
  },
  dsrcCount: {
    type: Number,
    default: 0
  },
  collectionCount: {
    type: Number,
    default: 0
  },
  snipCount: {
    type: Number,
    default: 0
  },
  
  // Quality and engagement metrics
  qualityScore: {
    type: Number,
    default: 50, // 0-100 scale
    index: true
  },
  engagementScore: {
    type: Number,
    default: 0,
    index: true
  },
  
  // Trending metrics
  trendingScore: {
    type: Number,
    default: 0,
    index: true
  },
  weeklyGrowth: {
    type: Number,
    default: 0
  },
  
  // Weekly usage tracking (for trending calculation)
  weeklyUsage: [{
    week: {
      type: Date, // Start of week
      required: true
    },
    count: {
      type: Number,
      default: 0
    }
  }],
  
  // Content association metrics
  associatedContent: {
    topDSRCs: [{
      dsrcId: String,
      score: Number
    }],
    topCollections: [{
      collectionId: String,
      score: Number
    }],
    topArtists: [{
      walletAddress: String,
      score: Number
    }]
  },
  
  // Moderation status
  moderationStatus: {
    type: String,
    enum: ['approved', 'pending', 'flagged', 'rejected'],
    default: 'approved',
    index: true
  },
  moderationReason: String,
  moderatedBy: String,
  moderatedAt: Date,
  
  // Spam detection
  spamScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  isSpam: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Discovery feed eligibility
  discoveryFeedEligible: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Rate limiting
  lastEdited: {
    type: Date,
    default: Date.now
  },
  editCount: {
    type: Number,
    default: 0
  },
  
  // Version history
  currentVersionId: {
    type: String,
    required: true
  },
  versionHistory: [hashtagVersionSchema],
  
  // Creation info
  createdBy: {
    type: String,
    lowercase: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for performance
hashtagSchema.index({ tagName: 'text' });
hashtagSchema.index({ trendingScore: -1, createdAt: -1 });
hashtagSchema.index({ qualityScore: -1, usageCount: -1 });
hashtagSchema.index({ category: 1, trendingScore: -1 });
hashtagSchema.index({ moderationStatus: 1, discoveryFeedEligible: 1 });
hashtagSchema.index({ 'weeklyUsage.week': 1 });

// Static methods

// Create a new hashtag
hashtagSchema.statics.createHashtag = async function(tagData) {
  const { tagName, category, createdBy } = tagData;
  
  // Normalize tag (lowercase, remove special chars except for #)
  const normalizedTag = this.normalizeTag(tagName);
  
  // Check if tag already exists
  const existingTag = await this.findOne({ normalizedTag });
  if (existingTag) {
    return existingTag;
  }
  
  // Generate version ID
  const versionId = `v_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  
  // Create new hashtag
  const newHashtag = new this({
    tagName,
    normalizedTag,
    category: category || 'other',
    createdBy,
    currentVersionId: versionId,
    versionHistory: [{
      versionId,
      tagName,
      normalizedTag,
      changedBy: createdBy,
      changeType: 'created',
      timestamp: new Date()
    }]
  });
  
  return newHashtag.save();
};

// Update a hashtag
hashtagSchema.statics.updateHashtag = async function(normalizedTag, updateData, updatedBy) {
  const hashtag = await this.findOne({ normalizedTag });
  if (!hashtag) {
    throw new Error('Hashtag not found');
  }
  
  // Check rate limiting
  const now = new Date();
  const hoursSinceLastEdit = (now - hashtag.lastEdited) / (1000 * 60 * 60);
  
  if (hoursSinceLastEdit < 24 && hashtag.editCount >= 5) {
    throw new Error('Edit rate limit exceeded. Try again later.');
  }
  
  // Generate new version ID
  const versionId = `v_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  
  // Create version history entry
  const versionEntry = {
    versionId,
    tagName: updateData.tagName || hashtag.tagName,
    normalizedTag: updateData.tagName ? this.normalizeTag(updateData.tagName) : hashtag.normalizedTag,
    changedBy: updatedBy,
    changeType: 'updated',
    previousVersion: hashtag.currentVersionId,
    changeReason: updateData.changeReason || 'General update',
    timestamp: now
  };
  
  // Update fields
  const updateFields = {};
  
  if (updateData.tagName) {
    updateFields.tagName = updateData.tagName;
    updateFields.normalizedTag = this.normalizeTag(updateData.tagName);
  }
  
  if (updateData.category) {
    updateFields.category = updateData.category;
  }
  
  if (updateData.relatedTags) {
    updateFields.relatedTags = updateData.relatedTags;
  }
  
  if (updateData.synonyms) {
    updateFields.synonyms = updateData.synonyms;
  }
  
  // Update the hashtag
  const updatedHashtag = await this.findOneAndUpdate(
    { normalizedTag },
    {
      $set: {
        ...updateFields,
        currentVersionId: versionId,
        lastEdited: now,
        editCount: hashtag.editCount + 1
      },
      $push: {
        versionHistory: versionEntry
      }
    },
    { new: true }
  );
  
  return updatedHashtag;
};

// Record usage of a hashtag
hashtagSchema.statics.recordUsage = async function(tagNames, contentType, contentId) {
  if (!Array.isArray(tagNames)) {
    tagNames = [tagNames];
  }
  
  const normalizedTags = tagNames.map(tag => this.normalizeTag(tag));
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
  startOfWeek.setHours(0, 0, 0, 0);
  
  const updates = [];
  
  for (const normalizedTag of normalizedTags) {
    // Find or create the hashtag
    let hashtag = await this.findOne({ normalizedTag });
    
    if (!hashtag) {
      // Auto-create if not exists
      hashtag = await this.createHashtag({
        tagName: normalizedTag,
        createdBy: 'system_auto'
      });
    }
    
    // Prepare update based on content type
    const updateQuery = {
      $inc: {
        usageCount: 1
      }
    };
    
    if (contentType === 'dsrc') {
      updateQuery.$inc.dsrcCount = 1;
    } else if (contentType === 'collection') {
      updateQuery.$inc.collectionCount = 1;
    } else if (contentType === 'snip') {
      updateQuery.$inc.snipCount = 1;
    }
    
    // Update weekly usage
    const weeklyUsageIndex = hashtag.weeklyUsage.findIndex(
      week => week.week.toISOString().split('T')[0] === startOfWeek.toISOString().split('T')[0]
    );
    
    if (weeklyUsageIndex >= 0) {
      updateQuery.$inc[`weeklyUsage.${weeklyUsageIndex}.count`] = 1;
    } else {
      updateQuery.$push = {
        weeklyUsage: {
          week: startOfWeek,
          count: 1
        }
      };
    }
    
    // Execute update
    updates.push(
      this.findOneAndUpdate(
        { normalizedTag },
        updateQuery,
        { new: true }
      )
    );
  }
  
  return Promise.all(updates);
};

// Calculate trending score for all hashtags
hashtagSchema.statics.calculateTrendingScores = async function() {
  const now = new Date();
  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(now.getDate() - 7);
  
  // Get all hashtags with usage in the last week
  const hashtags = await this.find({
    'weeklyUsage.week': { $gte: oneWeekAgo }
  });
  
  const updates = [];
  
  for (const hashtag of hashtags) {
    // Calculate weekly growth
    const currentWeekUsage = hashtag.weeklyUsage
      .filter(week => week.week >= oneWeekAgo)
      .reduce((sum, week) => sum + week.count, 0);
    
    // Get previous week usage
    const twoWeeksAgo = new Date(oneWeekAgo);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 7);
    
    const previousWeekUsage = hashtag.weeklyUsage
      .filter(week => week.week >= twoWeeksAgo && week.week < oneWeekAgo)
      .reduce((sum, week) => sum + week.count, 0);
    
    // Calculate growth percentage
    let weeklyGrowth = 0;
    if (previousWeekUsage > 0) {
      weeklyGrowth = ((currentWeekUsage - previousWeekUsage) / previousWeekUsage) * 100;
    } else if (currentWeekUsage > 0) {
      weeklyGrowth = 100; // New tag with some usage
    }
    
    // Calculate trending score (weighted combination of current usage and growth)
    const trendingScore = (currentWeekUsage * 0.7) + (Math.min(weeklyGrowth, 1000) * 0.3);
    
    // Update hashtag
    updates.push(
      this.findByIdAndUpdate(
        hashtag._id,
        {
          $set: {
            trendingScore,
            weeklyGrowth
          }
        },
        { new: true }
      )
    );
  }
  
  return Promise.all(updates);
};

// Calculate quality score for a hashtag
hashtagSchema.statics.calculateQualityScore = async function(normalizedTag) {
  const hashtag = await this.findOne({ normalizedTag });
  if (!hashtag) {
    throw new Error('Hashtag not found');
  }
  
  // Factors affecting quality score:
  // 1. Usage count (more usage = higher quality)
  // 2. Spam score (higher spam = lower quality)
  // 3. Engagement with associated content
  // 4. Consistency of usage context
  
  // Simplified calculation for now
  const usageScore = Math.min(hashtag.usageCount / 100, 50); // Max 50 points from usage
  const spamPenalty = hashtag.spamScore * 0.5; // Up to 50 points penalty
  
  // Calculate quality score
  const qualityScore = Math.max(0, Math.min(100, usageScore + 50 - spamPenalty));
  
  // Update hashtag
  return this.findOneAndUpdate(
    { normalizedTag },
    {
      $set: {
        qualityScore
      }
    },
    { new: true }
  );
};

// Get trending hashtags
hashtagSchema.statics.getTrendingHashtags = async function(options = {}) {
  const {
    limit = 20,
    category = null,
    minQuality = 0,
    excludeSpam = true
  } = options;
  
  const query = {
    discoveryFeedEligible: true,
    qualityScore: { $gte: minQuality }
  };
  
  if (excludeSpam) {
    query.isSpam = false;
  }
  
  if (category) {
    query.category = category;
  }
  
  return this.find(query)
    .sort({ trendingScore: -1 })
    .limit(limit)
    .select('tagName normalizedTag category usageCount trendingScore qualityScore');
};

// Search hashtags
hashtagSchema.statics.searchHashtags = async function(searchTerm, options = {}) {
  const {
    limit = 20,
    minQuality = 0,
    excludeSpam = true
  } = options;
  
  const normalizedSearch = this.normalizeTag(searchTerm);
  
  const query = {
    $or: [
      { normalizedTag: { $regex: normalizedSearch, $options: 'i' } },
      { synonyms: { $regex: normalizedSearch, $options: 'i' } }
    ],
    qualityScore: { $gte: minQuality }
  };
  
  if (excludeSpam) {
    query.isSpam = false;
  }
  
  return this.find(query)
    .sort({ usageCount: -1, qualityScore: -1 })
    .limit(limit)
    .select('tagName normalizedTag category usageCount trendingScore qualityScore');
};

// Get related hashtags
hashtagSchema.statics.getRelatedHashtags = async function(normalizedTag, limit = 10) {
  const hashtag = await this.findOne({ normalizedTag });
  if (!hashtag) {
    throw new Error('Hashtag not found');
  }
  
  // First get explicitly related tags
  let relatedTags = [];
  if (hashtag.relatedTags && hashtag.relatedTags.length > 0) {
    const explicitlyRelated = await this.find({
      normalizedTag: { $in: hashtag.relatedTags }
    })
    .sort({ usageCount: -1 })
    .limit(limit)
    .select('tagName normalizedTag category usageCount');
    
    relatedTags = [...explicitlyRelated];
  }
  
  // If we need more, find co-occurring tags
  if (relatedTags.length < limit) {
    // This would require a more complex query in a production system
    // Simplified version for now
    const additionalTags = await this.find({
      normalizedTag: { $ne: normalizedTag },
      category: hashtag.category,
      isSpam: false
    })
    .sort({ usageCount: -1 })
    .limit(limit - relatedTags.length)
    .select('tagName normalizedTag category usageCount');
    
    relatedTags = [...relatedTags, ...additionalTags];
  }
  
  return relatedTags;
};

// Flag a hashtag as spam
hashtagSchema.statics.flagAsSpam = async function(normalizedTag, reportedBy, reason) {
  const hashtag = await this.findOne({ normalizedTag });
  if (!hashtag) {
    throw new Error('Hashtag not found');
  }
  
  // Increase spam score
  const newSpamScore = Math.min(100, hashtag.spamScore + 25);
  const isSpam = newSpamScore >= 75;
  
  // Generate version ID for moderation action
  const versionId = `v_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  
  // Create version history entry
  const versionEntry = {
    versionId,
    tagName: hashtag.tagName,
    normalizedTag: hashtag.normalizedTag,
    changedBy: reportedBy,
    changeType: 'moderated',
    previousVersion: hashtag.currentVersionId,
    changeReason: reason || 'Flagged as spam',
    timestamp: new Date()
  };
  
  // Update the hashtag
  return this.findOneAndUpdate(
    { normalizedTag },
    {
      $set: {
        spamScore: newSpamScore,
        isSpam,
        moderationStatus: isSpam ? 'flagged' : hashtag.moderationStatus,
        discoveryFeedEligible: !isSpam && hashtag.discoveryFeedEligible,
        currentVersionId: versionId
      },
      $push: {
        versionHistory: versionEntry
      }
    },
    { new: true }
  );
};

// Moderate a hashtag
hashtagSchema.statics.moderateHashtag = async function(normalizedTag, moderationData) {
  const {
    moderationStatus,
    moderationReason,
    moderatedBy,
    discoveryFeedEligible
  } = moderationData;
  
  const hashtag = await this.findOne({ normalizedTag });
  if (!hashtag) {
    throw new Error('Hashtag not found');
  }
  
  // Generate version ID for moderation action
  const versionId = `v_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  
  // Create version history entry
  const versionEntry = {
    versionId,
    tagName: hashtag.tagName,
    normalizedTag: hashtag.normalizedTag,
    changedBy: moderatedBy,
    changeType: 'moderated',
    previousVersion: hashtag.currentVersionId,
    changeReason: moderationReason || 'Moderation action',
    timestamp: new Date()
  };
  
  // Update the hashtag
  return this.findOneAndUpdate(
    { normalizedTag },
    {
      $set: {
        moderationStatus,
        moderationReason,
        moderatedBy,
        moderatedAt: new Date(),
        discoveryFeedEligible: discoveryFeedEligible !== undefined ? discoveryFeedEligible : hashtag.discoveryFeedEligible,
        currentVersionId: versionId
      },
      $push: {
        versionHistory: versionEntry
      }
    },
    { new: true }
  );
};

// Get hashtag statistics
hashtagSchema.statics.getHashtagStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalHashtags: { $sum: 1 },
        totalUsage: { $sum: '$usageCount' },
        averageQuality: { $avg: '$qualityScore' },
        spamCount: { 
          $sum: { 
            $cond: [{ $eq: ['$isSpam', true] }, 1, 0] 
          } 
        },
        byCategory: {
          $push: {
            category: '$category',
            count: 1
          }
        }
      }
    }
  ]);
  
  if (stats.length === 0) {
    return {
      totalHashtags: 0,
      totalUsage: 0,
      averageQuality: 0,
      spamCount: 0,
      categoryCounts: {}
    };
  }
  
  // Process category counts
  const categoryCounts = {};
  stats[0].byCategory.forEach(item => {
    if (!categoryCounts[item.category]) {
      categoryCounts[item.category] = 0;
    }
    categoryCounts[item.category] += item.count;
  });
  
  return {
    totalHashtags: stats[0].totalHashtags,
    totalUsage: stats[0].totalUsage,
    averageQuality: stats[0].averageQuality,
    spamCount: stats[0].spamCount,
    categoryCounts
  };
};

// Get hashtags by DSRC
hashtagSchema.statics.getHashtagsByContent = async function(contentType, contentId) {
  // In a production system, this would query a separate collection that tracks
  // the relationship between content and hashtags
  // This is a simplified placeholder
  return this.find({
    [`associated${contentType.charAt(0).toUpperCase() + contentType.slice(1)}s`]: contentId
  })
  .sort({ usageCount: -1 })
  .select('tagName normalizedTag category usageCount');
};

// Normalize a tag name
hashtagSchema.statics.normalizeTag = function(tagName) {
  // Remove # prefix if present
  let normalized = tagName.startsWith('#') ? tagName.substring(1) : tagName;
  
  // Convert to lowercase and remove special characters
  normalized = normalized.toLowerCase().replace(/[^\w]/g, '');
  
  return normalized;
};

// Cleanup old weekly usage data
hashtagSchema.statics.cleanupWeeklyUsageData = async function() {
  const now = new Date();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(now.getMonth() - 3);
  
  const hashtags = await this.find({
    'weeklyUsage.week': { $lt: threeMonthsAgo }
  });
  
  const updates = [];
  
  for (const hashtag of hashtags) {
    // Filter out old weekly usage data
    const updatedWeeklyUsage = hashtag.weeklyUsage.filter(
      week => week.week >= threeMonthsAgo
    );
    
    updates.push(
      this.findByIdAndUpdate(
        hashtag._id,
        {
          $set: {
            weeklyUsage: updatedWeeklyUsage
          }
        }
      )
    );
  }
  
  return Promise.all(updates);
};

// Create the model
const Hashtag = mongoose.models.Hashtag || mongoose.model('Hashtag', hashtagSchema);

export default Hashtag;
