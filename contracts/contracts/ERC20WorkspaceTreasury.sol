// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IERC20
 * @notice Minimal ERC-20 interface for treasury operations.
 */
interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title ERC20WorkspaceTreasury
 * @author x402-gateway
 * @notice A multi-token treasury contract that holds any ERC-20 tokens and tracks
 *         balances per workspace and per token using a bytes32 workspaceKey.
 * @dev This contract can manage multiple ERC-20 tokens simultaneously. The workspaceKey
 *      is a bytes32 identifier derived off-chain from an application-specific workspace
 *      ID (e.g., keccak256 of a workspace string or UUID).
 *
 *      Usage:
 *      - Any user can deposit any ERC-20 token into a workspace's balance via `deposit()`.
 *      - Only the owner (treasury operator) can debit tokens from a workspace's
 *        balance and send them to an arbitrary recipient via `debit()`.
 *
 *      This contract is intended to be called from:
 *      - A web frontend (for deposit calls, with user wallets).
 *      - A backend "signer service" (for debit calls using the owner key).
 */
contract ERC20WorkspaceTreasury {
    // ============ State Variables ============

    /// @notice The treasury operator (gateway backend signer) who can debit funds.
    address public owner;

    /// @notice Maps a token address to a workspaceKey (bytes32) to that workspace's token balance.
    /// @dev balances[token][workspaceKey] = balance
    mapping(address => mapping(bytes32 => uint256)) public balances;

    // ============ Events ============

    /// @notice Emitted when tokens are deposited into a workspace's balance.
    /// @param token The address of the ERC-20 token deposited.
    /// @param workspaceKey The identifier of the workspace receiving the deposit.
    /// @param from The address that deposited the tokens.
    /// @param amount The amount of tokens deposited.
    event Deposited(address indexed token, bytes32 indexed workspaceKey, address indexed from, uint256 amount);

    /// @notice Emitted when tokens are debited from a workspace's balance.
    /// @param token The address of the ERC-20 token debited.
    /// @param workspaceKey The identifier of the workspace being debited.
    /// @param to The recipient address receiving the tokens.
    /// @param amount The amount of tokens debited.
    event Debited(address indexed token, bytes32 indexed workspaceKey, address indexed to, uint256 amount);

    /// @notice Emitted when tokens are withdrawn for an external swap operation.
    /// @param token The address of the ERC-20 token withdrawn.
    /// @param workspaceKey The identifier of the workspace being debited.
    /// @param to The address receiving the tokens (typically swap router or owner).
    /// @param amount The amount of tokens withdrawn.
    event WithdrawnForSwap(address indexed token, bytes32 indexed workspaceKey, address indexed to, uint256 amount);

    /// @notice Emitted when swapped tokens are credited back to a workspace.
    /// @param token The address of the ERC-20 token credited.
    /// @param workspaceKey The identifier of the workspace being credited.
    /// @param amount The amount of tokens credited.
    event SwapCredited(address indexed token, bytes32 indexed workspaceKey, uint256 amount);

    /// @notice Emitted when ownership of the treasury is transferred.
    /// @param previousOwner The address of the previous owner.
    /// @param newOwner The address of the new owner.
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ============ Modifiers ============

    /// @notice Restricts function access to the contract owner only.
    modifier onlyOwner() {
        require(msg.sender == owner, "ERC20WorkspaceTreasury: caller is not the owner");
        _;
    }

    // ============ Constructor ============

    /**
     * @notice Initializes the treasury.
     * @dev The deployer becomes the initial owner (treasury operator).
     */
    constructor() {
        owner = msg.sender;
    }

    // ============ External Functions ============

    /**
     * @notice Deposits tokens into a workspace's balance.
     * @dev The caller must have previously approved this contract to spend at least
     *      `amount` tokens via the token's `approve()` function.
     * @param token The address of the ERC-20 token to deposit.
     * @param workspaceKey The bytes32 identifier of the workspace to credit.
     *        This is typically derived off-chain (e.g., keccak256 of a workspace ID).
     * @param amount The amount of tokens to deposit. Must be greater than zero.
     */
    function deposit(address token, bytes32 workspaceKey, uint256 amount) external {
        require(token != address(0), "ERC20WorkspaceTreasury: invalid token address");
        require(amount > 0, "ERC20WorkspaceTreasury: amount must be greater than zero");

        bool success = IERC20(token).transferFrom(msg.sender, address(this), amount);
        require(success, "ERC20WorkspaceTreasury: token transfer failed");

        balances[token][workspaceKey] += amount;

        emit Deposited(token, workspaceKey, msg.sender, amount);
    }

    /**
     * @notice Debits tokens from a workspace's balance and sends them to a recipient.
     * @dev Only the owner (treasury operator) can call this function.
     *      This is typically triggered by the backend signer service to pay providers.
     * @param token The address of the ERC-20 token to debit.
     * @param workspaceKey The bytes32 identifier of the workspace to debit.
     * @param to The recipient address to receive the tokens (e.g., provider's payTo address).
     * @param amount The amount of tokens to debit. Must be greater than zero.
     */
    function debit(address token, bytes32 workspaceKey, address to, uint256 amount) external onlyOwner {
        require(token != address(0), "ERC20WorkspaceTreasury: invalid token address");
        require(to != address(0), "ERC20WorkspaceTreasury: invalid recipient address");
        require(amount > 0, "ERC20WorkspaceTreasury: amount must be greater than zero");
        require(
            balances[token][workspaceKey] >= amount,
            "ERC20WorkspaceTreasury: insufficient workspace balance"
        );

        balances[token][workspaceKey] -= amount;

        bool success = IERC20(token).transfer(to, amount);
        require(success, "ERC20WorkspaceTreasury: token transfer failed");

        emit Debited(token, workspaceKey, to, amount);
    }

    /**
     * @notice Transfers ownership of the treasury to a new address.
     * @dev Only the current owner can call this function.
     * @param newOwner The address of the new owner. Cannot be the zero address.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ERC20WorkspaceTreasury: new owner is the zero address");

        address previousOwner = owner;
        owner = newOwner;

        emit OwnershipTransferred(previousOwner, newOwner);
    }

    // ============ Swap Functions ============

    /**
     * @notice Withdraws tokens from a workspace's balance for an external swap operation.
     * @dev Only the owner (treasury operator) can call this function.
     *      Use this when the workspace has token A but needs to pay in token B.
     *      The tokens are sent to the specified `to` address (typically a swap router
     *      or the owner's wallet for executing the swap).
     * @param token The address of the ERC-20 token to withdraw.
     * @param workspaceKey The bytes32 identifier of the workspace to debit.
     * @param to The recipient address (swap router or owner wallet).
     * @param amount The amount of tokens to withdraw.
     */
    function withdrawForSwap(
        address token,
        bytes32 workspaceKey,
        address to,
        uint256 amount
    ) external onlyOwner {
        require(token != address(0), "ERC20WorkspaceTreasury: invalid token address");
        require(to != address(0), "ERC20WorkspaceTreasury: invalid recipient address");
        require(amount > 0, "ERC20WorkspaceTreasury: amount must be greater than zero");
        require(
            balances[token][workspaceKey] >= amount,
            "ERC20WorkspaceTreasury: insufficient workspace balance"
        );

        balances[token][workspaceKey] -= amount;

        bool success = IERC20(token).transfer(to, amount);
        require(success, "ERC20WorkspaceTreasury: token transfer failed");

        emit WithdrawnForSwap(token, workspaceKey, to, amount);
    }

    /**
     * @notice Credits swapped tokens back to a workspace's balance.
     * @dev Only the owner (treasury operator) can call this function.
     *      Call this after executing an external swap to credit the workspace
     *      with the new token type.
     *      The caller must have approved this contract to spend the tokens.
     * @param token The address of the ERC-20 token to credit (the swapped-to token).
     * @param workspaceKey The bytes32 identifier of the workspace to credit.
     * @param amount The amount of tokens to credit.
     */
    function creditFromSwap(
        address token,
        bytes32 workspaceKey,
        uint256 amount
    ) external onlyOwner {
        require(token != address(0), "ERC20WorkspaceTreasury: invalid token address");
        require(amount > 0, "ERC20WorkspaceTreasury: amount must be greater than zero");

        bool success = IERC20(token).transferFrom(msg.sender, address(this), amount);
        require(success, "ERC20WorkspaceTreasury: token transfer failed");

        balances[token][workspaceKey] += amount;

        emit SwapCredited(token, workspaceKey, amount);
    }

    // ============ View Functions ============

    /**
     * @notice Returns the token balance for a specific workspace and token.
     * @dev This is a convenience helper for ABI stability. The `balances` mapping
     *      is also public and can be queried directly.
     * @param token The address of the ERC-20 token.
     * @param workspaceKey The bytes32 identifier of the workspace.
     * @return The token balance of the specified workspace for the given token.
     */
    function workspaceBalance(address token, bytes32 workspaceKey) external view returns (uint256) {
        return balances[token][workspaceKey];
    }
}


