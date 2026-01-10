// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Treasury.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TreasuryFactory
 * @notice Factory contract for deploying Treasury contracts
 * @dev Maintains a registry of all deployed treasuries for the x402 gateway
 */
contract TreasuryFactory is Ownable {
    
    // ============================================
    // STATE
    // ============================================
    
    /// @notice The MNEE token address
    address public immutable token;
    
    /// @notice The default gateway address for new treasuries
    address public defaultGateway;
    
    /// @notice Mapping of workspace ID => treasury address
    mapping(string => address) public treasuries;
    
    /// @notice Array of all deployed treasury addresses
    address[] public allTreasuries;
    
    /// @notice Mapping to check if an address is a treasury
    mapping(address => bool) public isTreasury;

    // ============================================
    // EVENTS
    // ============================================
    
    event TreasuryCreated(
        string indexed workspaceId,
        address indexed treasury,
        address indexed admin
    );
    event DefaultGatewayUpdated(address indexed oldGateway, address indexed newGateway);

    // ============================================
    // ERRORS
    // ============================================
    
    error TreasuryAlreadyExists(string workspaceId);
    error ZeroAddress();

    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    /**
     * @notice Create a new TreasuryFactory
     * @param _token The MNEE token address
     * @param _defaultGateway The default gateway address for new treasuries
     */
    constructor(address _token, address _defaultGateway) Ownable(msg.sender) {
        if (_token == address(0)) revert ZeroAddress();
        if (_defaultGateway == address(0)) revert ZeroAddress();
        
        token = _token;
        defaultGateway = _defaultGateway;
    }

    // ============================================
    // TREASURY CREATION
    // ============================================

    /**
     * @notice Create a new treasury for a workspace
     * @param workspaceId The workspace identifier
     * @param admin The admin address for the treasury (usually the workspace owner's wallet)
     * @return treasury The deployed treasury address
     */
    function createTreasury(string calldata workspaceId, address admin) 
        external 
        returns (address treasury) 
    {
        if (treasuries[workspaceId] != address(0)) {
            revert TreasuryAlreadyExists(workspaceId);
        }
        if (admin == address(0)) revert ZeroAddress();

        // Deploy new treasury
        Treasury newTreasury = new Treasury(
            token,
            workspaceId,
            admin,
            defaultGateway
        );
        
        treasury = address(newTreasury);
        
        // Register treasury
        treasuries[workspaceId] = treasury;
        allTreasuries.push(treasury);
        isTreasury[treasury] = true;

        emit TreasuryCreated(workspaceId, treasury, admin);
    }

    /**
     * @notice Create a treasury with a custom gateway address
     * @param workspaceId The workspace identifier
     * @param admin The admin address for the treasury
     * @param gateway Custom gateway address (for testing or special cases)
     * @return treasury The deployed treasury address
     */
    function createTreasuryWithGateway(
        string calldata workspaceId, 
        address admin,
        address gateway
    ) external returns (address treasury) {
        if (treasuries[workspaceId] != address(0)) {
            revert TreasuryAlreadyExists(workspaceId);
        }
        if (admin == address(0)) revert ZeroAddress();
        if (gateway == address(0)) revert ZeroAddress();

        // Deploy new treasury with custom gateway
        Treasury newTreasury = new Treasury(
            token,
            workspaceId,
            admin,
            gateway
        );
        
        treasury = address(newTreasury);
        
        // Register treasury
        treasuries[workspaceId] = treasury;
        allTreasuries.push(treasury);
        isTreasury[treasury] = true;

        emit TreasuryCreated(workspaceId, treasury, admin);
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    /**
     * @notice Get treasury address for a workspace
     * @param workspaceId The workspace identifier
     * @return The treasury address (or zero if not exists)
     */
    function getTreasury(string calldata workspaceId) external view returns (address) {
        return treasuries[workspaceId];
    }

    /**
     * @notice Get total number of treasuries
     */
    function getTreasuryCount() external view returns (uint256) {
        return allTreasuries.length;
    }

    /**
     * @notice Get all treasury addresses
     */
    function getAllTreasuries() external view returns (address[] memory) {
        return allTreasuries;
    }

    /**
     * @notice Get treasury addresses with pagination
     * @param offset Starting index
     * @param limit Maximum number to return
     */
    function getTreasuriesPaginated(uint256 offset, uint256 limit) 
        external 
        view 
        returns (address[] memory) 
    {
        uint256 total = allTreasuries.length;
        if (offset >= total) {
            return new address[](0);
        }
        
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        
        address[] memory result = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = allTreasuries[i];
        }
        
        return result;
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    /**
     * @notice Update the default gateway for new treasuries
     * @param newGateway New default gateway address
     */
    function setDefaultGateway(address newGateway) external onlyOwner {
        if (newGateway == address(0)) revert ZeroAddress();
        
        address oldGateway = defaultGateway;
        defaultGateway = newGateway;
        
        emit DefaultGatewayUpdated(oldGateway, newGateway);
    }
}
