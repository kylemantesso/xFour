import { ethers } from "hardhat";

async function main() {
  console.log("Deploying TestMNEE contract...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  const TestMNEE = await ethers.getContractFactory("TestMNEE");
  const testMNEE = await TestMNEE.deploy();

  await testMNEE.waitForDeployment();

  const address = await testMNEE.getAddress();
  console.log("TestMNEE deployed to:", address);

  // Log initial supply
  const totalSupply = await testMNEE.totalSupply();
  console.log("Initial supply:", ethers.formatEther(totalSupply), "tMNEE");

  console.log("\n=== DEPLOYMENT COMPLETE ===");
  console.log("Contract Address:", address);
  console.log("\nNext steps:");
  console.log("1. Update apps/web/lib/ethereum/mnee-contract.ts with this address");
  console.log("2. Verify the contract on Etherscan:");
  console.log(`   npx hardhat verify --network sepolia ${address}`);
  console.log("\n3. Add the token to your wallet with:");
  console.log("   Token Address:", address);
  console.log("   Symbol: tMNEE");
  console.log("   Decimals: 18");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
