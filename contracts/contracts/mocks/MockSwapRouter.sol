// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IERC20
 * @notice Minimal ERC-20 interface for swap operations.
 */
interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

/**
 * @title MockSwapRouter
 * @author x402-gateway
 * @notice A simple mock swap router for local development/testing.
 *         Performs 1:1 swaps (adjusted for decimal differences) between tokens.
 * @dev This contract holds reserves of multiple tokens and swaps at a fixed 1:1 rate.
 *      Only use for local development - not for production!
 *
 *      Usage:
 *      1. Deploy the contract
 *      2. Fund it with tokens using `addLiquidity()` or direct token transfers
 *      3. Users approve this contract to spend their sellToken
 *      4. Users call `swap()` to exchange tokens
 */
contract MockSwapRouter {
    // ============ Events ============

    /// @notice Emitted when tokens are swapped
    event Swapped(
        address indexed tokenIn,
        address indexed tokenOut,
        address indexed trader,
        uint256 amountIn,
        uint256 amountOut,
        address recipient
    );

    /// @notice Emitted when liquidity is added
    event LiquidityAdded(address indexed token, address indexed provider, uint256 amount);

    /// @notice Emitted when liquidity is removed
    event LiquidityRemoved(address indexed token, address indexed recipient, uint256 amount);

    // ============ State Variables ============

    /// @notice Owner address for admin functions
    address public owner;

    /// @notice Tracks which tokens have been funded
    mapping(address => bool) public supportedTokens;

    // ============ Modifiers ============

    modifier onlyOwner() {
        require(msg.sender == owner, "MockSwapRouter: caller is not the owner");
        _;
    }

    // ============ Constructor ============

    constructor() {
        owner = msg.sender;
    }

    // ============ External Functions ============

    /**
     * @notice Add liquidity to the router for a token
     * @param token The ERC-20 token address
     * @param amount The amount to add
     */
    function addLiquidity(address token, uint256 amount) external {
        require(token != address(0), "MockSwapRouter: invalid token");
        require(amount > 0, "MockSwapRouter: amount must be > 0");

        bool success = IERC20(token).transferFrom(msg.sender, address(this), amount);
        require(success, "MockSwapRouter: transfer failed");

        supportedTokens[token] = true;
        emit LiquidityAdded(token, msg.sender, amount);
    }

    /**
     * @notice Remove liquidity from the router (owner only)
     * @param token The ERC-20 token address
     * @param amount The amount to remove
     * @param recipient The address to send tokens to
     */
    function removeLiquidity(address token, uint256 amount, address recipient) external onlyOwner {
        require(token != address(0), "MockSwapRouter: invalid token");
        require(recipient != address(0), "MockSwapRouter: invalid recipient");
        require(amount > 0, "MockSwapRouter: amount must be > 0");
        require(IERC20(token).balanceOf(address(this)) >= amount, "MockSwapRouter: insufficient liquidity");

        bool success = IERC20(token).transfer(recipient, amount);
        require(success, "MockSwapRouter: transfer failed");

        emit LiquidityRemoved(token, recipient, amount);
    }

    /**
     * @notice Swap tokens at 1:1 rate (adjusted for decimals)
     * @param tokenIn The token to sell
     * @param tokenOut The token to buy
     * @param amountIn The amount of tokenIn to sell
     * @param amountOutMin The minimum amount of tokenOut to receive (slippage protection)
     * @param to The recipient address for tokenOut
     * @return amountOut The actual amount of tokenOut sent
     */
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        address to
    ) external returns (uint256 amountOut) {
        require(tokenIn != address(0), "MockSwapRouter: invalid tokenIn");
        require(tokenOut != address(0), "MockSwapRouter: invalid tokenOut");
        require(tokenIn != tokenOut, "MockSwapRouter: tokens must be different");
        require(amountIn > 0, "MockSwapRouter: amountIn must be > 0");
        require(to != address(0), "MockSwapRouter: invalid recipient");

        // Calculate output amount (1:1, adjusted for decimals)
        amountOut = getAmountOut(tokenIn, tokenOut, amountIn);
        require(amountOut >= amountOutMin, "MockSwapRouter: insufficient output amount");
        require(IERC20(tokenOut).balanceOf(address(this)) >= amountOut, "MockSwapRouter: insufficient liquidity");

        // Transfer tokenIn from sender to this contract
        bool successIn = IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        require(successIn, "MockSwapRouter: tokenIn transfer failed");

        // Transfer tokenOut to recipient
        bool successOut = IERC20(tokenOut).transfer(to, amountOut);
        require(successOut, "MockSwapRouter: tokenOut transfer failed");

        emit Swapped(tokenIn, tokenOut, msg.sender, amountIn, amountOut, to);
    }

    // ============ View Functions ============

    /**
     * @notice Calculate how much tokenIn is needed to receive amountOut of tokenOut
     * @param tokenIn The token to sell
     * @param tokenOut The token to buy
     * @param amountOut The desired amount of tokenOut
     * @return amountIn The amount of tokenIn needed
     */
    function getAmountIn(
        address tokenIn,
        address tokenOut,
        uint256 amountOut
    ) external view returns (uint256 amountIn) {
        uint8 decimalsIn = IERC20(tokenIn).decimals();
        uint8 decimalsOut = IERC20(tokenOut).decimals();

        // 1:1 rate adjusted for decimals
        if (decimalsIn >= decimalsOut) {
            amountIn = amountOut * (10 ** (decimalsIn - decimalsOut));
        } else {
            amountIn = amountOut / (10 ** (decimalsOut - decimalsIn));
        }

        // Add 1% buffer for "slippage" simulation
        amountIn = (amountIn * 101) / 100;
    }

    /**
     * @notice Calculate how much tokenOut will be received for amountIn of tokenIn
     * @param tokenIn The token to sell
     * @param tokenOut The token to buy
     * @param amountIn The amount of tokenIn to sell
     * @return amountOut The amount of tokenOut to receive
     */
    function getAmountOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) public view returns (uint256 amountOut) {
        uint8 decimalsIn = IERC20(tokenIn).decimals();
        uint8 decimalsOut = IERC20(tokenOut).decimals();

        // 1:1 rate adjusted for decimals
        if (decimalsOut >= decimalsIn) {
            amountOut = amountIn * (10 ** (decimalsOut - decimalsIn));
        } else {
            amountOut = amountIn / (10 ** (decimalsIn - decimalsOut));
        }
    }

    /**
     * @notice Get the reserve balance for a token
     * @param token The token address
     * @return The balance held by this contract
     */
    function getReserve(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    /**
     * @notice Check if a swap can be executed
     * @param tokenIn The token to sell
     * @param tokenOut The token to buy
     * @param amountIn The amount to swap
     * @return canExecute Whether the swap can be executed
     * @return outputAmount The expected output amount
     */
    function canSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (bool canExecute, uint256 outputAmount) {
        if (tokenIn == address(0) || tokenOut == address(0) || tokenIn == tokenOut) {
            return (false, 0);
        }

        outputAmount = getAmountOut(tokenIn, tokenOut, amountIn);
        canExecute = IERC20(tokenOut).balanceOf(address(this)) >= outputAmount;
    }

    // ============ Admin Functions ============

    /**
     * @notice Transfer ownership
     * @param newOwner The new owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "MockSwapRouter: invalid new owner");
        owner = newOwner;
    }
}

