import mongoose from 'mongoose';

const snipSchema = new mongoose.Schema({
  // Basic snip information
  snipId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  creator: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    trim: true
  },
  
  // Content references
  contentType: {
    type: String,
    enum: ['video', 'audio', 'image', 'mixed'],
    default: 'video',
    required: true
  },
  mediaUrl: {
    type: String,
    required: true
  },
  thumbnailUrl: String,
  duration: {
    type: Number, // in seconds
    required: true,
    min: 1,
    max: 60 // Max 1 minute for snips
  },
  
  // DSRC reference (if this snip is based on a DSRC)
  referencedContent: {
    dsrcId: String,
    collectionId: String,
    uploadHash: String,
    startTime: Number, // timestamp in seconds where the snip starts in the original content
    endTime: Number, // timestamp in seconds where the snip ends
    isOriginalCreator: Boolean // whether the snip creator is also the DSRC creator
  },
  
  // Hashtags and discovery
  hashtags: {
    type: [String],
    index: true,
    default: []
  },
  
  // Engagement metrics
  views: {
    type: Number,
    default: 0,
    index: true
  },
  uniqueViewers: {
    type: Number,
    default: 0
  },
  completionRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  likes: {
    type: Number,
    default: 0,
    index: true
  },
  comments: {
    type: Number,
    default: 0
  },
  shares: {
    type: Number,
    default: 0
  },
  tips: {
    count: {
      type: Number,
      default: 0
    },
    amount: {
      type: Number,
      default: 0
    }
  },
  
  // Algorithm scoring
  engagementScore: {
    type: Number,
    default: 0,
    index: true
  },
  viralityScore: {
    type: Number,
    default: 0,
    index: true
  },
  qualityScore: {
    type: Number,
    default: 50, // 0-100 scale
    index: true
  },
  
  // Trending metrics
  trendingScore: {
    type: Number,
    default: 0,
    index: true
  },
  trendingRank: Number,
  peakTrendingRank: Number,
  
  // Viewer demographics (aggregated)
  demographics: {
    ageGroups: {
      under18: { type: Number, default: 0 },
      age18to24: { type: Number, default: 0 },
      age25to34: { type: Number, default: 0 },
      age35to44: { type: Number, default: 0 },
      age45plus: { type: Number, default: 0 }
    },
    genders: {
      male: { type: Number, default: 0 },
      female: { type: Number, default: 0 },
      nonBinary: { type: Number, default: 0 },
      other: { type: Number, default: 0 }
    },
    topCountries: [{
      country: String,
      count: Number
    }]
  },
  
  // Geographic data
  geographicViews: {
    type: Map,
    of: Number,
    default: {}
  },
  
  // Viewer retention data
  retentionGraph: [{
    secondMark: Number,
    viewerPercentage: Number
  }],
  
  // Livestream specific fields
  isLivestream: {
    type: Boolean,
    default: false,
    index: true
  },
  livestreamStatus: {
    type: String,
    enum: ['scheduled', 'live', 'ended', 'archived', 'deleted'],
    default: 'scheduled'
  },
  scheduledStartTime: Date,
  actualStartTime: Date,
  endTime: Date,
  peakConcurrentViewers: {
    type: Number,
    default: 0
  },
  totalUniqueViewers: {
    type: Number,
    default: 0
  },
  livestreamSettings: {
    allowComments: {
      type: Boolean,
      default: true
    },
    allowTips: {
      type: Boolean,
      default: true
    },
    isPrivate: {
      type: Boolean,
      default: false
    },
    allowedViewers: [String], // wallet addresses
    chatModeration: {
      type: String,
      enum: ['none', 'basic', 'strict'],
      default: 'basic'
    },
    autoRecord: {
      type: Boolean,
      default: true
    }
  },
  
  // Content moderation
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'flagged', 'rejected'],
    default: 'pending',
    index: true
  },
  moderationReason: String,
  moderatedBy: String,
  moderatedAt: Date,
  
  // Visibility and access control
  visibility: {
    type: String,
    enum: ['public', 'unlisted', 'private', 'followers_only'],
    default: 'public',
    index: true
  },
  isAgeRestricted: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Cross-platform sharing
  sharingEnabled: {
    type: Boolean,
    default: true
  },
  embedCode: String,
  externalShares: [{
    platform: {
      type: String,
      enum: ['twitter', 'instagram', 'tiktok', 'facebook', 'discord', 'other']
    },
    shareUrl: String,
    shareCount: {
      type: Number,
      default: 0
    },
    lastShared: Date
  }],
  
  // Viewer tracking for unique count calculation
  viewers: [{
    walletAddress: {
      type: String,
      required: true,
      lowercase: true
    },
    firstViewedAt: {
      type: Date,
      default: Date.now
    },
    lastViewedAt: {
      type: Date,
      default: Date.now
    },
    viewCount: {
      type: Number,
      default: 1
    },
    averageWatchPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    completions: {
      type: Number,
      default: 0
    },
    country: String,
    city: String,
    deviceType: String
  }],
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'processing', 'published', 'archived', 'deleted'],
    default: 'draft',
    index: true
  },
  
  // Creation and publishing info
  publishedAt: {
    type: Date,
    index: true
  },
  
  // Technical metadata
  encoding: {
    videoCodec: String,
    audioCodec: String,
    bitrate: Number,
    resolution: String,
    fps: Number
  },
  fileSize: Number,
  processingStatus: {
    type: String,
    enum: ['queued', 'processing', 'completed', 'failed'],
    default: 'queued'
  },
  processingError: String,
  
  // Analytics tracking periods
  analyticsSnapshots: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    views: Number,
    likes: Number,
    comments: Number,
    shares: Number,
    engagementScore: Number,
    trendingScore: Number
  }]
}, {
  timestamps: true
});

// Indexes for performance
snipSchema.index({ creator: 1, createdAt: -1 });
snipSchema.index({ createdAt: -1 });
snipSchema.index({ publishedAt: -1 });
snipSchema.index({ 'referencedContent.dsrcId': 1 });
snipSchema.index({ 'viewers.walletAddress': 1 });
snipSchema.index({ hashtags: 1, trendingScore: -1 });
snipSchema.index({ isLivestream: 1, livestreamStatus: 1 });
snipSchema.index({ 
  visibility: 1, 
  moderationStatus: 1, 
  status: 1, 
  trendingScore: -1 
});
snipSchema.index({ title: 'text', description: 'text' });

// Static methods

// Create a new snip
snipSchema.statics.createSnip = async function(snipData) {
  const {
    creator,
    title,
    description,
    contentType,
    mediaUrl,
    thumbnailUrl,
    duration,
    referencedContent,
    hashtags,
    visibility,
    isLivestream,
    scheduledStartTime,
    livestreamSettings
  } = snipData;
  
  // Generate snip ID
  const snipId = `snip_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  
  // Create new snip
  const newSnip = new this({
    snipId,
    creator,
    title,
    description,
    contentType,
    mediaUrl: mediaUrl || '',
    thumbnailUrl,
    duration: duration || 0,
    status: 'draft'
  });
  
  // Set referenced content if provided
  if (referencedContent && referencedContent.dsrcId) {
    newSnip.referencedContent = referencedContent;
  }
  
  // Set hashtags if provided
  if (hashtags && Array.isArray(hashtags)) {
    newSnip.hashtags = hashtags;
  }
  
  // Set visibility if provided
  if (visibility) {
    newSnip.visibility = visibility;
  }
  
  // Set livestream data if this is a livestream
  if (isLivestream) {
    newSnip.isLivestream = true;
    newSnip.livestreamStatus = 'scheduled';
    newSnip.scheduledStartTime = scheduledStartTime || new Date();
    
    if (livestreamSettings) {
      newSnip.livestreamSettings = {
        ...newSnip.livestreamSettings,
        ...livestreamSettings
      };
    }
  }
  
  // Generate embed code
  newSnip.embedCode = `<iframe src="https://app.hitmakr.io/embed/snip/${snipId}" width="300" height="500" frameborder="0" allow="autoplay; encrypted-media"></iframe>`;
  
  return newSnip.save();
};

// Publish a snip
snipSchema.statics.publishSnip = async function(snipId, publishData = {}) {
  const snip = await this.findOne({ snipId });
  if (!snip) {
    throw new Error('Snip not found');
  }
  
  if (snip.status !== 'draft' && snip.status !== 'processing') {
    throw new Error('Only draft or processing snips can be published');
  }
  
  // Update snip with publish data
  const updateData = {
    status: 'published',
    publishedAt: new Date(),
    ...publishData
  };
  
  // For non-livestreams, ensure content is ready
  if (!snip.isLivestream && snip.processingStatus !== 'completed') {
    throw new Error('Content processing must be completed before publishing');
  }
  
  // For livestreams, update status
  if (snip.isLivestream) {
    if (publishData.startNow) {
      updateData.livestreamStatus = 'live';
      updateData.actualStartTime = new Date();
    }
  }
  
  // Process hashtags if present
  if (snip.hashtags && snip.hashtags.length > 0) {
    try {
      // This would call the Hashtag model to record usage
      // We'll assume this is handled by a separate function or middleware
      // Hashtag.recordUsage(snip.hashtags, 'snip', snip.snipId);
    } catch (error) {
      console.error('Error recording hashtag usage:', error);
    }
  }
  
  // Update the snip
  return this.findOneAndUpdate(
    { snipId },
    { $set: updateData },
    { new: true }
  );
};

// Record a view
snipSchema.statics.recordView = async function(snipId, viewerData) {
  const {
    walletAddress,
    watchPercentage = 0,
    completed = false,
    country,
    city,
    deviceType
  } = viewerData;
  
  const snip = await this.findOne({ snipId });
  if (!snip) {
    throw new Error('Snip not found');
  }
  
  const now = new Date();
  
  // Update viewer data
  const viewerIndex = snip.viewers.findIndex(
    viewer => viewer.walletAddress === walletAddress
  );
  
  if (viewerIndex >= 0) {
    // Existing viewer
    const viewer = snip.viewers[viewerIndex];
    const totalWatchPercentage = (viewer.averageWatchPercentage * viewer.viewCount) + watchPercentage;
    const newViewCount = viewer.viewCount + 1;
    
    snip.viewers[viewerIndex] = {
      ...viewer,
      lastViewedAt: now,
      viewCount: newViewCount,
      averageWatchPercentage: totalWatchPercentage / newViewCount,
      completions: completed ? viewer.completions + 1 : viewer.completions,
      country: country || viewer.country,
      city: city || viewer.city,
      deviceType: deviceType || viewer.deviceType
    };
  } else {
    // New viewer
    snip.viewers.push({
      walletAddress,
      firstViewedAt: now,
      lastViewedAt: now,
      viewCount: 1,
      averageWatchPercentage: watchPercentage,
      completions: completed ? 1 : 0,
      country,
      city,
      deviceType
    });
    
    // Increment unique viewers
    snip.uniqueViewers += 1;
  }
  
  // Update geographic data if available
  if (country) {
    const countryViews = snip.geographicViews.get(country) || 0;
    snip.geographicViews.set(country, countryViews + 1);
    
    // Update top countries
    const countryIndex = snip.demographics.topCountries.findIndex(c => c.country === country);
    if (countryIndex >= 0) {
      snip.demographics.topCountries[countryIndex].count += 1;
    } else {
      snip.demographics.topCountries.push({
        country,
        count: 1
      });
      
      // Sort and limit top countries
      snip.demographics.topCountries.sort((a, b) => b.count - a.count);
      if (snip.demographics.topCountries.length > 10) {
        snip.demographics.topCountries = snip.demographics.topCountries.slice(0, 10);
      }
    }
  }
  
  // Update completion rate
  const totalCompletions = snip.viewers.reduce((sum, viewer) => sum + viewer.completions, 0);
  const totalViews = snip.views + 1;
  snip.completionRate = (totalCompletions / totalViews) * 100;
  
  // Update view count
  snip.views += 1;
  
  // For livestreams, track concurrent viewers
  if (snip.isLivestream && snip.livestreamStatus === 'live') {
    // This would require a separate tracking mechanism for active viewers
    // Simplified for this example
    if (snip.viewers.length > snip.peakConcurrentViewers) {
      snip.peakConcurrentViewers = snip.viewers.length;
    }
  }
  
  // Calculate engagement score
  await this.calculateEngagementScore(snip);
  
  // Take analytics snapshot every 100 views
  if (snip.views % 100 === 0) {
    snip.analyticsSnapshots.push({
      timestamp: now,
      views: snip.views,
      likes: snip.likes,
      comments: snip.comments,
      shares: snip.shares,
      engagementScore: snip.engagementScore,
      trendingScore: snip.trendingScore
    });
  }
  
  return snip.save();
};

// Record engagement (like, comment, share)
snipSchema.statics.recordEngagement = async function(snipId, engagementData) {
  const {
    type, // 'like', 'comment', 'share'
    walletAddress,
    platform, // for shares
    shareUrl // for shares
  } = engagementData;
  
  const snip = await this.findOne({ snipId });
  if (!snip) {
    throw new Error('Snip not found');
  }
  
  // Update engagement counts
  if (type === 'like') {
    snip.likes += 1;
  } else if (type === 'comment') {
    snip.comments += 1;
  } else if (type === 'share') {
    snip.shares += 1;
    
    // Track external share if platform provided
    if (platform) {
      const shareIndex = snip.externalShares.findIndex(s => s.platform === platform);
      if (shareIndex >= 0) {
        snip.externalShares[shareIndex].shareCount += 1;
        snip.externalShares[shareIndex].lastShared = new Date();
        if (shareUrl) {
          snip.externalShares[shareIndex].shareUrl = shareUrl;
        }
      } else {
        snip.externalShares.push({
          platform,
          shareUrl: shareUrl || '',
          shareCount: 1,
          lastShared: new Date()
        });
      }
    }
  }
  
  // Calculate engagement score
  await this.calculateEngagementScore(snip);
  
  return snip.save();
};

// Record tip
snipSchema.statics.recordTip = async function(snipId, tipData) {
  const {
    amount,
    walletAddress
  } = tipData;
  
  const snip = await this.findOne({ snipId });
  if (!snip) {
    throw new Error('Snip not found');
  }
  
  // Update tip counts
  snip.tips.count += 1;
  snip.tips.amount += amount;
  
  // Calculate engagement score
  await this.calculateEngagementScore(snip);
  
  return snip.save();
};

// Calculate engagement score
snipSchema.statics.calculateEngagementScore = async function(snip) {
  // Weight factors
  const weights = {
    views: 1,
    uniqueViewers: 2,
    completionRate: 3,
    likes: 4,
    comments: 5,
    shares: 6,
    tips: 7
  };
  
  // Calculate base engagement score
  const viewScore = Math.min(snip.views / 100, 10) * weights.views;
  const uniqueViewerScore = Math.min(snip.uniqueViewers / 50, 10) * weights.uniqueViewers;
  const completionScore = (snip.completionRate / 10) * weights.completionRate;
  const likeScore = Math.min(snip.likes / 20, 10) * weights.likes;
  const commentScore = Math.min(snip.comments / 10, 10) * weights.comments;
  const shareScore = Math.min(snip.shares / 5, 10) * weights.shares;
  const tipScore = Math.min((snip.tips.count / 2) + (snip.tips.amount / 100), 10) * weights.tips;
  
  // Calculate total score
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  const totalScore = (viewScore + uniqueViewerScore + completionScore + likeScore + commentScore + shareScore + tipScore) / totalWeight;
  
  // Scale to 0-100
  snip.engagementScore = Math.min(100, totalScore * 10);
  
  // Calculate virality score (based on share velocity)
  const daysSincePublish = snip.publishedAt ? 
    Math.max(1, (new Date() - snip.publishedAt) / (1000 * 60 * 60 * 24)) : 1;
  
  const shareVelocity = snip.shares / daysSincePublish;
  const commentVelocity = snip.comments / daysSincePublish;
  
  snip.viralityScore = Math.min(100, (shareVelocity * 5) + (commentVelocity * 2));
  
  // Calculate trending score (combination of engagement and virality)
  snip.trendingScore = (snip.engagementScore * 0.7) + (snip.viralityScore * 0.3);
  
  return snip;
};

// Get trending snips
snipSchema.statics.getTrendingSnips = async function(options = {}) {
  const {
    limit = 20,
    offset = 0,
    contentType,
    excludeLivestreams = false,
    onlyLivestreams = false,
    hashtag,
    creator,
    minQuality = 0
  } = options;
  
  // Build query
  const query = {
    status: 'published',
    visibility: 'public',
    moderationStatus: 'approved',
    qualityScore: { $gte: minQuality }
  };
  
  if (contentType) {
    query.contentType = contentType;
  }
  
  if (excludeLivestreams) {
    query.isLivestream = false;
  }
  
  if (onlyLivestreams) {
    query.isLivestream = true;
    query.livestreamStatus = 'live';
  }
  
  if (hashtag) {
    query.hashtags = hashtag;
  }
  
  if (creator) {
    query.creator = creator;
  }
  
  // Get trending snips
  const snips = await this.find(query)
    .sort({ trendingScore: -1 })
    .skip(offset)
    .limit(limit)
    .select('snipId title thumbnailUrl duration creator contentType views likes comments shares trendingScore isLivestream publishedAt');
  
  // Get total count
  const totalCount = await this.countDocuments(query);
  
  return {
    snips,
    totalCount,
    hasMore: offset + snips.length < totalCount
  };
};

// Get for you feed
snipSchema.statics.getForYouFeed = async function(walletAddress, options = {}) {
  const {
    limit = 20,
    offset = 0,
    contentTypes = ['video', 'audio', 'image', 'mixed'],
    excludeWatched = false,
    preferredHashtags = [],
    preferredCreators = []
  } = options;
  
  // Build base query
  const query = {
    status: 'published',
    visibility: 'public',
    moderationStatus: 'approved'
  };
  
  if (contentTypes.length > 0 && contentTypes.length < 4) {
    query.contentType = { $in: contentTypes };
  }
  
  // Exclude already watched snips if requested
  if (excludeWatched) {
    query['viewers.walletAddress'] = { $ne: walletAddress };
  }
  
  // Create aggregation pipeline
  const pipeline = [
    { $match: query },
    { $addFields: {
      // Boost score for preferred hashtags and creators
      boostScore: {
        $add: [
          { $cond: [
            { $in: ['$creator', preferredCreators] },
            20, // Boost for preferred creators
            0
          ]},
          { $multiply: [
            { $size: { $setIntersection: ['$hashtags', preferredHashtags] } },
            5 // 5 points per matching hashtag
          ]}
        ]
      }
    }},
    { $addFields: {
      // Combine trending score with boost score
      personalizedScore: { $add: ['$trendingScore', '$boostScore'] }
    }},
    { $sort: { personalizedScore: -1 } },
    { $skip: offset },
    { $limit: limit },
    { $project: {
      snipId: 1,
      title: 1,
      thumbnailUrl: 1,
      duration: 1,
      creator: 1,
      contentType: 1,
      views: 1,
      likes: 1,
      comments: 1,
      shares: 1,
      trendingScore: 1,
      isLivestream: 1,
      publishedAt: 1,
      hashtags: 1,
      boostScore: 1,
      personalizedScore: 1
    }}
  ];
  
  // Execute aggregation
  const snips = await this.aggregate(pipeline);
  
  // Get total count (simplified for performance)
  const totalCount = await this.countDocuments(query);
  
  return {
    snips,
    totalCount,
    hasMore: offset + snips.length < totalCount
  };
};

// Get live streams
snipSchema.statics.getLiveStreams = async function(options = {}) {
  const {
    limit = 20,
    offset = 0,
    sortBy = 'viewers', // 'viewers', 'recent', 'trending'
    creator,
    hashtag
  } = options;
  
  // Build query
  const query = {
    status: 'published',
    visibility: 'public',
    moderationStatus: 'approved',
    isLivestream: true,
    livestreamStatus: 'live'
  };
  
  if (creator) {
    query.creator = creator;
  }
  
  if (hashtag) {
    query.hashtags = hashtag;
  }
  
  // Determine sort order
  let sortOption = {};
  if (sortBy === 'viewers') {
    sortOption = { peakConcurrentViewers: -1 };
  } else if (sortBy === 'recent') {
    sortOption = { actualStartTime: -1 };
  } else if (sortBy === 'trending') {
    sortOption = { trendingScore: -1 };
  }
  
  // Get live streams
  const livestreams = await this.find(query)
    .sort(sortOption)
    .skip(offset)
    .limit(limit)
    .select('snipId title thumbnailUrl creator actualStartTime peakConcurrentViewers totalUniqueViewers trendingScore');
  
  // Get total count
  const totalCount = await this.countDocuments(query);
  
  return {
    livestreams,
    totalCount,
    hasMore: offset + livestreams.length < totalCount
  };
};

// Start livestream
snipSchema.statics.startLivestream = async function(snipId, startData = {}) {
  const snip = await this.findOne({ snipId });
  if (!snip) {
    throw new Error('Snip not found');
  }
  
  if (!snip.isLivestream) {
    throw new Error('This snip is not configured as a livestream');
  }
  
  if (snip.livestreamStatus !== 'scheduled') {
    throw new Error(`Cannot start livestream with status: ${snip.livestreamStatus}`);
  }
  
  // Update livestream status
  const updateData = {
    livestreamStatus: 'live',
    actualStartTime: new Date(),
    status: 'published',
    publishedAt: new Date(),
    ...startData
  };
  
  // Update the snip
  return this.findOneAndUpdate(
    { snipId },
    { $set: updateData },
    { new: true }
  );
};

// End livestream
snipSchema.statics.endLivestream = async function(snipId, endData = {}) {
  const snip = await this.findOne({ snipId });
  if (!snip) {
    throw new Error('Snip not found');
  }
  
  if (!snip.isLivestream) {
    throw new Error('This snip is not configured as a livestream');
  }
  
  if (snip.livestreamStatus !== 'live') {
    throw new Error(`Cannot end livestream with status: ${snip.livestreamStatus}`);
  }
  
  // Update livestream status
  const updateData = {
    livestreamStatus: 'ended',
    endTime: new Date(),
    ...endData
  };
  
  // If auto-record is enabled, set processing status
  if (snip.livestreamSettings.autoRecord) {
    updateData.processingStatus = 'processing';
  }
  
  // Update the snip
  return this.findOneAndUpdate(
    { snipId },
    { $set: updateData },
    { new: true }
  );
};

// Archive livestream
snipSchema.statics.archiveLivestream = async function(snipId, archiveData = {}) {
  const snip = await this.findOne({ snipId });
  if (!snip) {
    throw new Error('Snip not found');
  }
  
  if (!snip.isLivestream) {
    throw new Error('This snip is not configured as a livestream');
  }
  
  if (snip.livestreamStatus !== 'ended') {
    throw new Error(`Cannot archive livestream with status: ${snip.livestreamStatus}`);
  }
  
  // Update livestream status
  const updateData = {
    livestreamStatus: 'archived',
    ...archiveData
  };
  
  // Update the snip
  return this.findOneAndUpdate(
    { snipId },
    { $set: updateData },
    { new: true }
  );
};

// Moderate a snip
snipSchema.statics.moderateSnip = async function(snipId, moderationData) {
  const {
    moderationStatus,
    moderationReason,
    moderatedBy
  } = moderationData;
  
  const snip = await this.findOne({ snipId });
  if (!snip) {
    throw new Error('Snip not found');
  }
  
  // Update moderation status
  const updateData = {
    moderationStatus,
    moderationReason,
    moderatedBy,
    moderatedAt: new Date()
  };
  
  // If rejecting, update status
  if (moderationStatus === 'rejected') {
    updateData.status = 'archived';
  }
  
  // Update the snip
  return this.findOneAndUpdate(
    { snipId },
    { $set: updateData },
    { new: true }
  );
};

// Get snips by DSRC
snipSchema.statics.getSnipsByDSRC = async function(dsrcId, options = {}) {
  const {
    limit = 20,
    offset = 0,
    sortBy = 'trending' // 'trending', 'recent', 'popular'
  } = options;
  
  // Build query
  const query = {
    status: 'published',
    visibility: 'public',
    moderationStatus: 'approved',
    'referencedContent.dsrcId': dsrcId
  };
  
  // Determine sort order
  let sortOption = {};
  if (sortBy === 'trending') {
    sortOption = { trendingScore: -1 };
  } else if (sortBy === 'recent') {
    sortOption = { publishedAt: -1 };
  } else if (sortBy === 'popular') {
    sortOption = { views: -1 };
  }
  
  // Get snips
  const snips = await this.find(query)
    .sort(sortOption)
    .skip(offset)
    .limit(limit)
    .select('snipId title thumbnailUrl duration creator contentType views likes comments shares trendingScore publishedAt');
  
  // Get total count
  const totalCount = await this.countDocuments(query);
  
  return {
    snips,
    totalCount,
    hasMore: offset + snips.length < totalCount
  };
};

// Get creator stats
snipSchema.statics.getCreatorStats = async function(creator) {
  // Get basic stats
  const stats = await this.aggregate([
    { $match: { creator } },
    { $group: {
      _id: null,
      totalSnips: { $sum: 1 },
      totalViews: { $sum: '$views' },
      totalLikes: { $sum: '$likes' },
      totalComments: { $sum: '$comments' },
      totalShares: { $sum: '$shares' },
      totalTipCount: { $sum: '$tips.count' },
      totalTipAmount: { $sum: '$tips.amount' },
      avgEngagementScore: { $avg: '$engagementScore' },
      avgCompletionRate: { $avg: '$completionRate' }
    }}
  ]);
  
  // Get top performing snips
  const topSnips = await this.find({ creator })
    .sort({ views: -1 })
    .limit(5)
    .select('snipId title thumbnailUrl views likes comments shares');
  
  // Get geographic distribution
  const geoStats = await this.aggregate([
    { $match: { creator } },
    { $unwind: '$demographics.topCountries' },
    { $group: {
      _id: '$demographics.topCountries.country',
      totalViews: { $sum: '$demographics.topCountries.count' }
    }},
    { $sort: { totalViews: -1 } },
    { $limit: 10 }
  ]);
  
  return {
    stats: stats[0] || {
      totalSnips: 0,
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      totalTipCount: 0,
      totalTipAmount: 0,
      avgEngagementScore: 0,
      avgCompletionRate: 0
    },
    topSnips,
    geoDistribution: geoStats.map(geo => ({
      country: geo._id,
      views: geo.totalViews
    }))
  };
};

// Create the model
const Snip = mongoose.models.Snip || mongoose.model('Snip', snipSchema);

export default Snip;
