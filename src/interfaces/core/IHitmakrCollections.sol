// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/interfaces/IERC165.sol";

/**
 * @title IHitmakrCollections
 * @author Hitmakr Protocol
 * @notice Interface for the HitmakrCollections contract that manages collections of DSRCs and handles revenue distribution.
 */
interface IHitmakrCollections is IERC2981, IERC165 {
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
    ) external returns (uint256 collectionId);

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
    ) external;

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
    ) external;

    /**
     * @notice Removes a DSRC from a collection.
     * @param collectionId The ID of the collection.
     * @param dsrcId The ID of the DSRC to remove.
     */
    function removeDSRCFromCollection(
        uint256 collectionId,
        uint256 dsrcId
    ) external;

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
    ) external;

    /**
     * @notice Updates the active status of a collection.
     * @param collectionId The ID of the collection.
     * @param isActive Whether the collection is active.
     */
    function updateCollectionStatus(
        uint256 collectionId,
        bool isActive
    ) external;

    /**
     * @notice Receives revenue for a collection.
     * @param collectionId The ID of the collection.
     * @param amount The amount of revenue to receive.
     */
    function receiveCollectionRevenue(
        uint256 collectionId,
        uint256 amount
    ) external;

    /**
     * @notice Distributes pending revenue to DSRCs in a collection.
     * @param collectionId The ID of the collection.
     */
    function distributeCollectionRevenue(
        uint256 collectionId
    ) external;

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
    );

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
    );

    /**
     * @notice Gets the DSRC weights for a collection.
     * @param collectionId The ID of the collection.
     * @param dsrcAddresses Array of DSRC addresses to get weights for.
     * @return weights Array of weights for the DSRCs.
     */
    function getDSRCWeights(
        uint256 collectionId,
        address[] memory dsrcAddresses
    ) external view returns (uint256[] memory weights);

    /**
     * @notice Gets the collections that a DSRC belongs to.
     * @param dsrcId The ID of the DSRC.
     * @return collectionIds Array of collection IDs that the DSRC belongs to.
     */
    function getDSRCCollections(
        uint256 dsrcId
    ) external view returns (uint256[] memory collectionIds);
}
