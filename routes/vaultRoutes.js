import express from 'express';
import { 
  createProject,
  getProject,
  updateMetadata,
  uploadAudio,
  processFingerprintCheck,
  updateLicensing,
  updateReleaseSettings,
  updateRevenueSplits,
  convertToDSRC,
  getProjectsByCreator,
  getProjectsByCollaborator,
  archiveProject,
  addCollaborator,
  removeCollaborator,
  updateCartridgeVisual,
  searchProjects
} from '../controllers/vaultController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @route   POST /api/vault/projects
 * @desc    Create a new vault project
 * @access  Private
 * @body    {
 *            title: String (required),
 *            description: String,
 *            audioType: String - 'song', 'beat', 'loop', or 'sfx'
 *          }
 */
router.post('/projects', authMiddleware, createProject);

/**
 * @route   GET /api/vault/projects/:projectId
 * @desc    Get project details
 * @access  Private
 * @param   projectId - Project ID
 */
router.get('/projects/:projectId', authMiddleware, getProject);

/**
 * @route   PUT /api/vault/projects/:projectId/metadata
 * @desc    Update project metadata
 * @access  Private
 * @param   projectId - Project ID
 * @body    {
 *            title: String,
 *            description: String,
 *            metadata: Object,
 *            hashtags: Array
 *          }
 */
router.put('/projects/:projectId/metadata', authMiddleware, updateMetadata);

/**
 * @route   POST /api/vault/projects/:projectId/audio
 * @desc    Upload audio file for project
 * @access  Private
 * @param   projectId - Project ID
 * @body    {
 *            originalFilename: String (required),
 *            uploadHash: String (required),
 *            duration: Number (required),
 *            fileSize: Number (required),
 *            format: String (required),
 *            bitrate: Number,
 *            sampleRate: Number,
 *            channels: Number
 *          }
 */
router.post('/projects/:projectId/audio', authMiddleware, uploadAudio);

/**
 * @route   POST /api/vault/projects/:projectId/fingerprint
 * @desc    Process fingerprint check for project
 * @access  Private
 * @param   projectId - Project ID
 * @body    {
 *            fingerprintHash: String (required),
 *            matchFound: Boolean (required),
 *            matchDetails: Array,
 *            shazamResults: Object
 *          }
 */
router.post('/projects/:projectId/fingerprint', authMiddleware, processFingerprintCheck);

/**
 * @route   PUT /api/vault/projects/:projectId/licensing
 * @desc    Update licensing settings for project
 * @access  Private
 * @param   projectId - Project ID
 * @body    {
 *            licensingEnabled: Boolean,
 *            licenseType: String - 'all_rights_reserved', 'creative_commons', 'custom',
 *            creativeCommonsType: String,
 *            customLicenseTerms: String,
 *            allowCommercialUse: Boolean,
 *            allowRemixing: Boolean,
 *            allowSampling: Boolean,
 *            requireAttribution: Boolean,
 *            territoryRestrictions: Array,
 *            licenseTemplates: Array
 *          }
 */
router.put('/projects/:projectId/licensing', authMiddleware, updateLicensing);

/**
 * @route   PUT /api/vault/projects/:projectId/release
 * @desc    Update release settings for project
 * @access  Private
 * @param   projectId - Project ID
 * @body    {
 *            releaseType: String - 'immediate', 'scheduled', 'manual',
 *            scheduledReleaseDate: Date,
 *            visibility: String - 'public', 'unlisted', 'private',
 *            releaseNotes: String,
 *            assignToCollection: Boolean,
 *            collectionId: String,
 *            trackOrder: Number,
 *            enableSnipCreation: Boolean,
 *            snipStartTime: Number,
 *            snipDuration: Number,
 *            editions: Object
 *          }
 */
router.put('/projects/:projectId/release', authMiddleware, updateReleaseSettings);

/**
 * @route   PUT /api/vault/projects/:projectId/revenue
 * @desc    Update revenue splits for project
 * @access  Private
 * @param   projectId - Project ID
 * @body    {
 *            revenueSplits: Array (required) - Array of revenue split objects
 *          }
 */
router.put('/projects/:projectId/revenue', authMiddleware, updateRevenueSplits);

/**
 * @route   POST /api/vault/projects/:projectId/convert
 * @desc    Convert project to DSRC
 * @access  Private
 * @param   projectId - Project ID
 * @body    {
 *            dsrcId: String (required),
 *            transactionHash: String (required)
 *          }
 */
router.post('/projects/:projectId/convert', authMiddleware, convertToDSRC);

/**
 * @route   GET /api/vault/projects/creator/:creator
 * @desc    Get projects by creator
 * @access  Private
 * @param   creator - Creator wallet address
 * @query   page - Page number (default: 1)
 * @query   limit - Results per page (default: 20, max: 100)
 * @query   status - Filter by status
 * @query   audioType - Filter by audio type
 * @query   copyrightStatus - Filter by copyright status
 * @query   convertedToDSRC - Filter by conversion status (true/false)
 */
router.get('/projects/creator/:creator', authMiddleware, getProjectsByCreator);

/**
 * @route   GET /api/vault/projects/collaborations
 * @desc    Get projects where user is a collaborator
 * @access  Private
 * @query   page - Page number (default: 1)
 * @query   limit - Results per page (default: 20, max: 100)
 */
router.get('/projects/collaborations', authMiddleware, getProjectsByCollaborator);

/**
 * @route   PUT /api/vault/projects/:projectId/archive
 * @desc    Archive a project
 * @access  Private
 * @param   projectId - Project ID
 */
router.put('/projects/:projectId/archive', authMiddleware, archiveProject);

/**
 * @route   POST /api/vault/projects/:projectId/collaborators
 * @desc    Add a collaborator to a project
 * @access  Private
 * @param   projectId - Project ID
 * @body    {
 *            walletAddress: String (required),
 *            role: String (required) - 'viewer', 'editor', or 'admin'
 *          }
 */
router.post('/projects/:projectId/collaborators', authMiddleware, addCollaborator);

/**
 * @route   DELETE /api/vault/projects/:projectId/collaborators/:walletAddress
 * @desc    Remove a collaborator from a project
 * @access  Private
 * @param   projectId - Project ID
 * @param   walletAddress - Collaborator wallet address
 */
router.delete('/projects/:projectId/collaborators/:walletAddress', authMiddleware, removeCollaborator);

/**
 * @route   PUT /api/vault/projects/:projectId/cartridge
 * @desc    Update cartridge visual for project
 * @access  Private
 * @param   projectId - Project ID
 * @body    {
 *            color: String,
 *            style: String - 'standard', 'vintage', 'futuristic', 'minimal', 'custom',
 *            coverArtUrl: String,
 *            coverArtHash: String,
 *            visualState: String - 'pristine', 'worn', 'damaged', 'legendary'
 *          }
 */
router.put('/projects/:projectId/cartridge', authMiddleware, updateCartridgeVisual);

/**
 * @route   GET /api/vault/projects/search
 * @desc    Search projects
 * @access  Private
 * @query   q - Search query (required)
 * @query   page - Page number (default: 1)
 * @query   limit - Results per page (default: 20, max: 100)
 */
router.get('/projects/search', authMiddleware, searchProjects);

export default router;
