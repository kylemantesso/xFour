import { ethers } from "hardhat";

async function main() {
  const [owner, user1, user2] = await ethers.getSigners();

  console.log("=".repeat(60));
  console.log("Deploying contracts for local development");
  console.log("=".repeat(60));
  console.log("Deployer:", owner.address);
  console.log("");

  // 1. Deploy MockERC20 (simulating MNEE)
  console.log("1. Deploying MockERC20 (Mock MNEE)...");
  const MockToken = await ethers.getContractFactory("MockERC20");
  const token = await MockToken.deploy("Mock MNEE", "MNEE", 18);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("   MockERC20 deployed to:", tokenAddress);

  // 2. Deploy ERC20WorkspaceTreasury
  console.log("2. Deploying ERC20WorkspaceTreasury...");
  const Treasury = await ethers.getContractFactory("ERC20WorkspaceTreasury");
  const treasury = await Treasury.deploy(tokenAddress);
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log("   Treasury deployed to:", treasuryAddress);

  // 3. Mint tokens to test accounts
  console.log("3. Minting tokens to test accounts...");
  const mintAmount = ethers.parseEther("1000000"); // 1M tokens each

  await token.mint(owner.address, mintAmount);
  console.log("   Minted 1,000,000 MNEE to owner:", owner.address);

  await token.mint(user1.address, mintAmount);
  console.log("   Minted 1,000,000 MNEE to user1:", user1.address);

  await token.mint(user2.address, mintAmount);
  console.log("   Minted 1,000,000 MNEE to user2:", user2.address);

  // 4. Summary
  console.log("");
  console.log("=".repeat(60));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log("");
  console.log("Contract Addresses:");
  console.log("  MockERC20 (MNEE):", tokenAddress);
  console.log("  Treasury:        ", treasuryAddress);
  console.log("");
  console.log("Test Accounts:");
  console.log("  Owner:", owner.address);
  console.log("  User1:", user1.address);
  console.log("  User2:", user2.address);
  console.log("");
  console.log("Environment Variables (copy to .env):");
  console.log(`  TOKEN_ADDRESS=${tokenAddress}`);
  console.log(`  TREASURY_ADDRESS=${treasuryAddress}`);
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

