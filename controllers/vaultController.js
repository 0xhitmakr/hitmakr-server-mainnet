import VaultProject from '../models/VaultProject.js';
import { body, param, query, validationResult } from 'express-validator';
import mongoose from 'mongoose';

// Create a new vault project
export const createProject = [
  // Validation middleware
  body('title').trim().notEmpty().withMessage('Project title is required'),
  body('description').optional(),
  body('audioType').optional().isIn(['song', 'beat', 'loop', 'sfx']).withMessage('Invalid audio type'),
  
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Create project data
      const projectData = {
        title: req.body.title,
        description: req.body.description || '',
        creator: req.user.walletAddress.toLowerCase(),
        audioType: req.body.audioType || 'song'
      };

      // Create the project
      const project = await VaultProject.createProject(projectData);
      
      res.status(201).json({
        success: true,
        message: 'Project created successfully',
        project
      });
    } catch (error) {
      console.error('Error creating vault project:', error);
      res.status(500).json({ error: 'Failed to create project', details: error.message });
    }
  }
];

// Get project details
export const getProject = [
  param('projectId').trim().notEmpty().withMessage('Project ID is required'),
  
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const project = await VaultProject.findOne({ projectId: req.params.projectId });
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check if user has access to the project
      const isCreator = project.creator.toLowerCase() === req.user.walletAddress.toLowerCase();
      const isCollaborator = project.collaborators.some(
        c => c.walletAddress.toLowerCase() === req.user.walletAddress.toLowerCase()
      );

      if (!isCreator && !isCollaborator) {
        return res.status(403).json({ error: 'Unauthorized: You do not have access to this project' });
      }

      res.status(200).json({
        success: true,
        project
      });
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({ error: 'Failed to fetch project', details: error.message });
    }
  }
];

// Update project metadata
export const updateMetadata = [
  param('projectId').trim().notEmpty().withMessage('Project ID is required'),
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('description').optional(),
  body('metadata').optional().isObject().withMessage('Metadata must be an object'),
  body('hashtags').optional().isArray().withMessage('Hashtags must be an array'),
  
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Find the project
      const project = await VaultProject.findOne({ projectId: req.params.projectId });
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check if user has edit access
      const isCreator = project.creator.toLowerCase() === req.user.walletAddress.toLowerCase();
      const isEditor = project.collaborators.some(
        c => c.walletAddress.toLowerCase() === req.user.walletAddress.toLowerCase() && 
             ['editor', 'admin'].includes(c.role)
      );

      if (!isCreator && !isEditor) {
        return res.status(403).json({ error: 'Unauthorized: You do not have edit access to this project' });
      }

      // Prepare metadata update
      const metadata = {
        ...req.body,
        updatedBy: req.user.walletAddress.toLowerCase()
      };

      // Update project metadata
      const updatedProject = await VaultProject.updateMetadata(req.params.projectId, metadata);
      
      res.status(200).json({
        success: true,
        message: 'Project metadata updated successfully',
        project: updatedProject
      });
    } catch (error) {
      console.error('Error updating project metadata:', error);
      res.status(500).json({ error: 'Failed to update project metadata', details: error.message });
    }
  }
];

// Upload audio file
export const uploadAudio = [
  param('projectId').trim().notEmpty().withMessage('Project ID is required'),
  body('originalFilename').trim().notEmpty().withMessage('Original filename is required'),
  body('uploadHash').trim().notEmpty().withMessage('Upload hash is required'),
  body('duration').isNumeric().withMessage('Duration must be a number'),
  body('fileSize').isNumeric().withMessage('File size must be a number'),
  body('format').trim().notEmpty().withMessage('Format is required'),
  body('bitrate').optional().isNumeric().withMessage('Bitrate must be a number'),
  body('sampleRate').optional().isNumeric().withMessage('Sample rate must be a number'),
  body('channels').optional().isNumeric().withMessage('Channels must be a number'),
  
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Find the project
      const project = await VaultProject.findOne({ projectId: req.params.projectId });
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check if user has edit access
      const isCreator = project.creator.toLowerCase() === req.user.walletAddress.toLowerCase();
      const isEditor = project.collaborators.some(
        c => c.walletAddress.toLowerCase() === req.user.walletAddress.toLowerCase() && 
             ['editor', 'admin'].includes(c.role)
      );

      if (!isCreator && !isEditor) {
        return res.status(403).json({ error: 'Unauthorized: You do not have edit access to this project' });
      }

      // Prepare audio file data
      const audioFileData = {
        originalFilename: req.body.originalFilename,
        uploadHash: req.body.uploadHash,
        duration: req.body.duration,
        fileSize: req.body.fileSize,
        format: req.body.format,
        bitrate: req.body.bitrate,
        sampleRate: req.body.sampleRate,
        channels: req.body.channels
      };

      // Update project with audio file
      const updatedProject = await VaultProject.updateAudioFile(req.params.projectId, audioFileData);
      
      res.status(200).json({
        success: true,
        message: 'Audio file uploaded successfully',
        project: updatedProject
      });
    } catch (error) {
      console.error('Error uploading audio file:', error);
      res.status(500).json({ error: 'Failed to upload audio file', details: error.message });
    }
  }
];

// Process fingerprint check
export const processFingerprintCheck = [
  param('projectId').trim().notEmpty().withMessage('Project ID is required'),
  body('fingerprintHash').trim().notEmpty().withMessage('Fingerprint hash is required'),
  body('matchFound').isBoolean().withMessage('Match found must be a boolean'),
  body('matchDetails').optional().isArray().withMessage('Match details must be an array'),
  body('shazamResults').optional(),
  
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Find the project
      const project = await VaultProject.findOne({ projectId: req.params.projectId });
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Fingerprint check can be run by system or by users with edit access
      if (req.user.walletAddress.toLowerCase() !== 'system') {
        const isCreator = project.creator.toLowerCase() === req.user.walletAddress.toLowerCase();
        const isEditor = project.collaborators.some(
          c => c.walletAddress.toLowerCase() === req.user.walletAddress.toLowerCase() && 
               ['editor', 'admin'].includes(c.role)
        );

        if (!isCreator && !isEditor) {
          return res.status(403).json({ error: 'Unauthorized: You do not have edit access to this project' });
        }
      }

      // Prepare fingerprint results
      const fingerprintResults = {
        fingerprintHash: req.body.fingerprintHash,
        matchFound: req.body.matchFound,
        matchDetails: req.body.matchDetails || [],
        shazamResults: req.body.shazamResults || null
      };

      // Process fingerprint check
      const updatedProject = await VaultProject.processFingerprintCheck(req.params.projectId, fingerprintResults);
      
      res.status(200).json({
        success: true,
        message: 'Fingerprint check processed successfully',
        project: updatedProject,
        copyrightStatus: updatedProject.copyrightStatus,
        conversionEligible: updatedProject.dsrcConversion.isEligible
      });
    } catch (error) {
      console.error('Error processing fingerprint check:', error);
      res.status(500).json({ error: 'Failed to process fingerprint check', details: error.message });
    }
  }
];

// Update licensing settings
export const updateLicensing = [
  param('projectId').trim().notEmpty().withMessage('Project ID is required'),
  body('licensingEnabled').optional().isBoolean().withMessage('Licensing enabled must be a boolean'),
  body('licenseType').optional().isIn(['all_rights_reserved', 'creative_commons', 'custom']).withMessage('Invalid license type'),
  body('creativeCommonsType').optional(),
  body('customLicenseTerms').optional(),
  body('allowCommercialUse').optional().isBoolean().withMessage('Allow commercial use must be a boolean'),
  body('allowRemixing').optional().isBoolean().withMessage('Allow remixing must be a boolean'),
  body('allowSampling').optional().isBoolean().withMessage('Allow sampling must be a boolean'),
  body('requireAttribution').optional().isBoolean().withMessage('Require attribution must be a boolean'),
  body('territoryRestrictions').optional().isArray().withMessage('Territory restrictions must be an array'),
  body('licenseTemplates').optional().isArray().withMessage('License templates must be an array'),
  
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Find the project
      const project = await VaultProject.findOne({ projectId: req.params.projectId });
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check if user has edit access
      const isCreator = project.creator.toLowerCase() === req.user.walletAddress.toLowerCase();
      const isEditor = project.collaborators.some(
        c => c.walletAddress.toLowerCase() === req.user.walletAddress.toLowerCase() && 
             ['editor', 'admin'].includes(c.role)
      );

      if (!isCreator && !isEditor) {
        return res.status(403).json({ error: 'Unauthorized: You do not have edit access to this project' });
      }

      // Prepare licensing data
      const licensingData = {
        ...req.body,
        updatedBy: req.user.walletAddress.toLowerCase()
      };

      // Update licensing settings
      const updatedProject = await VaultProject.updateLicensing(req.params.projectId, licensingData);
      
      res.status(200).json({
        success: true,
        message: 'Licensing settings updated successfully',
        project: updatedProject,
        conversionEligible: updatedProject.dsrcConversion.isEligible
      });
    } catch (error) {
      console.error('Error updating licensing settings:', error);
      res.status(500).json({ error: 'Failed to update licensing settings', details: error.message });
    }
  }
];

// Update release settings
export const updateReleaseSettings = [
  param('projectId').trim().notEmpty().withMessage('Project ID is required'),
  body('releaseType').optional().isIn(['immediate', 'scheduled', 'manual']).withMessage('Invalid release type'),
  body('scheduledReleaseDate').optional().isISO8601().withMessage('Invalid date format'),
  body('visibility').optional().isIn(['public', 'unlisted', 'private']).withMessage('Invalid visibility'),
  body('releaseNotes').optional(),
  body('assignToCollection').optional().isBoolean().withMessage('Assign to collection must be a boolean'),
  body('collectionId').optional(),
  body('trackOrder').optional().isInt({ min: 1 }).withMessage('Track order must be a positive integer'),
  body('enableSnipCreation').optional().isBoolean().withMessage('Enable snip creation must be a boolean'),
  body('snipStartTime').optional().isNumeric().withMessage('Snip start time must be a number'),
  body('snipDuration').optional().isNumeric().withMessage('Snip duration must be a number'),
  body('editions').optional().isObject().withMessage('Editions must be an object'),
  
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Find the project
      const project = await VaultProject.findOne({ projectId: req.params.projectId });
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check if user has edit access
      const isCreator = project.creator.toLowerCase() === req.user.walletAddress.toLowerCase();
      const isEditor = project.collaborators.some(
        c => c.walletAddress.toLowerCase() === req.user.walletAddress.toLowerCase() && 
             ['editor', 'admin'].includes(c.role)
      );

      if (!isCreator && !isEditor) {
        return res.status(403).json({ error: 'Unauthorized: You do not have edit access to this project' });
      }

      // Prepare release data
      const releaseData = {
        ...req.body,
        updatedBy: req.user.walletAddress.toLowerCase()
      };

      // Update release settings
      const updatedProject = await VaultProject.updateReleaseSettings(req.params.projectId, releaseData);
      
      res.status(200).json({
        success: true,
        message: 'Release settings updated successfully',
        project: updatedProject,
        conversionEligible: updatedProject.dsrcConversion.isEligible,
        workflowState: updatedProject.workflowState
      });
    } catch (error) {
      console.error('Error updating release settings:', error);
      res.status(500).json({ error: 'Failed to update release settings', details: error.message });
    }
  }
];

// Update revenue splits
export const updateRevenueSplits = [
  param('projectId').trim().notEmpty().withMessage('Project ID is required'),
  body('revenueSplits').isArray().withMessage('Revenue splits must be an array'),
  body('revenueSplits.*.walletAddress').trim().notEmpty().withMessage('Wallet address is required'),
  body('revenueSplits.*.percentage').isFloat({ min: 0, max: 100 }).withMessage('Percentage must be between 0 and 100'),
  body('revenueSplits.*.role').optional().isIn(['creator', 'collaborator', 'producer', 'writer', 'publisher', 'label', 'other']).withMessage('Invalid role'),
  
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Find the project
      const project = await VaultProject.findOne({ projectId: req.params.projectId });
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check if user has edit access
      const isCreator = project.creator.toLowerCase() === req.user.walletAddress.toLowerCase();
      const isAdmin = project.collaborators.some(
        c => c.walletAddress.toLowerCase() === req.user.walletAddress.toLowerCase() && c.role === 'admin'
      );

      if (!isCreator && !isAdmin) {
        return res.status(403).json({ error: 'Unauthorized: Only the creator or admin collaborators can update revenue splits' });
      }

      // Update revenue splits
      const updatedProject = await VaultProject.updateRevenueSplits(req.params.projectId, req.body.revenueSplits);
      
      res.status(200).json({
        success: true,
        message: 'Revenue splits updated successfully',
        project: updatedProject,
        conversionEligible: updatedProject.dsrcConversion.isEligible
      });
    } catch (error) {
      console.error('Error updating revenue splits:', error);
      res.status(500).json({ error: 'Failed to update revenue splits', details: error.message });
    }
  }
];

// Convert to DSRC
export const convertToDSRC = [
  param('projectId').trim().notEmpty().withMessage('Project ID is required'),
  body('dsrcId').trim().notEmpty().withMessage('DSRC ID is required'),
  body('transactionHash').trim().notEmpty().withMessage('Transaction hash is required'),
  
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Find the project
      const project = await VaultProject.findOne({ projectId: req.params.projectId });
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check if user has permission to convert
      const isCreator = project.creator.toLowerCase() === req.user.walletAddress.toLowerCase();
      if (!isCreator) {
        return res.status(403).json({ error: 'Unauthorized: Only the creator can convert this project to a DSRC' });
      }

      // Check if project is eligible for conversion
      if (!project.dsrcConversion.isEligible) {
        return res.status(400).json({ 
          error: 'Project is not eligible for conversion', 
          issues: project.dsrcConversion.eligibilityIssues 
        });
      }

      // Prepare DSRC data
      const dsrcData = {
        dsrcId: req.body.dsrcId,
        transactionHash: req.body.transactionHash,
        convertedBy: req.user.walletAddress.toLowerCase()
      };

      // Convert to DSRC
      const updatedProject = await VaultProject.convertToDSRC(req.params.projectId, dsrcData);
      
      res.status(200).json({
        success: true,
        message: 'Project successfully converted to DSRC',
        project: updatedProject,
        dsrcId: updatedProject.dsrcConversion.dsrcId
      });
    } catch (error) {
      console.error('Error converting project to DSRC:', error);
      res.status(500).json({ error: 'Failed to convert project to DSRC', details: error.message });
    }
  }
];

// Get projects by creator
export const getProjectsByCreator = [
  param('creator').trim().notEmpty().withMessage('Creator address is required'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional(),
  query('audioType').optional(),
  query('copyrightStatus').optional(),
  query('convertedToDSRC').optional().isBoolean().withMessage('Converted to DSRC must be a boolean'),
  
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const creator = req.params.creator.toLowerCase();

      // Check if user is requesting their own projects or has admin access
      if (req.user.walletAddress.toLowerCase() !== creator && !req.user.isAdmin) {
        return res.status(403).json({ error: 'Unauthorized: You can only view your own projects' });
      }

      // Prepare filters
      const filters = {};
      if (req.query.status) filters.status = req.query.status;
      if (req.query.audioType) filters.audioType = req.query.audioType;
      if (req.query.copyrightStatus) filters.copyrightStatus = req.query.copyrightStatus;
      if (req.query.convertedToDSRC !== undefined) filters.convertedToDSRC = req.query.convertedToDSRC === 'true';

      const result = await VaultProject.getProjectsByCreator(creator, page, limit, filters);
      
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error fetching projects by creator:', error);
      res.status(500).json({ error: 'Failed to fetch projects', details: error.message });
    }
  }
];

// Get projects by collaborator
export const getProjectsByCollaborator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const walletAddress = req.user.walletAddress.toLowerCase();

      const result = await VaultProject.getProjectsByCollaborator(walletAddress, page, limit);
      
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error fetching projects by collaborator:', error);
      res.status(500).json({ error: 'Failed to fetch projects', details: error.message });
    }
  }
];

// Archive project
export const archiveProject = [
  param('projectId').trim().notEmpty().withMessage('Project ID is required'),
  
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Find the project
      const project = await VaultProject.findOne({ projectId: req.params.projectId });
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check if user has permission to archive
      const isCreator = project.creator.toLowerCase() === req.user.walletAddress.toLowerCase();
      const isAdmin = project.collaborators.some(
        c => c.walletAddress.toLowerCase() === req.user.walletAddress.toLowerCase() && c.role === 'admin'
      );

      if (!isCreator && !isAdmin) {
        return res.status(403).json({ error: 'Unauthorized: Only the creator or admin collaborators can archive this project' });
      }

      // Archive the project
      const updatedProject = await VaultProject.archiveProject(
        req.params.projectId, 
        req.user.walletAddress.toLowerCase()
      );
      
      res.status(200).json({
        success: true,
        message: 'Project archived successfully',
        project: updatedProject
      });
    } catch (error) {
      console.error('Error archiving project:', error);
      res.status(500).json({ error: 'Failed to archive project', details: error.message });
    }
  }
];

// Add collaborator
export const addCollaborator = [
  param('projectId').trim().notEmpty().withMessage('Project ID is required'),
  body('walletAddress').trim().notEmpty().withMessage('Wallet address is required'),
  body('role').isIn(['viewer', 'editor', 'admin']).withMessage('Invalid role'),
  
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Find the project
      const project = await VaultProject.findOne({ projectId: req.params.projectId });
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check if user has permission to add collaborators
      const isCreator = project.creator.toLowerCase() === req.user.walletAddress.toLowerCase();
      const isAdmin = project.collaborators.some(
        c => c.walletAddress.toLowerCase() === req.user.walletAddress.toLowerCase() && c.role === 'admin'
      );

      if (!isCreator && !isAdmin) {
        return res.status(403).json({ error: 'Unauthorized: Only the creator or admin collaborators can add collaborators' });
      }

      // Prepare collaborator data
      const collaboratorData = {
        walletAddress: req.body.walletAddress.toLowerCase(),
        role: req.body.role,
        invitedBy: req.user.walletAddress.toLowerCase()
      };

      // Add collaborator
      const updatedProject = await VaultProject.addCollaborator(req.params.projectId, collaboratorData);
      
      res.status(200).json({
        success: true,
        message: 'Collaborator added successfully',
        project: updatedProject
      });
    } catch (error) {
      console.error('Error adding collaborator:', error);
      res.status(500).json({ error: 'Failed to add collaborator', details: error.message });
    }
  }
];

// Remove collaborator
export const removeCollaborator = [
  param('projectId').trim().notEmpty().withMessage('Project ID is required'),
  param('walletAddress').trim().notEmpty().withMessage('Wallet address is required'),
  
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Find the project
      const project = await VaultProject.findOne({ projectId: req.params.projectId });
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check if user has permission to remove collaborators
      const isCreator = project.creator.toLowerCase() === req.user.walletAddress.toLowerCase();
      const isAdmin = project.collaborators.some(
        c => c.walletAddress.toLowerCase() === req.user.walletAddress.toLowerCase() && c.role === 'admin'
      );
      const isSelfRemoval = req.user.walletAddress.toLowerCase() === req.params.walletAddress.toLowerCase();

      if (!isCreator && !isAdmin && !isSelfRemoval) {
        return res.status(403).json({ error: 'Unauthorized: Only the creator, admin collaborators, or the collaborator themselves can remove a collaborator' });
      }

      // Remove collaborator
      const updatedProject = await VaultProject.removeCollaborator(
        req.params.projectId, 
        req.params.walletAddress.toLowerCase(),
        req.user.walletAddress.toLowerCase()
      );
      
      res.status(200).json({
        success: true,
        message: 'Collaborator removed successfully',
        project: updatedProject
      });
    } catch (error) {
      console.error('Error removing collaborator:', error);
      res.status(500).json({ error: 'Failed to remove collaborator', details: error.message });
    }
  }
];

// Update cartridge visual
export const updateCartridgeVisual = [
  param('projectId').trim().notEmpty().withMessage('Project ID is required'),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Color must be a valid hex color'),
  body('style').optional().isIn(['standard', 'vintage', 'futuristic', 'minimal', 'custom']).withMessage('Invalid style'),
  body('coverArtUrl').optional(),
  body('coverArtHash').optional(),
  body('visualState').optional().isIn(['pristine', 'worn', 'damaged', 'legendary']).withMessage('Invalid visual state'),
  
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Find the project
      const project = await VaultProject.findOne({ projectId: req.params.projectId });
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check if user has edit access
      const isCreator = project.creator.toLowerCase() === req.user.walletAddress.toLowerCase();
      const isEditor = project.collaborators.some(
        c => c.walletAddress.toLowerCase() === req.user.walletAddress.toLowerCase() && 
             ['editor', 'admin'].includes(c.role)
      );

      if (!isCreator && !isEditor) {
        return res.status(403).json({ error: 'Unauthorized: You do not have edit access to this project' });
      }

      // Update cartridge visual
      const updatedProject = await VaultProject.updateCartridgeVisual(req.params.projectId, req.body);
      
      res.status(200).json({
        success: true,
        message: 'Cartridge visual updated successfully',
        project: updatedProject
      });
    } catch (error) {
      console.error('Error updating cartridge visual:', error);
      res.status(500).json({ error: 'Failed to update cartridge visual', details: error.message });
    }
  }
];

// Search projects
export const searchProjects = [
  query('q').trim().notEmpty().withMessage('Search query is required'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const query = req.query.q;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const creator = req.user.walletAddress.toLowerCase();

      const result = await VaultProject.searchProjects(query, creator, page, limit);
      
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error searching projects:', error);
      res.status(500).json({ error: 'Failed to search projects', details: error.message });
    }
  }
];
