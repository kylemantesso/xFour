// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TestMNEE
 * @dev A test ERC20 token for Sepolia that mimics the MNEE stablecoin interface.
 * Includes a public mint function for testing purposes (faucet capability).
 * 
 * This contract is deployed on Sepolia for testing the x402 payment gateway.
 * The mainnet MNEE contract is at: 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF
 */
contract TestMNEE is ERC20, Ownable {
    /// @notice Maximum amount that can be minted per transaction (1000 MNEE)
    uint256 public constant MAX_MINT_AMOUNT = 1000 * 10**18;
    
    /// @notice Cooldown period between mints for the same address (1 hour)
    uint256 public constant MINT_COOLDOWN = 1 hours;
    
    /// @notice Tracks the last mint timestamp for each address
    mapping(address => uint256) public lastMintTime;

    constructor() ERC20("Test MNEE", "tMNEE") Ownable(msg.sender) {
        // Mint initial supply to deployer (1,000,000 MNEE)
        _mint(msg.sender, 1_000_000 * 10**18);
    }

    /**
     * @notice Public faucet function - anyone can mint test tokens
     * @param to The address to receive the tokens
     * @param amount The amount of tokens to mint (max 1000 MNEE per tx)
     */
    function mint(address to, uint256 amount) external {
        require(amount <= MAX_MINT_AMOUNT, "TestMNEE: exceeds max mint amount");
        require(
            block.timestamp >= lastMintTime[msg.sender] + MINT_COOLDOWN,
            "TestMNEE: mint cooldown active"
        );
        
        lastMintTime[msg.sender] = block.timestamp;
        _mint(to, amount);
    }

    /**
     * @notice Owner-only mint without restrictions (for initial distribution)
     * @param to The address to receive the tokens
     * @param amount The amount of tokens to mint
     */
    function ownerMint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @notice Returns the number of decimals (18, standard ERC20)
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
