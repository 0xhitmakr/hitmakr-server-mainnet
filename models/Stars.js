import mongoose from 'mongoose';

const starTransactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  fromWallet: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  toWallet: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  transactionType: {
    type: String,
    required: true,
    enum: [
      'tip', 
      'subscription_reward', 
      'engagement_reward', 
      'purchase', 
      'refund', 
      'system_grant', 
      'achievement_reward',
      'conversion',
      'weekly_bonus'
    ]
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'failed', 'reversed'],
    default: 'pending'
  },
  metadata: {
    // For tips
    dsrcId: String,
    collectionId: String,
    message: String,
    
    // For subscription rewards
    subscriptionTier: String,
    subscriptionPeriod: String,
    
    // For engagement rewards
    engagementType: {
      type: String,
      enum: ['daily_login', 'streak', 'content_creation', 'curation', 'social_share', '']
    },
    engagementDetails: mongoose.Schema.Types.Mixed,
    
    // For achievements
    achievementId: String,
    achievementName: String,
    
    // For conversions
    conversionRate: Number,
    conversionCurrency: String,
    
    // For system operations
    reason: String,
    adminId: String,
    
    // General
    appSource: String,
    deviceInfo: String,
    ipHash: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  }
});

const starBalanceSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    lowercase: true,
    unique: true,
    index: true
  },
  balance: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  lifetimeEarned: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  lifetimeSpent: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

const weeklyTippingSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  weekStartDate: {
    type: Date,
    required: true,
    index: true
  },
  weekEndDate: {
    type: Date,
    required: true
  },
  tipsGiven: {
    count: {
      type: Number,
      default: 0
    },
    amount: {
      type: Number,
      default: 0
    },
    recipients: [{
      walletAddress: String,
      amount: Number,
      count: Number
    }]
  },
  tipsReceived: {
    count: {
      type: Number,
      default: 0
    },
    amount: {
      type: Number,
      default: 0
    },
    fromWallets: [{
      walletAddress: String,
      amount: Number,
      count: Number
    }]
  },
  bonusEarned: {
    type: Number,
    default: 0
  },
  bonusThresholdMet: {
    type: Boolean,
    default: false
  },
  bonusPaid: {
    type: Boolean,
    default: false
  },
  bonusPaidDate: Date
});

const starAchievementSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  achievementId: {
    type: String,
    required: true
  },
  achievementType: {
    type: String,
    required: true,
    enum: [
      'first_tip',
      'tip_streak',
      'tip_milestone',
      'earning_milestone',
      'subscription_duration',
      'engagement_streak',
      'creator_support',
      'community_builder',
      'early_adopter',
      'special_event'
    ]
  },
  achievementName: {
    type: String,
    required: true
  },
  description: String,
  rewardAmount: {
    type: Number,
    default: 0
  },
  dateEarned: {
    type: Date,
    default: Date.now,
    required: true
  },
  metadata: mongoose.Schema.Types.Mixed
});

const subscriptionRewardSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  subscriptionId: {
    type: String,
    required: true
  },
  subscriptionTier: {
    type: String,
    required: true,
    enum: ['basic', 'premium', 'platinum', 'custom']
  },
  monthlyReward: {
    type: Number,
    required: true,
    min: 0
  },
  nextRewardDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  startDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  endDate: Date,
  lifetimeRewards: {
    type: Number,
    default: 0
  },
  paymentMethod: {
    type: String,
    enum: ['stripe', 'crypto', 'superpaywall', 'other']
  },
  paymentReference: String
});

const starRateLimitSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  operationType: {
    type: String,
    required: true,
    enum: ['tip', 'earn', 'convert', 'achievement']
  },
  dailyUsage: {
    type: Number,
    default: 0
  },
  weeklyUsage: {
    type: Number,
    default: 0
  },
  monthlyUsage: {
    type: Number,
    default: 0
  },
  lastOperation: {
    type: Date,
    default: Date.now
  },
  resetDates: {
    daily: Date,
    weekly: Date,
    monthly: Date
  }
});

const systemConfigSchema = new mongoose.Schema({
  configId: {
    type: String,
    required: true,
    unique: true,
    default: 'star_system_config'
  },
  conversionRates: {
    usdToStar: {
      type: Number,
      default: 100 // 100 stars per USD
    },
    starToUsd: {
      type: Number,
      default: 0.01 // $0.01 per star
    }
  },
  limits: {
    maxDailyTips: {
      type: Number,
      default: 1000
    },
    maxWeeklyTips: {
      type: Number,
      default: 5000
    },
    maxTipAmount: {
      type: Number,
      default: 1000
    },
    minTipAmount: {
      type: Number,
      default: 1
    },
    maxDailyEarnings: {
      type: Number,
      default: 10000
    }
  },
  rewards: {
    weeklyTipBonus: {
      thresholdAmount: {
        type: Number,
        default: 100
      },
      bonusPercentage: {
        type: Number,
        default: 10
      }
    },
    subscriptionRewards: {
      basic: {
        type: Number,
        default: 100
      },
      premium: {
        type: Number,
        default: 250
      },
      platinum: {
        type: Number,
        default: 500
      }
    },
    engagementRewards: {
      dailyLogin: {
        type: Number,
        default: 5
      },
      streak: {
        thresholds: [
          { days: 3, reward: 15 },
          { days: 7, reward: 50 },
          { days: 30, reward: 200 }
        ]
      },
      contentCreation: {
        type: Number,
        default: 25
      },
      socialShare: {
        type: Number,
        default: 10
      }
    }
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  updatedBy: String
});

// Create the main Stars schema that combines all subschemas
const starsSchema = new mongoose.Schema({
  // This is a container schema to group all star-related models
  // The actual data is stored in the individual models defined above
}, { timestamps: true });

// Create models for each subschema
const StarTransaction = mongoose.models.StarTransaction || mongoose.model('StarTransaction', starTransactionSchema);
const StarBalance = mongoose.models.StarBalance || mongoose.model('StarBalance', starBalanceSchema);
const WeeklyTipping = mongoose.models.WeeklyTipping || mongoose.model('WeeklyTipping', weeklyTippingSchema);
const StarAchievement = mongoose.models.StarAchievement || mongoose.model('StarAchievement', starAchievementSchema);
const SubscriptionReward = mongoose.models.SubscriptionReward || mongoose.model('SubscriptionReward', subscriptionRewardSchema);
const StarRateLimit = mongoose.models.StarRateLimit || mongoose.model('StarRateLimit', starRateLimitSchema);
const SystemConfig = mongoose.models.SystemConfig || mongoose.model('SystemConfig', systemConfigSchema);

// Create the main Stars model with static methods
const Stars = mongoose.models.Stars || mongoose.model('Stars', starsSchema);

// Add static methods to the Stars model
// These methods will interact with the submodels

// Get user balance
Stars.getBalance = async function(walletAddress) {
  let balance = await StarBalance.findOne({ walletAddress });
  
  if (!balance) {
    balance = await StarBalance.create({
      walletAddress,
      balance: 0,
      lifetimeEarned: 0,
      lifetimeSpent: 0
    });
  }
  
  return balance;
};

// Transfer stars between users (for tips)
Stars.transferStars = async function(fromWallet, toWallet, amount, metadata = {}) {
  // Generate transaction ID
  const transactionId = `tx_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  
  // Validate amount
  if (!amount || amount <= 0) {
    throw new Error('Invalid amount');
  }
  
  // Get system config for limits
  const config = await SystemConfig.findOne({ configId: 'star_system_config' });
  if (!config) {
    throw new Error('System configuration not found');
  }
  
  // Check rate limits
  await this.checkRateLimits(fromWallet, 'tip', amount, config);
  
  // Check sender balance
  const senderBalance = await this.getBalance(fromWallet);
  if (senderBalance.balance < amount) {
    throw new Error('Insufficient balance');
  }
  
  // Start transaction
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Create transaction record
    const transaction = await StarTransaction.create([{
      transactionId,
      fromWallet,
      toWallet,
      amount,
      transactionType: metadata.transactionType || 'tip',
      status: 'pending',
      metadata: {
        ...metadata,
        createdAt: new Date()
      }
    }], { session });
    
    // Update sender balance
    await StarBalance.findOneAndUpdate(
      { walletAddress: fromWallet },
      { 
        $inc: { 
          balance: -amount,
          lifetimeSpent: amount
        },
        $set: { lastUpdated: new Date() }
      },
      { session }
    );
    
    // Update receiver balance
    await StarBalance.findOneAndUpdate(
      { walletAddress: toWallet },
      { 
        $inc: { 
          balance: amount,
          lifetimeEarned: amount
        },
        $set: { lastUpdated: new Date() }
      },
      { upsert: true, session }
    );
    
    // Update weekly tipping stats for sender
    await this.updateWeeklyTippingStats(fromWallet, toWallet, amount, session);
    
    // Mark transaction as completed
    await StarTransaction.findOneAndUpdate(
      { transactionId },
      { $set: { status: 'completed' } },
      { session }
    );
    
    // Commit transaction
    await session.commitTransaction();
    
    // Check for achievements
    this.checkForAchievements(fromWallet, 'tip', amount, metadata).catch(console.error);
    
    return transaction[0];
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    throw error;
  } finally {
    // End session
    session.endSession();
  }
};

// Check rate limits
Stars.checkRateLimits = async function(walletAddress, operationType, amount, config) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  // Find or create rate limit record
  let rateLimit = await StarRateLimit.findOne({ walletAddress, operationType });
  
  if (!rateLimit) {
    rateLimit = new StarRateLimit({
      walletAddress,
      operationType,
      resetDates: {
        daily: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        weekly: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
        monthly: new Date(now.getFullYear(), now.getMonth() + 1, 1)
      }
    });
  }
  
  // Reset counters if needed
  if (rateLimit.resetDates.daily < now) {
    rateLimit.dailyUsage = 0;
    rateLimit.resetDates.daily = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  }
  
  if (rateLimit.resetDates.weekly < now) {
    rateLimit.weeklyUsage = 0;
    rateLimit.resetDates.weekly = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
  
  if (rateLimit.resetDates.monthly < now) {
    rateLimit.monthlyUsage = 0;
    rateLimit.resetDates.monthly = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }
  
  // Check limits
  if (operationType === 'tip') {
    if (amount > config.limits.maxTipAmount) {
      throw new Error(`Tip amount exceeds maximum of ${config.limits.maxTipAmount} stars`);
    }
    
    if (amount < config.limits.minTipAmount) {
      throw new Error(`Tip amount below minimum of ${config.limits.minTipAmount} stars`);
    }
    
    if (rateLimit.dailyUsage + amount > config.limits.maxDailyTips) {
      throw new Error(`Daily tipping limit of ${config.limits.maxDailyTips} stars would be exceeded`);
    }
    
    if (rateLimit.weeklyUsage + amount > config.limits.maxWeeklyTips) {
      throw new Error(`Weekly tipping limit of ${config.limits.maxWeeklyTips} stars would be exceeded`);
    }
  } else if (operationType === 'earn') {
    if (rateLimit.dailyUsage + amount > config.limits.maxDailyEarnings) {
      throw new Error(`Daily earning limit of ${config.limits.maxDailyEarnings} stars would be exceeded`);
    }
  }
  
  // Update usage
  rateLimit.dailyUsage += amount;
  rateLimit.weeklyUsage += amount;
  rateLimit.monthlyUsage += amount;
  rateLimit.lastOperation = now;
  
  await rateLimit.save();
  
  return true;
};

// Update weekly tipping stats
Stars.updateWeeklyTippingStats = async function(fromWallet, toWallet, amount, session) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)
  weekEnd.setHours(23, 59, 59, 999);
  
  // Update sender's weekly tipping stats
  let senderStats = await WeeklyTipping.findOne({
    walletAddress: fromWallet,
    weekStartDate: weekStart
  });
  
  if (!senderStats) {
    senderStats = new WeeklyTipping({
      walletAddress: fromWallet,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      tipsGiven: {
        count: 0,
        amount: 0,
        recipients: []
      },
      tipsReceived: {
        count: 0,
        amount: 0,
        fromWallets: []
      }
    });
  }
  
  // Update tips given
  senderStats.tipsGiven.count += 1;
  senderStats.tipsGiven.amount += amount;
  
  // Update recipient list
  const recipientIndex = senderStats.tipsGiven.recipients.findIndex(
    r => r.walletAddress === toWallet
  );
  
  if (recipientIndex >= 0) {
    senderStats.tipsGiven.recipients[recipientIndex].amount += amount;
    senderStats.tipsGiven.recipients[recipientIndex].count += 1;
  } else {
    senderStats.tipsGiven.recipients.push({
      walletAddress: toWallet,
      amount: amount,
      count: 1
    });
  }
  
  // Check if bonus threshold is met
  const config = await SystemConfig.findOne({ configId: 'star_system_config' });
  if (config && senderStats.tipsGiven.amount >= config.rewards.weeklyTipBonus.thresholdAmount) {
    senderStats.bonusThresholdMet = true;
  }
  
  // Save sender stats
  if (session) {
    await senderStats.save({ session });
  } else {
    await senderStats.save();
  }
  
  // Update receiver's weekly tipping stats
  let receiverStats = await WeeklyTipping.findOne({
    walletAddress: toWallet,
    weekStartDate: weekStart
  });
  
  if (!receiverStats) {
    receiverStats = new WeeklyTipping({
      walletAddress: toWallet,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      tipsGiven: {
        count: 0,
        amount: 0,
        recipients: []
      },
      tipsReceived: {
        count: 0,
        amount: 0,
        fromWallets: []
      }
    });
  }
  
  // Update tips received
  receiverStats.tipsReceived.count += 1;
  receiverStats.tipsReceived.amount += amount;
  
  // Update sender list
  const senderIndex = receiverStats.tipsReceived.fromWallets.findIndex(
    r => r.walletAddress === fromWallet
  );
  
  if (senderIndex >= 0) {
    receiverStats.tipsReceived.fromWallets[senderIndex].amount += amount;
    receiverStats.tipsReceived.fromWallets[senderIndex].count += 1;
  } else {
    receiverStats.tipsReceived.fromWallets.push({
      walletAddress: fromWallet,
      amount: amount,
      count: 1
    });
  }
  
  // Save receiver stats
  if (session) {
    await receiverStats.save({ session });
  } else {
    await receiverStats.save();
  }
  
  return { senderStats, receiverStats };
};

// Process weekly bonuses
Stars.processWeeklyBonuses = async function() {
  const now = new Date();
  const lastWeekEnd = new Date(now);
  lastWeekEnd.setDate(now.getDate() - now.getDay() - 1); // Last Saturday
  lastWeekEnd.setHours(23, 59, 59, 999);
  
  const lastWeekStart = new Date(lastWeekEnd);
  lastWeekStart.setDate(lastWeekStart.getDate() - 6); // Last Sunday
  lastWeekStart.setHours(0, 0, 0, 0);
  
  // Get system config
  const config = await SystemConfig.findOne({ configId: 'star_system_config' });
  if (!config) {
    throw new Error('System configuration not found');
  }
  
  // Find all users who met the threshold but haven't been paid
  const eligibleUsers = await WeeklyTipping.find({
    weekStartDate: lastWeekStart,
    bonusThresholdMet: true,
    bonusPaid: false
  });
  
  const results = {
    processed: 0,
    failed: 0,
    totalBonusPaid: 0
  };
  
  // Process each eligible user
  for (const user of eligibleUsers) {
    try {
      // Calculate bonus amount
      const bonusAmount = Math.floor(
        user.tipsGiven.amount * (config.rewards.weeklyTipBonus.bonusPercentage / 100)
      );
      
      if (bonusAmount <= 0) continue;
      
      // Create bonus transaction
      await this.awardStars(
        'system',
        user.walletAddress,
        bonusAmount,
        {
          transactionType: 'weekly_bonus',
          weekStartDate: lastWeekStart,
          weekEndDate: lastWeekEnd,
          tippingAmount: user.tipsGiven.amount,
          bonusPercentage: config.rewards.weeklyTipBonus.bonusPercentage
        }
      );
      
      // Update weekly tipping record
      user.bonusEarned = bonusAmount;
      user.bonusPaid = true;
      user.bonusPaidDate = now;
      await user.save();
      
      results.processed++;
      results.totalBonusPaid += bonusAmount;
    } catch (error) {
      console.error(`Failed to process bonus for ${user.walletAddress}:`, error);
      results.failed++;
    }
  }
  
  return results;
};

// Award stars to a user (from system)
Stars.awardStars = async function(fromWallet, toWallet, amount, metadata = {}) {
  // Generate transaction ID
  const transactionId = `award_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  
  // Validate amount
  if (!amount || amount <= 0) {
    throw new Error('Invalid amount');
  }
  
  // For system awards, fromWallet can be 'system'
  const actualFromWallet = fromWallet === 'system' ? 'system_rewards_wallet' : fromWallet;
  
  // Start transaction
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Create transaction record
    const transaction = await StarTransaction.create([{
      transactionId,
      fromWallet: actualFromWallet,
      toWallet,
      amount,
      transactionType: metadata.transactionType || 'system_grant',
      status: 'pending',
      metadata: {
        ...metadata,
        createdAt: new Date()
      }
    }], { session });
    
    // Update receiver balance
    await StarBalance.findOneAndUpdate(
      { walletAddress: toWallet },
      { 
        $inc: { 
          balance: amount,
          lifetimeEarned: amount
        },
        $set: { lastUpdated: new Date() }
      },
      { upsert: true, session }
    );
    
    // Mark transaction as completed
    await StarTransaction.findOneAndUpdate(
      { transactionId },
      { $set: { status: 'completed' } },
      { session }
    );
    
    // Commit transaction
    await session.commitTransaction();
    
    return transaction[0];
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    throw error;
  } finally {
    // End session
    session.endSession();
  }
};

// Process subscription rewards
Stars.processSubscriptionRewards = async function() {
  const now = new Date();
  
  // Find all active subscriptions due for reward
  const dueSubscriptions = await SubscriptionReward.find({
    isActive: true,
    nextRewardDate: { $lte: now }
  });
  
  const results = {
    processed: 0,
    failed: 0,
    totalRewardsPaid: 0
  };
  
  // Process each subscription
  for (const subscription of dueSubscriptions) {
    try {
      // Award stars
      await this.awardStars(
        'system',
        subscription.walletAddress,
        subscription.monthlyReward,
        {
          transactionType: 'subscription_reward',
          subscriptionId: subscription.subscriptionId,
          subscriptionTier: subscription.subscriptionTier,
          subscriptionPeriod: `${subscription.startDate.toISOString().split('T')[0]} to ${now.toISOString().split('T')[0]}`
        }
      );
      
      // Update subscription
      subscription.lifetimeRewards += subscription.monthlyReward;
      subscription.nextRewardDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      await subscription.save();
      
      results.processed++;
      results.totalRewardsPaid += subscription.monthlyReward;
    } catch (error) {
      console.error(`Failed to process subscription reward for ${subscription.walletAddress}:`, error);
      results.failed++;
    }
  }
  
  return results;
};

// Check for achievements
Stars.checkForAchievements = async function(walletAddress, actionType, amount, metadata = {}) {
  // Get user's current stats
  const [balance, transactions, achievements] = await Promise.all([
    this.getBalance(walletAddress),
    StarTransaction.find({ 
      $or: [
        { fromWallet: walletAddress },
        { toWallet: walletAddress }
      ]
    }).sort({ createdAt: -1 }).limit(100),
    StarAchievement.find({ walletAddress })
  ]);
  
  const earnedAchievements = [];
  
  // Check for first tip achievement
  if (actionType === 'tip' && transactions.filter(t => t.transactionType === 'tip' && t.fromWallet === walletAddress).length === 1) {
    const firstTipAchievement = {
      walletAddress,
      achievementId: 'first_tip',
      achievementType: 'first_tip',
      achievementName: 'First Supporter',
      description: 'You sent your first tip to a creator!',
      rewardAmount: 10,
      metadata: {
        tipAmount: amount,
        recipient: metadata.toWallet
      }
    };
    
    // Check if already earned
    if (!achievements.some(a => a.achievementId === 'first_tip')) {
      await StarAchievement.create(firstTipAchievement);
      await this.awardStars('system', walletAddress, firstTipAchievement.rewardAmount, {
        transactionType: 'achievement_reward',
        achievementId: 'first_tip',
        achievementName: 'First Supporter'
      });
      earnedAchievements.push(firstTipAchievement);
    }
  }
  
  // Check for tipping milestones
  if (actionType === 'tip') {
    const totalTipped = balance.lifetimeSpent;
    const milestones = [100, 500, 1000, 5000, 10000, 50000, 100000];
    
    for (const milestone of milestones) {
      const achievementId = `tip_milestone_${milestone}`;
      
      // Check if milestone reached and not already awarded
      if (totalTipped >= milestone && !achievements.some(a => a.achievementId === achievementId)) {
        const milestoneAchievement = {
          walletAddress,
          achievementId,
          achievementType: 'tip_milestone',
          achievementName: `${milestone} Stars Supporter`,
          description: `You've tipped a total of ${milestone} stars to creators!`,
          rewardAmount: Math.floor(milestone * 0.05), // 5% reward
          metadata: {
            milestone,
            totalTipped
          }
        };
        
        await StarAchievement.create(milestoneAchievement);
        await this.awardStars('system', walletAddress, milestoneAchievement.rewardAmount, {
          transactionType: 'achievement_reward',
          achievementId,
          achievementName: milestoneAchievement.achievementName
        });
        earnedAchievements.push(milestoneAchievement);
      }
    }
  }
  
  // More achievement checks can be added here
  
  return earnedAchievements;
};

// Get transaction history
Stars.getTransactionHistory = async function(walletAddress, page = 1, limit = 20, filters = {}) {
  const skip = (page - 1) * limit;
  
  const query = {
    $or: [
      { fromWallet: walletAddress },
      { toWallet: walletAddress }
    ]
  };
  
  // Apply filters
  if (filters.transactionType) {
    query.transactionType = filters.transactionType;
  }
  
  if (filters.startDate) {
    query.createdAt = { ...query.createdAt, $gte: new Date(filters.startDate) };
  }
  
  if (filters.endDate) {
    query.createdAt = { ...query.createdAt, $lte: new Date(filters.endDate) };
  }
  
  if (filters.status) {
    query.status = filters.status;
  }
  
  const [transactions, totalCount] = await Promise.all([
    StarTransaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    
    StarTransaction.countDocuments(query)
  ]);
  
  // Enhance transaction data
  const enhancedTransactions = transactions.map(tx => {
    const isIncoming = tx.toWallet === walletAddress;
    return {
      ...tx.toObject(),
      direction: isIncoming ? 'incoming' : 'outgoing',
      counterparty: isIncoming ? tx.fromWallet : tx.toWallet,
      displayAmount: isIncoming ? `+${tx.amount}` : `-${tx.amount}`
    };
  });
  
  return {
    transactions: enhancedTransactions,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit),
    totalTransactions: totalCount
  };
};

// Get user achievements
Stars.getUserAchievements = async function(walletAddress) {
  const achievements = await StarAchievement.find({ walletAddress })
    .sort({ dateEarned: -1 });
  
  return achievements;
};

// Get tipping leaderboard
Stars.getTippingLeaderboard = async function(period = 'weekly', limit = 10) {
  let dateQuery = {};
  const now = new Date();
  
  if (period === 'weekly') {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    dateQuery = { weekStartDate: weekStart };
  } else if (period === 'monthly') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    dateQuery = { weekStartDate: { $gte: monthStart } };
  } else if (period === 'allTime') {
    // No date filter for all-time
  }
  
  let leaderboard;
  
  if (period === 'weekly' || period === 'monthly') {
    // For weekly or monthly, use WeeklyTipping collection
    leaderboard = await WeeklyTipping.aggregate([
      { $match: dateQuery },
      { $group: {
        _id: '$walletAddress',
        totalTipped: { $sum: '$tipsGiven.amount' },
        tipCount: { $sum: '$tipsGiven.count' }
      }},
      { $sort: { totalTipped: -1 } },
      { $limit: limit }
    ]);
  } else {
    // For all-time, use StarBalance collection
    leaderboard = await StarBalance.find()
      .sort({ lifetimeSpent: -1 })
      .limit(limit)
      .select('walletAddress lifetimeSpent -_id');
    
    leaderboard = leaderboard.map(item => ({
      _id: item.walletAddress,
      totalTipped: item.lifetimeSpent
    }));
  }
  
  return leaderboard;
};

// Get top earners
Stars.getTopEarners = async function(period = 'weekly', limit = 10) {
  let dateQuery = {};
  const now = new Date();
  
  if (period === 'weekly') {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    dateQuery = { weekStartDate: weekStart };
  } else if (period === 'monthly') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    dateQuery = { weekStartDate: { $gte: monthStart } };
  } else if (period === 'allTime') {
    // No date filter for all-time
  }
  
  let topEarners;
  
  if (period === 'weekly' || period === 'monthly') {
    // For weekly or monthly, use WeeklyTipping collection
    topEarners = await WeeklyTipping.aggregate([
      { $match: dateQuery },
      { $group: {
        _id: '$walletAddress',
        totalEarned: { $sum: '$tipsReceived.amount' },
        tipCount: { $sum: '$tipsReceived.count' }
      }},
      { $sort: { totalEarned: -1 } },
      { $limit: limit }
    ]);
  } else {
    // For all-time, use StarBalance collection
    topEarners = await StarBalance.find()
      .sort({ lifetimeEarned: -1 })
      .limit(limit)
      .select('walletAddress lifetimeEarned -_id');
    
    topEarners = topEarners.map(item => ({
      _id: item.walletAddress,
      totalEarned: item.lifetimeEarned
    }));
  }
  
  return topEarners;
};

// Create or update subscription
Stars.createOrUpdateSubscription = async function(subscriptionData) {
  const { 
    walletAddress, 
    subscriptionId, 
    subscriptionTier, 
    monthlyReward,
    paymentMethod,
    paymentReference,
    isActive = true
  } = subscriptionData;
  
  // Check if subscription already exists
  let subscription = await SubscriptionReward.findOne({
    subscriptionId
  });
  
  if (subscription) {
    // Update existing subscription
    subscription.subscriptionTier = subscriptionTier;
    subscription.monthlyReward = monthlyReward;
    subscription.isActive = isActive;
    
    if (!isActive) {
      subscription.endDate = new Date();
    } else if (subscription.endDate) {
      // Reactivating
      subscription.endDate = null;
    }
    
    if (paymentMethod) subscription.paymentMethod = paymentMethod;
    if (paymentReference) subscription.paymentReference = paymentReference;
    
    await subscription.save();
  } else {
    // Create new subscription
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    
    subscription = await SubscriptionReward.create({
      walletAddress,
      subscriptionId,
      subscriptionTier,
      monthlyReward,
      nextRewardDate: nextMonth,
      isActive,
      startDate: now,
      lifetimeRewards: 0,
      paymentMethod,
      paymentReference
    });
    
    // Award initial stars immediately
    await this.awardStars(
      'system',
      walletAddress,
      monthlyReward,
      {
        transactionType: 'subscription_reward',
        subscriptionId,
        subscriptionTier,
        subscriptionPeriod: 'initial'
      }
    );
    
    // Update lifetime rewards
    subscription.lifetimeRewards = monthlyReward;
    await subscription.save();
  }
  
  return subscription;
};

// Get system configuration
Stars.getSystemConfig = async function() {
  let config = await SystemConfig.findOne({ configId: 'star_system_config' });
  
  if (!config) {
    // Create default config if not exists
    config = await SystemConfig.create({
      configId: 'star_system_config',
      // Default values are defined in the schema
    });
  }
  
  return config;
};

// Update system configuration
Stars.updateSystemConfig = async function(configData, updatedBy) {
  const config = await this.getSystemConfig();
  
  // Update config with new values
  if (configData.conversionRates) {
    config.conversionRates = {
      ...config.conversionRates,
      ...configData.conversionRates
    };
  }
  
  if (configData.limits) {
    config.limits = {
      ...config.limits,
      ...configData.limits
    };
  }
  
  if (configData.rewards) {
    // Deep merge rewards
    if (configData.rewards.weeklyTipBonus) {
      config.rewards.weeklyTipBonus = {
        ...config.rewards.weeklyTipBonus,
        ...configData.rewards.weeklyTipBonus
      };
    }
    
    if (configData.rewards.subscriptionRewards) {
      config.rewards.subscriptionRewards = {
        ...config.rewards.subscriptionRewards,
        ...configData.rewards.subscriptionRewards
      };
    }
    
    if (configData.rewards.engagementRewards) {
      config.rewards.engagementRewards = {
        ...config.rewards.engagementRewards,
        ...configData.rewards.engagementRewards
      };
    }
  }
  
  config.lastUpdated = new Date();
  config.updatedBy = updatedBy;
  
  return config.save();
};

export default Stars;
