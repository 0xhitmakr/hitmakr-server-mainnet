import mongoose from 'mongoose';

const vaultProjectSchema = new mongoose.Schema({
  // Basic project info
  projectId: {
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
  
  // Audio file information
  audioFile: {
    originalFilename: String,
    uploadHash: String,
    duration: Number,
    fileSize: Number,
    format: String,
    bitrate: Number,
    sampleRate: Number,
    channels: Number,
    uploadStatus: {
      type: String,
      enum: ['pending', 'uploading', 'processing', 'complete', 'failed'],
      default: 'pending'
    },
    uploadProgress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    uploadError: String,
    uploadedAt: Date
  },
  
  // Audio type classification
  audioType: {
    type: String,
    enum: ['song', 'beat', 'loop', 'sfx'],
    default: 'song'
  },
  
  // Workflow state
  workflowState: {
    type: String,
    enum: [
      'initial',           // Project created
      'audio_uploaded',    // Audio file uploaded
      'metadata_added',    // Basic metadata added
      'fingerprint_checked', // Fingerprint validation complete
      'licensing_configured', // Licensing options set
      'release_configured',   // Release settings configured
      'ready_for_conversion', // Ready to convert to DSRC
      'converted',           // Converted to DSRC
      'archived'             // Archived/inactive
    ],
    default: 'initial'
  },
  
  // Step completion tracking
  completedSteps: {
    audioUpload: {
      type: Boolean,
      default: false
    },
    metadataEntry: {
      type: Boolean,
      default: false
    },
    fingerprintCheck: {
      type: Boolean,
      default: false
    },
    licensingSetup: {
      type: Boolean,
      default: false
    },
    releaseSetup: {
      type: Boolean,
      default: false
    }
  },
  
  // Fingerprint checking results
  fingerprintData: {
    fingerprintHash: String,
    checkedAt: Date,
    matchFound: {
      type: Boolean,
      default: false
    },
    matchDetails: [{
      matchType: {
        type: String,
        enum: ['exact', 'partial', 'sample', 'none']
      },
      matchScore: {
        type: Number,
        min: 0,
        max: 100
      },
      matchedWith: {
        title: String,
        artist: String,
        dsrcId: String,
        timestamp: String
      },
      matchedSegments: [{
        projectStart: Number,
        projectEnd: Number,
        matchedStart: Number,
        matchedEnd: Number,
        confidence: Number
      }]
    }],
    shazamResults: mongoose.Schema.Types.Mixed
  },
  
  // Copyright flags
  copyrightStatus: {
    type: String,
    enum: ['unchecked', 'clear', 'potential_issue', 'flagged'],
    default: 'unchecked'
  },
  copyrightFlags: [{
    flagType: {
      type: String,
      enum: ['sample_detected', 'similar_work', 'exact_match', 'manual_flag']
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    description: String,
    flaggedAt: {
      type: Date,
      default: Date.now
    },
    flaggedBy: String,
    resolved: {
      type: Boolean,
      default: false
    },
    resolutionNotes: String,
    resolvedAt: Date,
    resolvedBy: String
  }],
  
  // Metadata for DSRC creation
  metadata: {
    genre: String,
    subgenre: String,
    mood: [String],
    bpm: Number,
    key: String,
    isExplicit: {
      type: Boolean,
      default: false
    },
    language: String,
    releaseYear: Number,
    recordLabel: String,
    publisher: String,
    isrc: String,
    upc: String,
    customAttributes: [{
      trait_type: String,
      value: String
    }]
  },
  
  // Hashtags
  hashtags: {
    type: [String],
    default: []
  },
  
  // Licensing configuration
  licensing: {
    licensingEnabled: {
      type: Boolean,
      default: true
    },
    licenseType: {
      type: String,
      enum: ['all_rights_reserved', 'creative_commons', 'custom'],
      default: 'all_rights_reserved'
    },
    creativeCommonsType: {
      type: String,
      enum: ['cc0', 'cc_by', 'cc_by_sa', 'cc_by_nc', 'cc_by_nc_sa', 'cc_by_nd', 'cc_by_nc_nd', ''],
      default: ''
    },
    customLicenseTerms: String,
    allowCommercialUse: {
      type: Boolean,
      default: false
    },
    allowRemixing: {
      type: Boolean,
      default: false
    },
    allowSampling: {
      type: Boolean,
      default: false
    },
    requireAttribution: {
      type: Boolean,
      default: true
    },
    territoryRestrictions: [String],
    licenseTemplates: [{
      templateName: String,
      templateDescription: String,
      price: String,
      rights: [String],
      restrictions: [String],
      duration: Number, // in days, 0 for perpetual
      isDefault: Boolean
    }]
  },
  
  // Release settings
  releaseSettings: {
    releaseType: {
      type: String,
      enum: ['immediate', 'scheduled', 'manual'],
      default: 'immediate'
    },
    scheduledReleaseDate: Date,
    visibility: {
      type: String,
      enum: ['public', 'unlisted', 'private'],
      default: 'public'
    },
    releaseNotes: String,
    
    // Collection assignment
    assignToCollection: {
      type: Boolean,
      default: false
    },
    collectionId: String,
    trackOrder: Number,
    
    // Social sharing
    enableSnipCreation: {
      type: Boolean,
      default: true
    },
    snipStartTime: {
      type: Number,
      default: 0
    },
    snipDuration: {
      type: Number,
      default: 15
    }
  },
  
  // Edition configurations
  editions: {
    // Streaming Edition
    streamingEdition: {
      enabled: {
        type: Boolean,
        default: true
      },
      price: {
        type: String,
        default: '0'
      },
      theme: {
        type: String,
        enum: ['Forge', 'Elysium', 'Default'],
        default: 'Default'
      },
      themeMetadata: mongoose.Schema.Types.Mixed
    },
    
    // Collector Edition
    collectorEdition: {
      enabled: {
        type: Boolean,
        default: false
      },
      price: {
        type: String,
        default: '0'
      },
      releaseStyle: {
        type: String,
        enum: ['random', 'tiered', 'dutch_auction'],
        default: 'random'
      },
      supply: {
        type: Number,
        default: 100
      },
      utilityDescription: String,
      utilities: [{
        utilityType: {
          type: String,
          enum: ['event_access', 'exclusive_content', 'discord_role', 'merchandise', 'custom'],
        },
        description: String,
        expirationDate: Date
      }],
      tierConfiguration: mongoose.Schema.Types.Mixed,
      auctionConfiguration: mongoose.Schema.Types.Mixed
    },
    
    // Licensing Edition
    licensingEdition: {
      enabled: {
        type: Boolean,
        default: false
      },
      basePrice: {
        type: String,
        default: '0'
      }
    }
  },
  
  // Revenue splits
  revenueSplits: [{
    walletAddress: {
      type: String,
      required: true,
      lowercase: true
    },
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    role: {
      type: String,
      enum: ['creator', 'collaborator', 'producer', 'writer', 'publisher', 'label', 'other'],
      default: 'other'
    },
    name: String
  }],
  
  // Cartridge visual representation
  cartridgeVisual: {
    color: {
      type: String,
      default: '#000000'
    },
    style: {
      type: String,
      enum: ['standard', 'vintage', 'futuristic', 'minimal', 'custom'],
      default: 'standard'
    },
    coverArtUrl: String,
    coverArtHash: String,
    visualState: {
      type: String,
      enum: ['pristine', 'worn', 'damaged', 'legendary'],
      default: 'pristine'
    },
    customAttributes: mongoose.Schema.Types.Mixed
  },
  
  // Collaboration features
  collaborators: [{
    walletAddress: {
      type: String,
      required: true,
      lowercase: true
    },
    role: {
      type: String,
      enum: ['viewer', 'editor', 'admin'],
      default: 'viewer'
    },
    invitedAt: {
      type: Date,
      default: Date.now
    },
    inviteAccepted: {
      type: Boolean,
      default: false
    },
    acceptedAt: Date,
    lastAccessed: Date
  }],
  
  // Conversion to DSRC
  dsrcConversion: {
    isEligible: {
      type: Boolean,
      default: false
    },
    eligibilityIssues: [String],
    convertedToDSRC: {
      type: Boolean,
      default: false
    },
    dsrcId: String,
    conversionDate: Date,
    conversionTransactionHash: String
  },
  
  // Project status
  status: {
    type: String,
    enum: ['draft', 'in_progress', 'ready', 'published', 'archived'],
    default: 'draft'
  },
  
  // Activity log
  activityLog: [{
    action: {
      type: String,
      enum: [
        'project_created',
        'audio_uploaded',
        'metadata_updated',
        'fingerprint_checked',
        'copyright_flagged',
        'copyright_cleared',
        'licensing_updated',
        'release_configured',
        'collaborator_added',
        'collaborator_removed',
        'converted_to_dsrc',
        'status_changed',
        'project_archived'
      ]
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    performedBy: String,
    details: mongoose.Schema.Types.Mixed
  }]
}, {
  timestamps: true
});

// Indexes for query optimization
vaultProjectSchema.index({ creator: 1, createdAt: -1 });
vaultProjectSchema.index({ title: 'text', description: 'text' });
vaultProjectSchema.index({ status: 1 });
vaultProjectSchema.index({ workflowState: 1 });
vaultProjectSchema.index({ 'audioFile.uploadStatus': 1 });
vaultProjectSchema.index({ 'fingerprintData.fingerprintHash': 1 });
vaultProjectSchema.index({ 'copyrightStatus': 1 });
vaultProjectSchema.index({ 'dsrcConversion.isEligible': 1 });
vaultProjectSchema.index({ 'dsrcConversion.convertedToDSRC': 1 });
vaultProjectSchema.index({ 'collaborators.walletAddress': 1 });
vaultProjectSchema.index({ 'hashtags': 1 });
vaultProjectSchema.index({ audioType: 1 });

// Static methods for workflow management
vaultProjectSchema.statics.createProject = async function(projectData) {
  const projectId = `vault_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  
  const project = new this({
    projectId,
    title: projectData.title || 'Untitled Project',
    description: projectData.description || '',
    creator: projectData.creator,
    status: 'draft',
    workflowState: 'initial',
    audioType: projectData.audioType || 'song',
    activityLog: [{
      action: 'project_created',
      performedBy: projectData.creator,
      details: { initialData: projectData }
    }]
  });
  
  return project.save();
};

// Update project audio file
vaultProjectSchema.statics.updateAudioFile = async function(projectId, audioFileData) {
  const project = await this.findOne({ projectId });
  if (!project) {
    throw new Error('Project not found');
  }
  
  project.audioFile = {
    ...audioFileData,
    uploadStatus: 'complete',
    uploadProgress: 100,
    uploadedAt: new Date()
  };
  
  project.completedSteps.audioUpload = true;
  
  if (project.workflowState === 'initial') {
    project.workflowState = 'audio_uploaded';
  }
  
  project.activityLog.push({
    action: 'audio_uploaded',
    performedBy: project.creator,
    details: { 
      filename: audioFileData.originalFilename,
      duration: audioFileData.duration
    }
  });
  
  // Update project status
  if (project.status === 'draft') {
    project.status = 'in_progress';
  }
  
  return project.save();
};

// Update project metadata
vaultProjectSchema.statics.updateMetadata = async function(projectId, metadata) {
  const project = await this.findOne({ projectId });
  if (!project) {
    throw new Error('Project not found');
  }
  
  project.title = metadata.title || project.title;
  project.description = metadata.description || project.description;
  project.metadata = {
    ...project.metadata,
    ...metadata
  };
  
  if (metadata.hashtags) {
    project.hashtags = metadata.hashtags;
  }
  
  project.completedSteps.metadataEntry = true;
  
  if (project.workflowState === 'audio_uploaded') {
    project.workflowState = 'metadata_added';
  }
  
  project.activityLog.push({
    action: 'metadata_updated',
    performedBy: metadata.updatedBy || project.creator,
    details: { updatedFields: Object.keys(metadata) }
  });
  
  return project.save();
};

// Process fingerprint check
vaultProjectSchema.statics.processFingerprintCheck = async function(projectId, fingerprintResults) {
  const project = await this.findOne({ projectId });
  if (!project) {
    throw new Error('Project not found');
  }
  
  project.fingerprintData = {
    fingerprintHash: fingerprintResults.fingerprintHash,
    checkedAt: new Date(),
    matchFound: fingerprintResults.matchFound,
    matchDetails: fingerprintResults.matchDetails || [],
    shazamResults: fingerprintResults.shazamResults || null
  };
  
  project.completedSteps.fingerprintCheck = true;
  
  // Update copyright status based on fingerprint results
  if (fingerprintResults.matchFound) {
    const hasCriticalMatch = fingerprintResults.matchDetails.some(
      match => match.matchScore > 85 && match.matchType === 'exact'
    );
    
    if (hasCriticalMatch) {
      project.copyrightStatus = 'flagged';
      project.copyrightFlags.push({
        flagType: 'exact_match',
        severity: 'critical',
        description: 'Exact audio match detected through fingerprinting',
        flaggedAt: new Date(),
        flaggedBy: 'system'
      });
      project.dsrcConversion.isEligible = false;
      project.dsrcConversion.eligibilityIssues = [
        ...(project.dsrcConversion.eligibilityIssues || []),
        'Copyright violation detected'
      ];
    } else {
      const hasPartialMatch = fingerprintResults.matchDetails.some(
        match => match.matchScore > 60 && ['partial', 'sample'].includes(match.matchType)
      );
      
      if (hasPartialMatch) {
        project.copyrightStatus = 'potential_issue';
        project.copyrightFlags.push({
          flagType: 'sample_detected',
          severity: 'medium',
          description: 'Potential sample or partial match detected',
          flaggedAt: new Date(),
          flaggedBy: 'system'
        });
      } else {
        project.copyrightStatus = 'clear';
      }
    }
  } else {
    project.copyrightStatus = 'clear';
  }
  
  if (project.workflowState === 'metadata_added') {
    project.workflowState = 'fingerprint_checked';
  }
  
  project.activityLog.push({
    action: 'fingerprint_checked',
    performedBy: 'system',
    details: { 
      matchFound: fingerprintResults.matchFound,
      copyrightStatus: project.copyrightStatus
    }
  });
  
  // Check DSRC conversion eligibility
  await this.updateConversionEligibility(project);
  
  return project.save();
};

// Update licensing configuration
vaultProjectSchema.statics.updateLicensing = async function(projectId, licensingData) {
  const project = await this.findOne({ projectId });
  if (!project) {
    throw new Error('Project not found');
  }
  
  project.licensing = {
    ...project.licensing,
    ...licensingData
  };
  
  project.completedSteps.licensingSetup = true;
  
  if (project.workflowState === 'fingerprint_checked') {
    project.workflowState = 'licensing_configured';
  }
  
  project.activityLog.push({
    action: 'licensing_updated',
    performedBy: licensingData.updatedBy || project.creator,
    details: { updatedFields: Object.keys(licensingData) }
  });
  
  // Check DSRC conversion eligibility
  await this.updateConversionEligibility(project);
  
  return project.save();
};

// Update release settings
vaultProjectSchema.statics.updateReleaseSettings = async function(projectId, releaseData) {
  const project = await this.findOne({ projectId });
  if (!project) {
    throw new Error('Project not found');
  }
  
  project.releaseSettings = {
    ...project.releaseSettings,
    ...releaseData
  };
  
  // Update editions if provided
  if (releaseData.editions) {
    project.editions = {
      ...project.editions,
      ...releaseData.editions
    };
  }
  
  project.completedSteps.releaseSetup = true;
  
  if (project.workflowState === 'licensing_configured') {
    project.workflowState = 'release_configured';
  }
  
  project.activityLog.push({
    action: 'release_configured',
    performedBy: releaseData.updatedBy || project.creator,
    details: { updatedFields: Object.keys(releaseData) }
  });
  
  // Check DSRC conversion eligibility
  await this.updateConversionEligibility(project);
  
  return project.save();
};

// Update revenue splits
vaultProjectSchema.statics.updateRevenueSplits = async function(projectId, revenueSplits) {
  const project = await this.findOne({ projectId });
  if (!project) {
    throw new Error('Project not found');
  }
  
  // Validate total percentage equals 100%
  const totalPercentage = revenueSplits.reduce((sum, split) => sum + split.percentage, 0);
  if (totalPercentage !== 100) {
    throw new Error('Total revenue percentage must equal 100%');
  }
  
  project.revenueSplits = revenueSplits;
  
  // Check DSRC conversion eligibility
  await this.updateConversionEligibility(project);
  
  return project.save();
};

// Update cartridge visual
vaultProjectSchema.statics.updateCartridgeVisual = async function(projectId, visualData) {
  const project = await this.findOne({ projectId });
  if (!project) {
    throw new Error('Project not found');
  }
  
  project.cartridgeVisual = {
    ...project.cartridgeVisual,
    ...visualData
  };
  
  return project.save();
};

// Manage collaborators
vaultProjectSchema.statics.addCollaborator = async function(projectId, collaboratorData) {
  const project = await this.findOne({ projectId });
  if (!project) {
    throw new Error('Project not found');
  }
  
  // Check if collaborator already exists
  const existingIndex = project.collaborators.findIndex(
    c => c.walletAddress === collaboratorData.walletAddress
  );
  
  if (existingIndex >= 0) {
    // Update existing collaborator
    project.collaborators[existingIndex] = {
      ...project.collaborators[existingIndex],
      ...collaboratorData,
      invitedAt: project.collaborators[existingIndex].invitedAt
    };
  } else {
    // Add new collaborator
    project.collaborators.push({
      ...collaboratorData,
      invitedAt: new Date()
    });
  }
  
  project.activityLog.push({
    action: 'collaborator_added',
    performedBy: collaboratorData.invitedBy || project.creator,
    details: { 
      collaborator: collaboratorData.walletAddress,
      role: collaboratorData.role
    }
  });
  
  return project.save();
};

vaultProjectSchema.statics.removeCollaborator = async function(projectId, walletAddress, removedBy) {
  const project = await this.findOne({ projectId });
  if (!project) {
    throw new Error('Project not found');
  }
  
  // Check if collaborator exists
  const existingIndex = project.collaborators.findIndex(
    c => c.walletAddress === walletAddress
  );
  
  if (existingIndex < 0) {
    throw new Error('Collaborator not found');
  }
  
  // Remove collaborator
  project.collaborators.splice(existingIndex, 1);
  
  project.activityLog.push({
    action: 'collaborator_removed',
    performedBy: removedBy || project.creator,
    details: { 
      collaborator: walletAddress
    }
  });
  
  return project.save();
};

// Check and update DSRC conversion eligibility
vaultProjectSchema.statics.updateConversionEligibility = async function(project) {
  const eligibilityIssues = [];
  
  // Check required steps
  if (!project.completedSteps.audioUpload) {
    eligibilityIssues.push('Audio file not uploaded');
  }
  
  if (!project.completedSteps.metadataEntry) {
    eligibilityIssues.push('Metadata not complete');
  }
  
  if (!project.completedSteps.fingerprintCheck) {
    eligibilityIssues.push('Fingerprint check not completed');
  }
  
  // Check copyright status
  if (project.copyrightStatus === 'flagged') {
    eligibilityIssues.push('Copyright violation detected');
  } else if (project.copyrightStatus === 'potential_issue') {
    eligibilityIssues.push('Potential copyright issue needs review');
  }
  
  // Check revenue splits
  if (!project.revenueSplits || project.revenueSplits.length === 0) {
    eligibilityIssues.push('Revenue splits not configured');
  } else {
    const totalPercentage = project.revenueSplits.reduce((sum, split) => sum + split.percentage, 0);
    if (totalPercentage !== 100) {
      eligibilityIssues.push('Revenue splits do not total 100%');
    }
  }
  
  // Update eligibility status
  project.dsrcConversion.eligibilityIssues = eligibilityIssues;
  project.dsrcConversion.isEligible = eligibilityIssues.length === 0;
  
  // Update workflow state if eligible
  if (project.dsrcConversion.isEligible && 
      project.workflowState === 'release_configured') {
    project.workflowState = 'ready_for_conversion';
    project.status = 'ready';
  }
  
  return project;
};

// Convert to DSRC
vaultProjectSchema.statics.convertToDSRC = async function(projectId, dsrcData) {
  const project = await this.findOne({ projectId });
  if (!project) {
    throw new Error('Project not found');
  }
  
  if (!project.dsrcConversion.isEligible) {
    throw new Error('Project not eligible for DSRC conversion: ' + 
                   project.dsrcConversion.eligibilityIssues.join(', '));
  }
  
  // Update conversion data
  project.dsrcConversion = {
    ...project.dsrcConversion,
    convertedToDSRC: true,
    dsrcId: dsrcData.dsrcId,
    conversionDate: new Date(),
    conversionTransactionHash: dsrcData.transactionHash
  };
  
  project.workflowState = 'converted';
  project.status = 'published';
  
  project.activityLog.push({
    action: 'converted_to_dsrc',
    performedBy: dsrcData.convertedBy || project.creator,
    details: { 
      dsrcId: dsrcData.dsrcId,
      transactionHash: dsrcData.transactionHash
    }
  });
  
  return project.save();
};

// Archive project
vaultProjectSchema.statics.archiveProject = async function(projectId, archivedBy) {
  const project = await this.findOne({ projectId });
  if (!project) {
    throw new Error('Project not found');
  }
  
  project.status = 'archived';
  project.workflowState = 'archived';
  
  project.activityLog.push({
    action: 'project_archived',
    performedBy: archivedBy || project.creator,
    details: { 
      archivedAt: new Date()
    }
  });
  
  return project.save();
};

// Get projects by creator
vaultProjectSchema.statics.getProjectsByCreator = async function(creator, page = 1, limit = 20, filters = {}) {
  const skip = (page - 1) * limit;
  
  const query = { creator };
  
  // Apply filters
  if (filters.status) {
    query.status = filters.status;
  }
  
  if (filters.audioType) {
    query.audioType = filters.audioType;
  }
  
  if (filters.copyrightStatus) {
    query.copyrightStatus = filters.copyrightStatus;
  }
  
  if (filters.convertedToDSRC !== undefined) {
    query['dsrcConversion.convertedToDSRC'] = filters.convertedToDSRC;
  }
  
  const [projects, totalCount] = await Promise.all([
    this.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v'),
    
    this.countDocuments(query)
  ]);

  return {
    projects,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit),
    totalProjects: totalCount
  };
};

// Get projects by collaborator
vaultProjectSchema.statics.getProjectsByCollaborator = async function(walletAddress, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  const [projects, totalCount] = await Promise.all([
    this.find({ 'collaborators.walletAddress': walletAddress })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v'),
    
    this.countDocuments({ 'collaborators.walletAddress': walletAddress })
  ]);

  return {
    projects,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit),
    totalProjects: totalCount
  };
};

// Search projects
vaultProjectSchema.statics.searchProjects = async function(query, creator, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  const searchQuery = {
    $and: [
      { creator },
      { $text: { $search: query } }
    ]
  };
  
  const [projects, totalCount] = await Promise.all([
    this.find(searchQuery)
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(limit)
      .select('-__v'),
    
    this.countDocuments(searchQuery)
  ]);

  return {
    projects,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit),
    totalProjects: totalCount
  };
};

// Create the model
const VaultProject = mongoose.models.VaultProject || mongoose.model('VaultProject', vaultProjectSchema);

export default VaultProject;
