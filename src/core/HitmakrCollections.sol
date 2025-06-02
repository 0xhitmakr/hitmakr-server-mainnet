// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/core/IHitmakrDSRC.sol";
import "../interfaces/core/IHitmakrCollections.sol";

/**
 * @title HitmakrCollections
 * @author Hitmakr Protocol
 * @notice This contract manages collections of DSRCs and handles revenue distribution among DSRCs within a collection.
 * @dev The contract allows creating collections, adding/removing DSRCs, and distributing revenue evenly or with custom weights.
 */
contract HitmakrCollections is IHitmakrCollections, ReentrancyGuard, IERC2981, Ownable {
    using SafeERC20 for IERC20;

    /**
     * @notice Enumeration representing the different distribution types for collection revenue.
     * @dev EVEN: Distribute revenue equally among all DSRCs in the collection.
     * @dev WEIGHTED: Distribute revenue based on custom weights assigned to each DSRC.
     * @dev CUSTOM: Distribute revenue based on a custom distribution function.
     */
    enum DistributionType {
        EVEN,
        WEIGHTED,
        CUSTOM
    }

    /**
     * @notice Structure for defining a collection.
     * @member collectionId Unique identifier for the collection.
     * @member creator Address of the collection creator.
     * @member title Title of the collection.
     * @member description Description of the collection.
     * @member distributionType Type of revenue distribution for the collection.
     * @member dsrcIds Array of DSRC IDs in the collection.
     * @member dsrcAddresses Array of DSRC contract addresses in the collection.
     * @member dsrcWeights Mapping of DSRC addresses to their weights for weighted distribution.
     * @member totalWeight Total weight of all DSRCs for weighted distribution.
     * @member isActive Whether the collection is active.
     * @member createdAt Timestamp when the collection was created.
     */
    struct Collection {
        uint256 collectionId;
        address creator;
        string title;
        string description;
        DistributionType distributionType;
        uint256[] dsrcIds;
        address[] dsrcAddresses;
        mapping(address => uint256) dsrcWeights;
        uint256 totalWeight;
        bool isActive;
        uint256 createdAt;
    }

    /**
     * @notice Structure for tracking collection earnings.
     * @member totalReceived Total revenue received by the collection.
     * @member totalDistributed Total revenue distributed to DSRCs.
     * @member pendingDistribution Pending revenue to be distributed.
     */
    struct CollectionEarnings {
        uint256 totalReceived;
        uint256 totalDistributed;
        uint256 pendingDistribution;
    }

    /**
     * @notice Structure for tracking DSRC distribution details.
     * @member dsrcAddress Address of the DSRC contract.
     * @member amount Amount to distribute to the DSRC.
     */
    struct DistributionDetail {
        address dsrcAddress;
        uint256 amount;
    }

    /// @notice Error: Caller is not authorized to perform the action.
    error Unauthorized();
    /// @notice Error: Collection does not exist.
    error CollectionNotFound();
    /// @notice Error: DSRC already exists in the collection.
    error DSRCAlreadyExists();
    /// @notice Error: DSRC does not exist in the collection.
    error DSRCNotFound();
    /// @notice Error: Invalid distribution type.
    error InvalidDistributionType();
    /// @notice Error: No pending distribution.
    error NoPendingDistribution();
    /// @notice Error: Invalid parameters provided.
    error InvalidParams();
    /// @notice Error: Zero address provided where it's not allowed.
    error ZeroAddress();
    /// @notice Error: Distribution failed.
    error DistributionFailed();
    /// @notice Error: Collection is not active.
    error CollectionNotActive();
    /// @notice Error: DSRC weights do not match DSRC addresses.
    error WeightsMismatch();
    /// @notice Error: Total weight must be greater than zero.
    error InvalidTotalWeight();

    /// @notice Event emitted when a new collection is created.
    event CollectionCreated(uint256 indexed collectionId, address indexed creator, string title, DistributionType distributionType);
    /// @notice Event emitted when a collection is updated.
    event CollectionUpdated(uint256 indexed collectionId, string title, string description, DistributionType distributionType);
    /// @notice Event emitted when a DSRC is added to a collection.
    event DSRCAddedToCollection(uint256 indexed collectionId, uint256 indexed dsrcId, address dsrcAddress, uint256 weight);
    /// @notice Event emitted when a DSRC is removed from a collection.
    event DSRCRemovedFromCollection(uint256 indexed collectionId, uint256 indexed dsrcId, address dsrcAddress);
    /// @notice Event emitted when DSRC weights are updated.
    event DSRCWeightsUpdated(uint256 indexed collectionId, address[] dsrcAddresses, uint256[] weights);
    /// @notice Event emitted when revenue is received by a collection.
    event CollectionRevenueReceived(uint256 indexed collectionId, address indexed sender, uint256 amount);
    /// @notice Event emitted when revenue is distributed to a DSRC.
    event RevenueDistributedToDSRC(uint256 indexed collectionId, address indexed dsrcAddress, uint256 amount);
    /// @notice Event emitted when collection distribution is completed.
    event CollectionDistributionCompleted(uint256 indexed collectionId, uint256 totalAmount, uint256 dsrcCount);
    /// @notice Event emitted when collection status is updated.
    event CollectionStatusUpdated(uint256 indexed collectionId, bool isActive);

    /// @notice The platform fee percentage (5%).
    uint16 public constant PLATFORM_FEE = 500;
    /// @notice Basis points for percentage calculations (100%).
    uint16 public constant BASIS_POINTS = 10000;
    /// @notice Address of the treasury wallet.
    address public constant TREASURY = 0x699FBF0054B72EF2a85A7f587342B620E49f7f46;
    /// @notice ERC20 token used for payments.
    IERC20 public immutable paymentToken;

    /// @notice Counter for collection IDs.
    uint256 private _nextCollectionId = 1;
    /// @notice Mapping from collection ID to Collection.
    mapping(uint256 => Collection) private _collections;
    /// @notice Mapping from collection ID to CollectionEarnings.
    mapping(uint256 => CollectionEarnings) private _collectionEarnings;
    /// @notice Mapping from DSRC ID to collection IDs it belongs to.
    mapping(uint256 => uint256[]) private _dsrcCollections;

    /**
     * @notice Constructor initializes the HitmakrCollections contract.
     * @param _paymentToken Address of the ERC20 payment token.
     */
    constructor(address _paymentToken) Ownable(msg.sender) {
        if (_paymentToken == address(0)) revert ZeroAddress();
        paymentToken = IERC20(_paymentToken);
    }

    /**
     * @notice Creates a new collection.
     * @param title Title of the collection.
     * @param description Description of the collection.
     * @param distributionType Type of revenue distribution for the collection.
     * @param initialDsrcIds Array of initial DSRC IDs to add to the collection.
     * @param initialDsrcAddresses Array of initial DSRC addresses to add to the collection.
     * @param initialWeights Array of weights for initial DSRCs (only used for WEIGHTED distribution).
     * @return collectionId The ID of the newly created collection.
     */
    function createCollection(
        string memory title,
        string memory description,
        DistributionType distributionType,
        uint256[] memory initialDsrcIds,
        address[] memory initialDsrcAddresses,
        uint256[] memory initialWeights
    ) external returns (uint256 collectionId) {
        if (bytes(title).length == 0) revert InvalidParams();
        if (initialDsrcIds.length != initialDsrcAddresses.length) revert InvalidParams();
        if (distributionType == DistributionType.WEIGHTED && initialDsrcAddresses.length != initialWeights.length) revert WeightsMismatch();

        collectionId = _nextCollectionId++;
        Collection storage collection = _collections[collectionId];
        collection.collectionId = collectionId;
        collection.creator = msg.sender;
        collection.title = title;
        collection.description = description;
        collection.distributionType = distributionType;
        collection.isActive = true;
        collection.createdAt = block.timestamp;

        // Add initial DSRCs
        for (uint256 i = 0; i < initialDsrcIds.length; i++) {
            uint256 dsrcId = initialDsrcIds[i];
            address dsrcAddress = initialDsrcAddresses[i];
            
            if (dsrcAddress == address(0)) revert ZeroAddress();
            
            collection.dsrcIds.push(dsrcId);
            collection.dsrcAddresses.push(dsrcAddress);
            
            // Add collection ID to DSRC's collections
            _dsrcCollections[dsrcId].push(collectionId);
            
            // Set weights for weighted distribution
            if (distributionType == DistributionType.WEIGHTED) {
                uint256 weight = initialWeights[i];
                collection.dsrcWeights[dsrcAddress] = weight;
                collection.totalWeight += weight;
                
                emit DSRCAddedToCollection(collectionId, dsrcId, dsrcAddress, weight);
            } else {
                emit DSRCAddedToCollection(collectionId, dsrcId, dsrcAddress, 0);
            }
        }
        
        if (distributionType == DistributionType.WEIGHTED && collection.totalWeight == 0) revert InvalidTotalWeight();

        emit CollectionCreated(collectionId, msg.sender, title, distributionType);
        return collectionId;
    }

    /**
     * @notice Updates an existing collection.
     * @param collectionId The ID of the collection to update.
     * @param title New title of the collection.
     * @param description New description of the collection.
     * @param distributionType New distribution type for the collection.
     */
    function updateCollection(
        uint256 collectionId,
        string memory title,
        string memory description,
        DistributionType distributionType
    ) external {
        Collection storage collection = _collections[collectionId];
        if (collection.collectionId == 0) revert CollectionNotFound();
        if (collection.creator != msg.sender) revert Unauthorized();
        
        collection.title = title;
        collection.description = description;
        
        // If changing from/to WEIGHTED, need to handle weights
        if (collection.distributionType != distributionType) {
            if (distributionType == DistributionType.WEIGHTED) {
                // Reset weights when switching to weighted
                collection.totalWeight = 0;
                for (uint256 i = 0; i < collection.dsrcAddresses.length; i++) {
                    collection.dsrcWeights[collection.dsrcAddresses[i]] = 0;
                }
            }
            collection.distributionType = distributionType;
        }
        
        emit CollectionUpdated(collectionId, title, description, distributionType);
    }

    /**
     * @notice Adds a DSRC to a collection.
     * @param collectionId The ID of the collection.
     * @param dsrcId The ID of the DSRC to add.
     * @param dsrcAddress The address of the DSRC contract.
     * @param weight The weight of the DSRC for weighted distribution.
     */
    function addDSRCToCollection(
        uint256 collectionId,
        uint256 dsrcId,
        address dsrcAddress,
        uint256 weight
    ) external {
        Collection storage collection = _collections[collectionId];
        if (collection.collectionId == 0) revert CollectionNotFound();
        if (collection.creator != msg.sender) revert Unauthorized();
        if (dsrcAddress == address(0)) revert ZeroAddress();
        
        // Check if DSRC already exists in collection
        for (uint256 i = 0; i < collection.dsrcIds.length; i++) {
            if (collection.dsrcIds[i] == dsrcId) revert DSRCAlreadyExists();
        }
        
        collection.dsrcIds.push(dsrcId);
        collection.dsrcAddresses.push(dsrcAddress);
        
        // Add collection ID to DSRC's collections
        _dsrcCollections[dsrcId].push(collectionId);
        
        if (collection.distributionType == DistributionType.WEIGHTED) {
            collection.dsrcWeights[dsrcAddress] = weight;
            collection.totalWeight += weight;
        }
        
        emit DSRCAddedToCollection(collectionId, dsrcId, dsrcAddress, weight);
    }

    /**
     * @notice Removes a DSRC from a collection.
     * @param collectionId The ID of the collection.
     * @param dsrcId The ID of the DSRC to remove.
     */
    function removeDSRCFromCollection(
        uint256 collectionId,
        uint256 dsrcId
    ) external {
        Collection storage collection = _collections[collectionId];
        if (collection.collectionId == 0) revert CollectionNotFound();
        if (collection.creator != msg.sender) revert Unauthorized();
        
        bool found = false;
        uint256 indexToRemove;
        address dsrcAddress;
        
        // Find the DSRC to remove
        for (uint256 i = 0; i < collection.dsrcIds.length; i++) {
            if (collection.dsrcIds[i] == dsrcId) {
                found = true;
                indexToRemove = i;
                dsrcAddress = collection.dsrcAddresses[i];
                break;
            }
        }
        
        if (!found) revert DSRCNotFound();
        
        // Update weights for weighted distribution
        if (collection.distributionType == DistributionType.WEIGHTED) {
            collection.totalWeight -= collection.dsrcWeights[dsrcAddress];
            collection.dsrcWeights[dsrcAddress] = 0;
        }
        
        // Remove DSRC from collection
        if (indexToRemove < collection.dsrcIds.length - 1) {
            collection.dsrcIds[indexToRemove] = collection.dsrcIds[collection.dsrcIds.length - 1];
            collection.dsrcAddresses[indexToRemove] = collection.dsrcAddresses[collection.dsrcAddresses.length - 1];
        }
        collection.dsrcIds.pop();
        collection.dsrcAddresses.pop();
        
        // Remove collection ID from DSRC's collections
        uint256[] storage dsrcCollections = _dsrcCollections[dsrcId];
        for (uint256 i = 0; i < dsrcCollections.length; i++) {
            if (dsrcCollections[i] == collectionId) {
                if (i < dsrcCollections.length - 1) {
                    dsrcCollections[i] = dsrcCollections[dsrcCollections.length - 1];
                }
                dsrcCollections.pop();
                break;
            }
        }
        
        emit DSRCRemovedFromCollection(collectionId, dsrcId, dsrcAddress);
    }

    /**
     * @notice Updates the weights for DSRCs in a collection with WEIGHTED distribution.
     * @param collectionId The ID of the collection.
     * @param dsrcAddresses Array of DSRC addresses to update weights for.
     * @param weights Array of weights for the DSRCs.
     */
    function updateDSRCWeights(
        uint256 collectionId,
        address[] memory dsrcAddresses,
        uint256[] memory weights
    ) external {
        Collection storage collection = _collections[collectionId];
        if (collection.collectionId == 0) revert CollectionNotFound();
        if (collection.creator != msg.sender) revert Unauthorized();
        if (collection.distributionType != DistributionType.WEIGHTED) revert InvalidDistributionType();
        if (dsrcAddresses.length != weights.length) revert WeightsMismatch();
        
        // Reset total weight
        collection.totalWeight = 0;
        
        // Update weights
        for (uint256 i = 0; i < dsrcAddresses.length; i++) {
            address dsrcAddress = dsrcAddresses[i];
            
            // Verify DSRC is in collection
            bool found = false;
            for (uint256 j = 0; j < collection.dsrcAddresses.length; j++) {
                if (collection.dsrcAddresses[j] == dsrcAddress) {
                    found = true;
                    break;
                }
            }
            
            if (!found) revert DSRCNotFound();
            
            collection.dsrcWeights[dsrcAddress] = weights[i];
            collection.totalWeight += weights[i];
        }
        
        if (collection.totalWeight == 0) revert InvalidTotalWeight();
        
        emit DSRCWeightsUpdated(collectionId, dsrcAddresses, weights);
    }

    /**
     * @notice Updates the active status of a collection.
     * @param collectionId The ID of the collection.
     * @param isActive Whether the collection is active.
     */
    function updateCollectionStatus(
        uint256 collectionId,
        bool isActive
    ) external {
        Collection storage collection = _collections[collectionId];
        if (collection.collectionId == 0) revert CollectionNotFound();
        if (collection.creator != msg.sender) revert Unauthorized();
        
        collection.isActive = isActive;
        
        emit CollectionStatusUpdated(collectionId, isActive);
    }

    /**
     * @notice Receives revenue for a collection.
     * @param collectionId The ID of the collection.
     * @param amount The amount of revenue to receive.
     */
    function receiveCollectionRevenue(
        uint256 collectionId,
        uint256 amount
    ) external nonReentrant {
        Collection storage collection = _collections[collectionId];
        if (collection.collectionId == 0) revert CollectionNotFound();
        if (!collection.isActive) revert CollectionNotActive();
        if (amount == 0) revert InvalidParams();
        
        // Transfer payment token from sender to this contract
        paymentToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // Calculate platform fee
        uint256 platformFee = (amount * PLATFORM_FEE) / BASIS_POINTS;
        paymentToken.safeTransfer(TREASURY, platformFee);
        
        // Calculate net amount after platform fee
        uint256 netAmount = amount - platformFee;
        
        // Update collection earnings
        CollectionEarnings storage earnings = _collectionEarnings[collectionId];
        earnings.totalReceived += amount;
        earnings.pendingDistribution += netAmount;
        
        emit CollectionRevenueReceived(collectionId, msg.sender, amount);
    }

    /**
     * @notice Distributes pending revenue to DSRCs in a collection.
     * @param collectionId The ID of the collection.
     */
    function distributeCollectionRevenue(
        uint256 collectionId
    ) external nonReentrant {
        Collection storage collection = _collections[collectionId];
        if (collection.collectionId == 0) revert CollectionNotFound();
        
        CollectionEarnings storage earnings = _collectionEarnings[collectionId];
        uint256 pendingAmount = earnings.pendingDistribution;
        if (pendingAmount == 0) revert NoPendingDistribution();
        
        // Reset pending distribution
        earnings.pendingDistribution = 0;
        
        // Get distribution details based on distribution type
        DistributionDetail[] memory distributions;
        
        if (collection.distributionType == DistributionType.EVEN) {
            distributions = _getEvenDistribution(collection, pendingAmount);
        } else if (collection.distributionType == DistributionType.WEIGHTED) {
            distributions = _getWeightedDistribution(collection, pendingAmount);
        } else {
            // Custom distribution not implemented yet
            revert InvalidDistributionType();
        }
        
        // Distribute to DSRCs
        uint256 totalDistributed = 0;
        for (uint256 i = 0; i < distributions.length; i++) {
            address dsrcAddress = distributions[i].dsrcAddress;
            uint256 amount = distributions[i].amount;
            
            if (amount > 0) {
                // Call receiveCollectionRoyalty on DSRC contract
                try IHitmakrDSRC(dsrcAddress).receiveCollectionRoyalty(amount) {
                    // Transfer payment token to DSRC contract
                    paymentToken.safeTransfer(dsrcAddress, amount);
                    totalDistributed += amount;
                    
                    emit RevenueDistributedToDSRC(collectionId, dsrcAddress, amount);
                } catch {
                    // If distribution fails, add back to pending
                    earnings.pendingDistribution += amount;
                }
            }
        }
        
        // Update total distributed
        earnings.totalDistributed += totalDistributed;
        
        emit CollectionDistributionCompleted(collectionId, totalDistributed, distributions.length);
    }

    /**
     * @notice Gets the distribution details for even distribution.
     * @param collection The collection to distribute revenue for.
     * @param totalAmount The total amount to distribute.
     * @return distributions Array of distribution details.
     */
    function _getEvenDistribution(
        Collection storage collection,
        uint256 totalAmount
    ) private view returns (DistributionDetail[] memory distributions) {
        uint256 dsrcCount = collection.dsrcAddresses.length;
        if (dsrcCount == 0) return new DistributionDetail[](0);
        
        distributions = new DistributionDetail[](dsrcCount);
        uint256 amountPerDSRC = totalAmount / dsrcCount;
        uint256 remainder = totalAmount % dsrcCount;
        
        for (uint256 i = 0; i < dsrcCount; i++) {
            distributions[i].dsrcAddress = collection.dsrcAddresses[i];
            distributions[i].amount = amountPerDSRC;
            
            // Add remainder to first DSRC
            if (i == 0 && remainder > 0) {
                distributions[i].amount += remainder;
            }
        }
        
        return distributions;
    }

    /**
     * @notice Gets the distribution details for weighted distribution.
     * @param collection The collection to distribute revenue for.
     * @param totalAmount The total amount to distribute.
     * @return distributions Array of distribution details.
     */
    function _getWeightedDistribution(
        Collection storage collection,
        uint256 totalAmount
    ) private view returns (DistributionDetail[] memory distributions) {
        uint256 dsrcCount = collection.dsrcAddresses.length;
        if (dsrcCount == 0 || collection.totalWeight == 0) return new DistributionDetail[](0);
        
        distributions = new DistributionDetail[](dsrcCount);
        uint256 totalDistributed = 0;
        
        for (uint256 i = 0; i < dsrcCount; i++) {
            address dsrcAddress = collection.dsrcAddresses[i];
            uint256 weight = collection.dsrcWeights[dsrcAddress];
            uint256 amount;
            
            if (i == dsrcCount - 1) {
                // Last DSRC gets remainder
                amount = totalAmount - totalDistributed;
            } else {
                amount = (totalAmount * weight) / collection.totalWeight;
                totalDistributed += amount;
            }
            
            distributions[i].dsrcAddress = dsrcAddress;
            distributions[i].amount = amount;
        }
        
        return distributions;
    }

    /**
     * @notice Gets the collection details.
     * @param collectionId The ID of the collection.
     * @return creator The address of the collection creator.
     * @return title The title of the collection.
     * @return description The description of the collection.
     * @return distributionType The distribution type of the collection.
     * @return dsrcIds Array of DSRC IDs in the collection.
     * @return dsrcAddresses Array of DSRC addresses in the collection.
     * @return isActive Whether the collection is active.
     * @return createdAt Timestamp when the collection was created.
     */
    function getCollectionDetails(
        uint256 collectionId
    ) external view returns (
        address creator,
        string memory title,
        string memory description,
        DistributionType distributionType,
        uint256[] memory dsrcIds,
        address[] memory dsrcAddresses,
        bool isActive,
        uint256 createdAt
    ) {
        Collection storage collection = _collections[collectionId];
        if (collection.collectionId == 0) revert CollectionNotFound();
        
        return (
            collection.creator,
            collection.title,
            collection.description,
            collection.distributionType,
            collection.dsrcIds,
            collection.dsrcAddresses,
            collection.isActive,
            collection.createdAt
        );
    }

    /**
     * @notice Gets the collection earnings.
     * @param collectionId The ID of the collection.
     * @return totalReceived Total revenue received by the collection.
     * @return totalDistributed Total revenue distributed to DSRCs.
     * @return pendingDistribution Pending revenue to be distributed.
     */
    function getCollectionEarnings(
        uint256 collectionId
    ) external view returns (
        uint256 totalReceived,
        uint256 totalDistributed,
        uint256 pendingDistribution
    ) {
        CollectionEarnings storage earnings = _collectionEarnings[collectionId];
        return (
            earnings.totalReceived,
            earnings.totalDistributed,
            earnings.pendingDistribution
        );
    }

    /**
     * @notice Gets the DSRC weights for a collection.
     * @param collectionId The ID of the collection.
     * @param dsrcAddresses Array of DSRC addresses to get weights for.
     * @return weights Array of weights for the DSRCs.
     */
    function getDSRCWeights(
        uint256 collectionId,
        address[] memory dsrcAddresses
    ) external view returns (uint256[] memory weights) {
        Collection storage collection = _collections[collectionId];
        if (collection.collectionId == 0) revert CollectionNotFound();
        
        weights = new uint256[](dsrcAddresses.length);
        for (uint256 i = 0; i < dsrcAddresses.length; i++) {
            weights[i] = collection.dsrcWeights[dsrcAddresses[i]];
        }
        
        return weights;
    }

    /**
     * @notice Gets the collections that a DSRC belongs to.
     * @param dsrcId The ID of the DSRC.
     * @return collectionIds Array of collection IDs that the DSRC belongs to.
     */
    function getDSRCCollections(
        uint256 dsrcId
    ) external view returns (uint256[] memory collectionIds) {
        return _dsrcCollections[dsrcId];
    }

    /**
     * @notice Implements the ERC2981 royalty standard.
     * @param tokenId The ID of the token.
     * @param salePrice The sale price of the token.
     * @return receiver The address of the royalty receiver (this contract).
     * @return royaltyAmount The royalty amount calculated based on the sale price.
     */
    function royaltyInfo(
        uint256 tokenId,
        uint256 salePrice
    ) external view override returns (
        address receiver,
        uint256 royaltyAmount
    ) {
        receiver = address(this);
        royaltyAmount = (salePrice * (BASIS_POINTS - PLATFORM_FEE)) / BASIS_POINTS;
    }

    /**
     * @notice Checks if the contract supports a given interface.
     * @param interfaceId The interface identifier.
     * @return True if the interface is supported, false otherwise.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) external view virtual returns (bool) {
        return 
            interfaceId == type(IERC2981).interfaceId || 
            interfaceId == type(IERC165).interfaceId;
    }
}
