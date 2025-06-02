// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/interfaces/IERC165.sol";
import "../core/ERC7066.sol";

/**
 * @title IHitmakrDSRC
 * @author Hitmakr Protocol
 * @notice Interface for the HitmakrDSRC contract that represents a Digital Scarcity Rights Contract.
 */
interface IHitmakrDSRC is IERC2981, IERC165 {
    /**
     * @notice Enumeration representing the different edition types for the DSRC.
     * @dev Streaming: Free edition for streaming purposes.
     * @dev Collectors: Limited edition for collectors.
     * @dev Licensing: Edition for licensing purposes.
     */
    enum Edition {
        Streaming,
        Collectors,
        Licensing
    }

    /**
     * @notice Structure for defining a royalty split.
     * @member recipient The address of the royalty recipient.
     * @member percentage The percentage of royalties allocated to this recipient (expressed in basis points).
     */
    struct RoyaltySplit {
        address recipient;
        uint16 percentage;
    }

    /**
     * @notice Structure for tracking earnings from the DSRC.
     * @member purchase Total earnings from primary sales.
     * @member royalty Total earnings from royalties.
     * @member collectionRoyalty Total earnings from collection royalties.
     * @member pending Pending earnings that haven't been distributed yet.
     */
    struct Earnings {
        uint256 purchase;
        uint256 royalty;
        uint256 collectionRoyalty;
        uint256 pending;
    }

    /**
     * @notice Structure for configuring an edition.
     * @member price The price of the edition.
     * @member isEnabled Whether the edition is currently enabled for purchase.
     * @member isCreated Whether the edition has been created.
     */
    struct EditionConfig {
        uint256 price;
        bool isEnabled;
        bool isCreated;
    }

    /// @notice Event emitted when a user purchases an edition of the DSRC.
    event Purchased(address indexed buyer, uint256 amount, string selectedChain, Edition edition);
    /// @notice Event emitted when a new edition is created.
    event EditionCreated(Edition indexed edition, uint256 price);
    /// @notice Event emitted when an edition's status (enabled/disabled) is updated.
    event EditionStatusUpdated(Edition indexed edition, bool isEnabled);
    /// @notice Event emitted when an edition's price is updated.
    event EditionPriceUpdated(Edition indexed edition, uint256 newPrice);
    /// @notice Event emitted when royalties are received by the contract.
    event RoyaltyReceived(uint256 amount);
    /// @notice Event emitted when royalties are distributed to a recipient.
    event RoyaltyDistributed(address indexed recipient, uint256 amount, bool isPurchaseEarning);
    /// @notice Event emitted after all royalties for a given distribution are sent.
    event RoyaltiesDistributed(uint256 totalAmount, bool isPurchaseEarning);
    /// @notice Event emitted when collection royalties are received by the contract.
    event CollectionRoyaltyReceived(address indexed collectionContract, uint256 amount);

    /**
     * @notice Receives royalties from a collection contract.
     * @param amount The amount of royalties to receive.
     * @dev Only callable by authorized collection contracts. Adds the amount to collectionRoyalty and pending earnings.
     * Emits a `CollectionRoyaltyReceived` event.
     */
    function receiveCollectionRoyalty(uint256 amount) external;

    /**
     * @notice Authorizes a collection contract to send royalties to this DSRC.
     * @param collectionContract The address of the collection contract to authorize.
     * @param isAuthorized Whether the collection contract is authorized.
     * @dev Only callable by the creator.
     */
    function setCollectionAuthorization(address collectionContract, bool isAuthorized) external;

    /**
     * @notice Creates a new edition for the DSRC.
     * @param edition The type of edition to create.
     * @param price The price of the edition.
     * @dev Only callable by the creator on the primary chain. Emits an `EditionCreated` event.
     */
    function createEdition(Edition edition, uint256 price) external;

    /**
     * @notice Allows a user to purchase a specific edition of the DSRC.
     * @param edition The type of edition to purchase.
     * @dev Only callable on the primary chain. Mints a new NFT to the buyer and emits a `Purchased` event.
     */
    function purchase(Edition edition) external;

    /**
     * @notice Updates the price of a specific edition.
     * @param edition The edition type to update.
     * @param newPrice The new price for the edition.
     * @dev Only callable by the creator on the primary chain. Emits an `EditionPriceUpdated` event.
     */
    function updateEditionPrice(Edition edition, uint256 newPrice) external;

    /**
     * @notice Updates the enabled status of a specific edition.
     * @param edition The edition type to update.
     * @param isEnabled The new enabled status for the edition.
     * @dev Only callable by the creator on the primary chain. Emits an `EditionStatusUpdated` event.
     */
    function updateEditionStatus(Edition edition, bool isEnabled) external;

    /**
     * @notice Distributes pending royalties to the specified recipients based on distribute type.
     * @param distributeType An integer representing the distribution logic to use.
     * @dev Emits `RoyaltyDistributed` and `RoyaltiesDistributed` events.
     */
    function distributeRoyalties(uint8 distributeType) external;

    /**
     * @notice Receives and distributes royalties earned from secondary sales.
     * @dev Calculates the new royalties received, updates earnings, and distributes them to royalty recipients.
     */
    function onRoyaltyReceived() external;

    /**
     * @notice Retrieves the configuration of a specific edition.
     * @param edition The edition type to retrieve the config for.
     * @return price The price of the edition.
     * @return isEnabled Whether the edition is enabled.
     * @return isCreated Whether the edition has been created.
     */
    function getEditionConfig(Edition edition) external view returns (
        uint256 price, 
        bool isEnabled, 
        bool isCreated
    );

    /**
     * @notice Retrieves the edition type of a specific token.
     * @param tokenId The ID of the token.
     * @return The edition type of the token.
     */
    function getTokenEdition(uint256 tokenId) external view returns (Edition);

    /**
     * @notice Retrieves earnings information for the DSRC.
     * @return purchaseEarnings Total earnings from primary sales.
     * @return royaltyEarnings Total earnings from royalties.
     * @return collectionRoyaltyEarnings Total earnings from collection royalties.
     * @return pendingAmount Current pending earnings.
     * @return totalEarnings Total earnings (purchase + royalty + collectionRoyalty).
     */
    function getEarningsInfo() external view returns (
        uint256 purchaseEarnings, 
        uint256 royaltyEarnings,
        uint256 collectionRoyaltyEarnings,
        uint256 pendingAmount, 
        uint256 totalEarnings
    );

    /**
     * @notice Returns the token URI for the DSRC.
     * @return The token URI.
     */
    function tokenURI(uint256) external view returns (string memory);
}
