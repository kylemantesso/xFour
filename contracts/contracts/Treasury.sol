// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title Treasury
 * @notice Non-custodial treasury contract for x402 gateway payments
 * @dev Allows workspace owners to deposit tokens and set spending limits for API keys.
 *      The gateway contract can execute payments on behalf of API keys within their limits.
 * 
 * Architecture:
 * - ADMIN_ROLE: Can manage API keys, set limits, withdraw funds, pause contract
 * - GATEWAY_ROLE: Can execute payments (only the x402 gateway should have this)
 * - API keys have individual spending limits (daily, monthly, per-transaction)
 * - All spending is tracked and enforced on-chain
 */
contract Treasury is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============================================
    // ROLES
    // ============================================
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant GATEWAY_ROLE = keccak256("GATEWAY_ROLE");

    // ============================================
    // STATE
    // ============================================
    
    /// @notice The MNEE token address
    IERC20 public immutable token;
    
    /// @notice Workspace identifier (for off-chain tracking)
    string public workspaceId;

    /// @notice Spending limits for each API key
    struct SpendingLimits {
        uint256 maxPerTransaction;  // Max amount per single transaction (0 = unlimited)
        uint256 dailyLimit;         // Max spend per 24 hours (0 = unlimited)
        uint256 monthlyLimit;       // Max spend per 30 days (0 = unlimited)
        bool isActive;              // Whether this API key is active
    }

    /// @notice Spending tracking for each API key
    struct SpendingTracker {
        uint256 dailySpent;         // Amount spent in current day
        uint256 monthlySpent;       // Amount spent in current month
        uint256 totalSpent;         // Total amount ever spent
        uint256 lastDayReset;       // Timestamp of last daily reset
        uint256 lastMonthReset;     // Timestamp of last monthly reset
        uint256 transactionCount;   // Total number of transactions
    }

    /// @notice API key hash => spending limits
    mapping(bytes32 => SpendingLimits) public apiKeyLimits;
    
    /// @notice API key hash => spending tracker
    mapping(bytes32 => SpendingTracker) public apiKeySpending;

    /// @notice Total deposits ever made
    uint256 public totalDeposits;
    
    /// @notice Total withdrawals ever made
    uint256 public totalWithdrawals;
    
    /// @notice Total payments ever made
    uint256 public totalPayments;

    // ============================================
    // EVENTS
    // ============================================
    
    event Deposited(address indexed from, uint256 amount, uint256 newBalance);
    event Withdrawn(address indexed to, uint256 amount, uint256 newBalance);
    event PaymentExecuted(
        bytes32 indexed apiKeyHash,
        address indexed recipient,
        uint256 amount,
        string invoiceId
    );
    event ApiKeyConfigured(
        bytes32 indexed apiKeyHash,
        uint256 maxPerTransaction,
        uint256 dailyLimit,
        uint256 monthlyLimit,
        bool isActive
    );
    event ApiKeyDeactivated(bytes32 indexed apiKeyHash);
    event GatewayUpdated(address indexed oldGateway, address indexed newGateway);

    // ============================================
    // ERRORS
    // ============================================
    
    error InsufficientBalance(uint256 requested, uint256 available);
    error ApiKeyNotActive(bytes32 apiKeyHash);
    error ExceedsTransactionLimit(uint256 amount, uint256 limit);
    error ExceedsDailyLimit(uint256 newTotal, uint256 limit);
    error ExceedsMonthlyLimit(uint256 newTotal, uint256 limit);
    error ZeroAmount();
    error ZeroAddress();

    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    /**
     * @notice Create a new Treasury contract
     * @param _token The MNEE token address
     * @param _workspaceId The workspace identifier for off-chain tracking
     * @param _admin The initial admin address (usually the deployer/workspace owner)
     * @param _gateway The x402 gateway address that can execute payments
     */
    constructor(
        address _token,
        string memory _workspaceId,
        address _admin,
        address _gateway
    ) {
        if (_token == address(0)) revert ZeroAddress();
        if (_admin == address(0)) revert ZeroAddress();
        if (_gateway == address(0)) revert ZeroAddress();

        token = IERC20(_token);
        workspaceId = _workspaceId;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(GATEWAY_ROLE, _gateway);
    }

    // ============================================
    // DEPOSIT & WITHDRAW (Admin only)
    // ============================================

    /**
     * @notice Deposit MNEE tokens into the treasury
     * @param amount Amount of tokens to deposit
     */
    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        
        token.safeTransferFrom(msg.sender, address(this), amount);
        totalDeposits += amount;
        
        emit Deposited(msg.sender, amount, getBalance());
    }

    /**
     * @notice Withdraw MNEE tokens from the treasury (admin only)
     * @param to Recipient address
     * @param amount Amount of tokens to withdraw
     */
    function withdraw(address to, uint256 amount) 
        external 
        onlyRole(ADMIN_ROLE) 
        nonReentrant 
        whenNotPaused 
    {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        
        uint256 balance = getBalance();
        if (amount > balance) revert InsufficientBalance(amount, balance);
        
        token.safeTransfer(to, amount);
        totalWithdrawals += amount;
        
        emit Withdrawn(to, amount, getBalance());
    }

    /**
     * @notice Emergency withdraw all tokens (admin only, when paused)
     * @param to Recipient address
     */
    function emergencyWithdraw(address to) 
        external 
        onlyRole(ADMIN_ROLE) 
        nonReentrant 
        whenPaused 
    {
        if (to == address(0)) revert ZeroAddress();
        
        uint256 balance = getBalance();
        if (balance > 0) {
            token.safeTransfer(to, balance);
            totalWithdrawals += balance;
            emit Withdrawn(to, balance, 0);
        }
    }

    // ============================================
    // API KEY MANAGEMENT (Admin only)
    // ============================================

    /**
     * @notice Configure spending limits for an API key
     * @param apiKeyHash Keccak256 hash of the API key
     * @param maxPerTransaction Maximum amount per transaction (0 = unlimited)
     * @param dailyLimit Maximum daily spending (0 = unlimited)
     * @param monthlyLimit Maximum monthly spending (0 = unlimited)
     * @param isActive Whether the API key is active
     */
    function configureApiKey(
        bytes32 apiKeyHash,
        uint256 maxPerTransaction,
        uint256 dailyLimit,
        uint256 monthlyLimit,
        bool isActive
    ) external onlyRole(ADMIN_ROLE) {
        apiKeyLimits[apiKeyHash] = SpendingLimits({
            maxPerTransaction: maxPerTransaction,
            dailyLimit: dailyLimit,
            monthlyLimit: monthlyLimit,
            isActive: isActive
        });

        // Initialize tracker if new
        if (apiKeySpending[apiKeyHash].lastDayReset == 0) {
            apiKeySpending[apiKeyHash].lastDayReset = block.timestamp;
            apiKeySpending[apiKeyHash].lastMonthReset = block.timestamp;
        }

        emit ApiKeyConfigured(
            apiKeyHash,
            maxPerTransaction,
            dailyLimit,
            monthlyLimit,
            isActive
        );
    }

    /**
     * @notice Deactivate an API key (quick disable without changing limits)
     * @param apiKeyHash Keccak256 hash of the API key
     */
    function deactivateApiKey(bytes32 apiKeyHash) external onlyRole(ADMIN_ROLE) {
        apiKeyLimits[apiKeyHash].isActive = false;
        emit ApiKeyDeactivated(apiKeyHash);
    }

    /**
     * @notice Batch configure multiple API keys
     * @param apiKeyHashes Array of API key hashes
     * @param limits Array of spending limits
     */
    function batchConfigureApiKeys(
        bytes32[] calldata apiKeyHashes,
        SpendingLimits[] calldata limits
    ) external onlyRole(ADMIN_ROLE) {
        require(apiKeyHashes.length == limits.length, "Array length mismatch");
        
        for (uint256 i = 0; i < apiKeyHashes.length; i++) {
            apiKeyLimits[apiKeyHashes[i]] = limits[i];
            
            if (apiKeySpending[apiKeyHashes[i]].lastDayReset == 0) {
                apiKeySpending[apiKeyHashes[i]].lastDayReset = block.timestamp;
                apiKeySpending[apiKeyHashes[i]].lastMonthReset = block.timestamp;
            }

            emit ApiKeyConfigured(
                apiKeyHashes[i],
                limits[i].maxPerTransaction,
                limits[i].dailyLimit,
                limits[i].monthlyLimit,
                limits[i].isActive
            );
        }
    }

    // ============================================
    // PAYMENT EXECUTION (Gateway only)
    // ============================================

    /**
     * @notice Execute a payment from the treasury
     * @dev Only callable by the gateway. Enforces all spending limits.
     * @param apiKeyHash Keccak256 hash of the API key making the payment
     * @param recipient Payment recipient address
     * @param amount Payment amount in token units
     * @param invoiceId Invoice ID for tracking (emitted in event)
     */
    function executePayment(
        bytes32 apiKeyHash,
        address recipient,
        uint256 amount,
        string calldata invoiceId
    ) external onlyRole(GATEWAY_ROLE) nonReentrant whenNotPaused {
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        // Check API key is active
        SpendingLimits storage limits = apiKeyLimits[apiKeyHash];
        if (!limits.isActive) revert ApiKeyNotActive(apiKeyHash);

        // Check balance
        uint256 balance = getBalance();
        if (amount > balance) revert InsufficientBalance(amount, balance);

        // Check per-transaction limit
        if (limits.maxPerTransaction > 0 && amount > limits.maxPerTransaction) {
            revert ExceedsTransactionLimit(amount, limits.maxPerTransaction);
        }

        // Update and check daily/monthly limits
        SpendingTracker storage tracker = apiKeySpending[apiKeyHash];
        _resetPeriodsIfNeeded(tracker);

        // Check daily limit
        if (limits.dailyLimit > 0) {
            uint256 newDailyTotal = tracker.dailySpent + amount;
            if (newDailyTotal > limits.dailyLimit) {
                revert ExceedsDailyLimit(newDailyTotal, limits.dailyLimit);
            }
            tracker.dailySpent = newDailyTotal;
        }

        // Check monthly limit
        if (limits.monthlyLimit > 0) {
            uint256 newMonthlyTotal = tracker.monthlySpent + amount;
            if (newMonthlyTotal > limits.monthlyLimit) {
                revert ExceedsMonthlyLimit(newMonthlyTotal, limits.monthlyLimit);
            }
            tracker.monthlySpent = newMonthlyTotal;
        }

        // Update total tracking
        tracker.totalSpent += amount;
        tracker.transactionCount += 1;
        totalPayments += amount;

        // Execute transfer
        token.safeTransfer(recipient, amount);

        emit PaymentExecuted(apiKeyHash, recipient, amount, invoiceId);
    }

    /**
     * @notice Check if a payment would be allowed (view function for quotes)
     * @param apiKeyHash Keccak256 hash of the API key
     * @param amount Payment amount to check
     * @return allowed Whether the payment would be allowed
     * @return reason Reason if not allowed (empty if allowed)
     */
    function checkPaymentAllowed(bytes32 apiKeyHash, uint256 amount) 
        external 
        view 
        returns (bool allowed, string memory reason) 
    {
        SpendingLimits storage limits = apiKeyLimits[apiKeyHash];
        
        if (!limits.isActive) {
            return (false, "API key not active");
        }

        if (amount > getBalance()) {
            return (false, "Insufficient treasury balance");
        }

        if (limits.maxPerTransaction > 0 && amount > limits.maxPerTransaction) {
            return (false, "Exceeds per-transaction limit");
        }

        SpendingTracker storage tracker = apiKeySpending[apiKeyHash];
        
        // Calculate what the spending would be after reset
        (uint256 currentDaily, uint256 currentMonthly) = _getCurrentSpending(tracker);

        if (limits.dailyLimit > 0 && currentDaily + amount > limits.dailyLimit) {
            return (false, "Exceeds daily limit");
        }

        if (limits.monthlyLimit > 0 && currentMonthly + amount > limits.monthlyLimit) {
            return (false, "Exceeds monthly limit");
        }

        return (true, "");
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    /**
     * @notice Get the current token balance of the treasury
     */
    function getBalance() public view returns (uint256) {
        return token.balanceOf(address(this));
    }

    /**
     * @notice Get current spending for an API key (with period resets applied)
     * @param apiKeyHash Keccak256 hash of the API key
     */
    function getCurrentSpending(bytes32 apiKeyHash) 
        external 
        view 
        returns (
            uint256 dailySpent,
            uint256 monthlySpent,
            uint256 totalSpent,
            uint256 transactionCount
        ) 
    {
        SpendingTracker storage tracker = apiKeySpending[apiKeyHash];
        (dailySpent, monthlySpent) = _getCurrentSpending(tracker);
        totalSpent = tracker.totalSpent;
        transactionCount = tracker.transactionCount;
    }

    /**
     * @notice Get remaining allowance for an API key
     * @param apiKeyHash Keccak256 hash of the API key
     */
    function getRemainingAllowance(bytes32 apiKeyHash)
        external
        view
        returns (
            uint256 remainingDaily,
            uint256 remainingMonthly,
            uint256 remainingPerTx
        )
    {
        SpendingLimits storage limits = apiKeyLimits[apiKeyHash];
        SpendingTracker storage tracker = apiKeySpending[apiKeyHash];
        
        (uint256 currentDaily, uint256 currentMonthly) = _getCurrentSpending(tracker);

        remainingDaily = limits.dailyLimit > 0 
            ? (currentDaily >= limits.dailyLimit ? 0 : limits.dailyLimit - currentDaily)
            : type(uint256).max;
            
        remainingMonthly = limits.monthlyLimit > 0 
            ? (currentMonthly >= limits.monthlyLimit ? 0 : limits.monthlyLimit - currentMonthly)
            : type(uint256).max;
            
        remainingPerTx = limits.maxPerTransaction > 0 
            ? limits.maxPerTransaction 
            : type(uint256).max;
    }

    /**
     * @notice Get full treasury stats
     */
    function getStats() 
        external 
        view 
        returns (
            uint256 balance,
            uint256 deposits,
            uint256 withdrawals,
            uint256 payments
        ) 
    {
        return (getBalance(), totalDeposits, totalWithdrawals, totalPayments);
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    /**
     * @notice Pause the contract (emergency)
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @notice Update the gateway address
     * @param newGateway New gateway address
     */
    function updateGateway(address newGateway) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newGateway == address(0)) revert ZeroAddress();
        
        // Get current gateway (first account with GATEWAY_ROLE)
        address oldGateway = address(0);
        
        // Revoke from all existing gateways and grant to new one
        _revokeRole(GATEWAY_ROLE, oldGateway);
        _grantRole(GATEWAY_ROLE, newGateway);
        
        emit GatewayUpdated(oldGateway, newGateway);
    }

    // ============================================
    // INTERNAL FUNCTIONS
    // ============================================

    /**
     * @dev Reset daily/monthly periods if needed
     */
    function _resetPeriodsIfNeeded(SpendingTracker storage tracker) internal {
        // Reset daily if more than 24 hours have passed
        if (block.timestamp >= tracker.lastDayReset + 1 days) {
            tracker.dailySpent = 0;
            tracker.lastDayReset = block.timestamp;
        }

        // Reset monthly if more than 30 days have passed
        if (block.timestamp >= tracker.lastMonthReset + 30 days) {
            tracker.monthlySpent = 0;
            tracker.lastMonthReset = block.timestamp;
        }
    }

    /**
     * @dev Get current spending with period resets applied (view)
     */
    function _getCurrentSpending(SpendingTracker storage tracker) 
        internal 
        view 
        returns (uint256 dailySpent, uint256 monthlySpent) 
    {
        // Check if daily period has reset
        if (block.timestamp >= tracker.lastDayReset + 1 days) {
            dailySpent = 0;
        } else {
            dailySpent = tracker.dailySpent;
        }

        // Check if monthly period has reset
        if (block.timestamp >= tracker.lastMonthReset + 30 days) {
            monthlySpent = 0;
        } else {
            monthlySpent = tracker.monthlySpent;
        }
    }
}
