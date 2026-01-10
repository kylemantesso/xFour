// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Treasury.sol";
import "./TreasuryFactory.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title X402Gateway
 * @notice Gateway contract that executes payments from Treasury contracts
 * @dev Called by the x402 backend to execute authorized payments.
 *      This contract is granted GATEWAY_ROLE on all Treasury contracts.
 * 
 * Security model:
 * - Only the owner (x402 backend signer) can call executePayment
 * - The Treasury contract enforces all spending limits
 * - API key validation happens off-chain, on-chain just verifies the hash
 */
contract X402Gateway is Ownable, ReentrancyGuard {
    
    // ============================================
    // STATE
    // ============================================
    
    /// @notice Reference to the TreasuryFactory
    TreasuryFactory public immutable factory;
    
    /// @notice Nonce for each payment to prevent replay attacks
    mapping(bytes32 => bool) public usedNonces;
    
    /// @notice Total payments processed
    uint256 public totalPayments;
    
    /// @notice Total volume processed
    uint256 public totalVolume;

    // ============================================
    // EVENTS
    // ============================================
    
    event PaymentProcessed(
        address indexed treasury,
        bytes32 indexed apiKeyHash,
        address indexed recipient,
        uint256 amount,
        string invoiceId,
        bytes32 nonce
    );

    // ============================================
    // ERRORS
    // ============================================
    
    error InvalidTreasury(address treasury);
    error NonceAlreadyUsed(bytes32 nonce);
    error ZeroAddress();
    error ZeroAmount();

    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    /**
     * @notice Create a new X402Gateway
     * @param _factory The TreasuryFactory address
     */
    constructor(address _factory) Ownable(msg.sender) {
        if (_factory == address(0)) revert ZeroAddress();
        factory = TreasuryFactory(_factory);
    }

    // ============================================
    // PAYMENT EXECUTION
    // ============================================

    /**
     * @notice Execute a payment from a treasury
     * @dev Only callable by the owner (x402 backend). The treasury enforces spending limits.
     * @param treasury The treasury contract address
     * @param apiKeyHash Keccak256 hash of the API key
     * @param recipient Payment recipient address
     * @param amount Payment amount in token units
     * @param invoiceId Invoice ID for tracking
     * @param nonce Unique nonce to prevent replay attacks
     */
    function executePayment(
        address treasury,
        bytes32 apiKeyHash,
        address recipient,
        uint256 amount,
        string calldata invoiceId,
        bytes32 nonce
    ) external onlyOwner nonReentrant {
        // Validate inputs
        if (treasury == address(0)) revert ZeroAddress();
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        
        // Verify treasury is registered
        if (!factory.isTreasury(treasury)) {
            revert InvalidTreasury(treasury);
        }
        
        // Check nonce hasn't been used
        if (usedNonces[nonce]) {
            revert NonceAlreadyUsed(nonce);
        }
        usedNonces[nonce] = true;

        // Execute payment through treasury
        Treasury(treasury).executePayment(
            apiKeyHash,
            recipient,
            amount,
            invoiceId
        );

        // Update stats
        totalPayments += 1;
        totalVolume += amount;

        emit PaymentProcessed(
            treasury,
            apiKeyHash,
            recipient,
            amount,
            invoiceId,
            nonce
        );
    }

    /**
     * @notice Batch execute multiple payments
     * @dev More gas efficient for multiple payments
     */
    function batchExecutePayments(
        address[] calldata treasuries,
        bytes32[] calldata apiKeyHashes,
        address[] calldata recipients,
        uint256[] calldata amounts,
        string[] calldata invoiceIds,
        bytes32[] calldata nonces
    ) external onlyOwner nonReentrant {
        require(
            treasuries.length == apiKeyHashes.length &&
            treasuries.length == recipients.length &&
            treasuries.length == amounts.length &&
            treasuries.length == invoiceIds.length &&
            treasuries.length == nonces.length,
            "Array length mismatch"
        );

        for (uint256 i = 0; i < treasuries.length; i++) {
            address treasury = treasuries[i];
            bytes32 nonce = nonces[i];
            
            // Skip if invalid
            if (treasury == address(0) || recipients[i] == address(0) || amounts[i] == 0) {
                continue;
            }
            
            // Skip if not a registered treasury
            if (!factory.isTreasury(treasury)) {
                continue;
            }
            
            // Skip if nonce already used
            if (usedNonces[nonce]) {
                continue;
            }
            usedNonces[nonce] = true;

            // Execute payment
            Treasury(treasury).executePayment(
                apiKeyHashes[i],
                recipients[i],
                amounts[i],
                invoiceIds[i]
            );

            totalPayments += 1;
            totalVolume += amounts[i];

            emit PaymentProcessed(
                treasury,
                apiKeyHashes[i],
                recipients[i],
                amounts[i],
                invoiceIds[i],
                nonce
            );
        }
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    /**
     * @notice Check if a payment would be allowed
     * @param treasury The treasury contract address
     * @param apiKeyHash Keccak256 hash of the API key
     * @param amount Payment amount to check
     */
    function checkPaymentAllowed(
        address treasury,
        bytes32 apiKeyHash,
        uint256 amount
    ) external view returns (bool allowed, string memory reason) {
        if (!factory.isTreasury(treasury)) {
            return (false, "Invalid treasury");
        }
        
        return Treasury(treasury).checkPaymentAllowed(apiKeyHash, amount);
    }

    /**
     * @notice Get gateway stats
     */
    function getStats() external view returns (uint256 payments, uint256 volume) {
        return (totalPayments, totalVolume);
    }

    /**
     * @notice Check if a nonce has been used
     */
    function isNonceUsed(bytes32 nonce) external view returns (bool) {
        return usedNonces[nonce];
    }
}
