import mongoose from 'mongoose';

const streamingStatsSchema = new mongoose.Schema({
  // DSRC reference
  dsrcId: {
    type: String,
    required: true,
    index: true
  },
  
  // Collection reference (if part of a collection)
  collectionId: {
    type: String,
    index: true
  },
  
  // Theme configuration
  theme: {
    type: String,
    enum: ['Forge', 'Elysium', 'Default'],
    default: 'Default',
    required: true
  },
  
  // Evolution level (0-100)
  evolutionLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Theme-specific metadata
  themeMetadata: {
    // Forge theme - wear-based progression
    wearCount: {
      type: Number,
      default: 0
    },
    wearMilestones: [{
      level: Number,
      achieved: {
        type: Boolean,
        default: false
      },
      achievedAt: Date,
      visualEffect: String
    }],
    
    // Elysium theme - weather/time-based
    weatherData: {
      lastWeather: String,
      lastTemperature: Number,
      lastTimeOfDay: String,
      lastUpdated: Date,
      location: {
        latitude: Number,
        longitude: Number,
        country: String,
        city: String
      }
    },
    
    // Default theme - gradient progression
    gradientStage: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    }
  },
  
  // Play statistics
  totalPlays: {
    type: Number,
    default: 0
  },
  uniqueListeners: {
    type: Number,
    default: 0
  },
  
  // Listener tracking for unique count calculation
  listeners: [{
    walletAddress: {
      type: String,
      required: true,
      lowercase: true
    },
    firstListenedAt: {
      type: Date,
      default: Date.now
    },
    lastListenedAt: {
      type: Date,
      default: Date.now
    },
    playCount: {
      type: Number,
      default: 1
    }
  }],
  
  // Geographic play data
  geographicPlays: {
    type: Map,
    of: Number,
    default: {}
  },
  
  // Time-based play tracking (for heatmap visualization)
  playsByHour: {
    type: Map,
    of: Number,
    default: {}
  },
  
  // Daily play counts for trending calculation
  dailyPlays: [{
    date: {
      type: Date,
      required: true
    },
    count: {
      type: Number,
      default: 0
    }
  }],
  
  // Performance metrics
  completionRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  averagePlayTime: {
    type: Number,
    default: 0
  },
  skipRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Trending score (calculated field)
  trendingScore: {
    type: Number,
    default: 0
  },
  
  // Last updated timestamp
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for query optimization
streamingStatsSchema.index({ dsrcId: 1 }, { unique: true });
streamingStatsSchema.index({ collectionId: 1 });
streamingStatsSchema.index({ theme: 1 });
streamingStatsSchema.index({ evolutionLevel: 1 });
streamingStatsSchema.index({ totalPlays: -1 });
streamingStatsSchema.index({ trendingScore: -1 });
streamingStatsSchema.index({ createdAt: -1 });
streamingStatsSchema.index({ 'listeners.walletAddress': 1, dsrcId: 1 });
streamingStatsSchema.index({ 'dailyPlays.date': -1 });

// Static methods for updating stats
streamingStatsSchema.statics.recordPlay = async function(dsrcId, walletAddress, playData = {}) {
  const {
    playDuration = 0,
    completed = false,
    skipped = false,
    location = null,
    weather = null,
    collectionId = null
  } = playData;
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Find or create streaming stats
  let stats = await this.findOne({ dsrcId });
  
  if (!stats) {
    stats = new this({
      dsrcId,
      collectionId,
      createdAt: now
    });
  }
  
  // Update total plays
  stats.totalPlays += 1;
  
  // Update listener data
  const listenerIndex = stats.listeners.findIndex(
    listener => listener.walletAddress === walletAddress
  );
  
  if (listenerIndex >= 0) {
    // Existing listener
    stats.listeners[listenerIndex].lastListenedAt = now;
    stats.listeners[listenerIndex].playCount += 1;
  } else {
    // New listener
    stats.listeners.push({
      walletAddress,
      firstListenedAt: now,
      lastListenedAt: now,
      playCount: 1
    });
    stats.uniqueListeners += 1;
  }
  
  // Update geographic data if available
  if (location && location.country) {
    const countryCode = location.country;
    const currentCount = stats.geographicPlays.get(countryCode) || 0;
    stats.geographicPlays.set(countryCode, currentCount + 1);
  }
  
  // Update hourly play data
  const hourKey = now.getHours().toString().padStart(2, '0');
  const hourCount = stats.playsByHour.get(hourKey) || 0;
  stats.playsByHour.set(hourKey, hourCount + 1);
  
  // Update daily play counts
  const dailyPlayIndex = stats.dailyPlays.findIndex(
    day => day.date.toISOString().split('T')[0] === today.toISOString().split('T')[0]
  );
  
  if (dailyPlayIndex >= 0) {
    stats.dailyPlays[dailyPlayIndex].count += 1;
  } else {
    stats.dailyPlays.push({
      date: today,
      count: 1
    });
    
    // Keep only last 30 days
    if (stats.dailyPlays.length > 30) {
      stats.dailyPlays.sort((a, b) => b.date - a.date);
      stats.dailyPlays = stats.dailyPlays.slice(0, 30);
    }
  }
  
  // Update performance metrics
  if (completed) {
    const totalCompletions = stats.completionRate * (stats.totalPlays - 1) / 100;
    stats.completionRate = ((totalCompletions + 1) / stats.totalPlays) * 100;
  }
  
  if (skipped) {
    const totalSkips = stats.skipRate * (stats.totalPlays - 1) / 100;
    stats.skipRate = ((totalSkips + 1) / stats.totalPlays) * 100;
  }
  
  if (playDuration > 0) {
    const totalPlayTime = stats.averagePlayTime * (stats.totalPlays - 1);
    stats.averagePlayTime = (totalPlayTime + playDuration) / stats.totalPlays;
  }
  
  // Update theme-specific data
  await this.updateThemeData(stats, walletAddress, { weather, location });
  
  // Calculate trending score
  stats.trendingScore = await this.calculateTrendingScore(stats);
  
  // Update timestamp
  stats.lastUpdated = now;
  
  // Save and return
  return stats.save();
};

// Update theme-specific data
streamingStatsSchema.statics.updateThemeData = async function(stats, walletAddress, { weather, location }) {
  switch (stats.theme) {
    case 'Forge':
      // Wear-based progression
      stats.themeMetadata.wearCount += 1;
      
      // Check for milestones
      const wearMilestones = [
        { level: 10, visualEffect: 'slight_wear' },
        { level: 25, visualEffect: 'moderate_wear' },
        { level: 50, visualEffect: 'significant_wear' },
        { level: 100, visualEffect: 'heavy_wear' },
        { level: 200, visualEffect: 'extreme_wear' }
      ];
      
      for (const milestone of wearMilestones) {
        const existingIndex = stats.themeMetadata.wearMilestones.findIndex(m => m.level === milestone.level);
        
        if (stats.themeMetadata.wearCount >= milestone.level) {
          if (existingIndex >= 0) {
            if (!stats.themeMetadata.wearMilestones[existingIndex].achieved) {
              stats.themeMetadata.wearMilestones[existingIndex].achieved = true;
              stats.themeMetadata.wearMilestones[existingIndex].achievedAt = new Date();
            }
          } else {
            stats.themeMetadata.wearMilestones.push({
              ...milestone,
              achieved: true,
              achievedAt: new Date()
            });
          }
        } else if (existingIndex === -1) {
          stats.themeMetadata.wearMilestones.push({
            ...milestone,
            achieved: false
          });
        }
      }
      
      // Update evolution level based on wear
      stats.evolutionLevel = Math.min(100, Math.floor(stats.themeMetadata.wearCount / 2));
      break;
      
    case 'Elysium':
      // Weather/time-based progression
      if (weather && location) {
        stats.themeMetadata.weatherData = {
          lastWeather: weather.condition,
          lastTemperature: weather.temperature,
          lastTimeOfDay: this.getTimeOfDay(new Date()),
          lastUpdated: new Date(),
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            country: location.country,
            city: location.city
          }
        };
        
        // Evolution level based on variety of conditions experienced
        // This would be more complex in a real implementation
        const weatherConditions = new Set(stats.listeners
          .filter(l => l.walletAddress === walletAddress)
          .map(l => l.weatherCondition)
          .filter(Boolean));
        
        weatherConditions.add(weather.condition);
        
        // More variety = higher evolution
        stats.evolutionLevel = Math.min(100, weatherConditions.size * 10);
      }
      break;
      
    case 'Default':
    default:
      // Gradient progression based on play count
      const playThresholds = [10, 25, 50, 100, 200];
      const currentPlays = stats.totalPlays;
      
      for (let i = playThresholds.length - 1; i >= 0; i--) {
        if (currentPlays >= playThresholds[i]) {
          stats.themeMetadata.gradientStage = i + 1;
          break;
        }
      }
      
      // Evolution level based on play count
      stats.evolutionLevel = Math.min(100, Math.floor(stats.totalPlays / 2));
      break;
  }
  
  return stats;
};

// Helper method to get time of day
streamingStatsSchema.statics.getTimeOfDay = function(date) {
  const hour = date.getHours();
  
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
};

// Calculate trending score based on recent plays and engagement
streamingStatsSchema.statics.calculateTrendingScore = async function(stats) {
  // Sort daily plays by date (newest first)
  const sortedDailyPlays = [...stats.dailyPlays].sort((a, b) => b.date - a.date);
  
  // Calculate weighted recent plays (more weight to recent days)
  let weightedPlays = 0;
  let totalWeight = 0;
  
  for (let i = 0; i < Math.min(7, sortedDailyPlays.length); i++) {
    const weight = Math.pow(0.8, i); // Exponential decay
    weightedPlays += sortedDailyPlays[i].count * weight;
    totalWeight += weight;
  }
  
  const recentPlayScore = totalWeight > 0 ? weightedPlays / totalWeight : 0;
  
  // Calculate engagement score
  const engagementScore = (
    (100 - stats.skipRate) * 0.4 + // Lower skip rate is better
    stats.completionRate * 0.4 + // Higher completion rate is better
    Math.min(100, stats.uniqueListeners) * 0.2 // More unique listeners is better
  );
  
  // Combine scores
  return Math.round((recentPlayScore * 0.7 + engagementScore * 0.3) * 100) / 100;
};

// Get top trending DSRCs
streamingStatsSchema.statics.getTopTrending = async function(limit = 10) {
  return this.find()
    .sort({ trendingScore: -1 })
    .limit(limit)
    .select('dsrcId totalPlays uniqueListeners trendingScore evolutionLevel theme');
};

// Get trending by theme
streamingStatsSchema.statics.getTrendingByTheme = async function(theme, limit = 10) {
  return this.find({ theme })
    .sort({ trendingScore: -1 })
    .limit(limit)
    .select('dsrcId totalPlays uniqueListeners trendingScore evolutionLevel');
};

// Get geographic insights
streamingStatsSchema.statics.getGeographicInsights = async function(dsrcId) {
  const stats = await this.findOne({ dsrcId });
  if (!stats) return null;
  
  const geographicData = {};
  for (const [country, count] of stats.geographicPlays.entries()) {
    geographicData[country] = count;
  }
  
  return {
    dsrcId,
    geographicData,
    topCountry: Object.entries(geographicData)
      .sort((a, b) => b[1] - a[1])
      .map(([country]) => country)[0] || null
  };
};

// Get play patterns
streamingStatsSchema.statics.getPlayPatterns = async function(dsrcId) {
  const stats = await this.findOne({ dsrcId });
  if (!stats) return null;
  
  const hourlyData = {};
  for (const [hour, count] of stats.playsByHour.entries()) {
    hourlyData[hour] = count;
  }
  
  // Calculate peak hours
  const peakHours = Object.entries(hourlyData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([hour]) => hour);
  
  return {
    dsrcId,
    hourlyData,
    peakHours,
    dailyTrend: stats.dailyPlays
      .sort((a, b) => a.date - b.date)
      .map(day => ({
        date: day.date.toISOString().split('T')[0],
        count: day.count
      }))
  };
};

// Create the model
const StreamingStats = mongoose.models.StreamingStats || mongoose.model('StreamingStats', streamingStatsSchema);

export default StreamingStats;
