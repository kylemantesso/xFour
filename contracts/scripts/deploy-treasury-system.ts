import { ethers } from "hardhat";

async function main() {
  console.log("=== Deploying x402 Treasury System ===\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  // Get MNEE token address from environment or deploy TestMNEE for testnet
  let tokenAddress = process.env.MNEE_TOKEN_ADDRESS;
  
  if (!tokenAddress) {
    console.log("No MNEE_TOKEN_ADDRESS set, deploying TestMNEE...");
    const TestMNEE = await ethers.getContractFactory("TestMNEE");
    const testMNEE = await TestMNEE.deploy();
    await testMNEE.waitForDeployment();
    tokenAddress = await testMNEE.getAddress();
    console.log("TestMNEE deployed to:", tokenAddress, "\n");
  } else {
    console.log("Using existing MNEE token:", tokenAddress, "\n");
  }

  // Step 1: Deploy TreasuryFactory
  console.log("Step 1: Deploying TreasuryFactory...");
  
  // We'll use the deployer as a temporary gateway, then update after X402Gateway is deployed
  const TreasuryFactory = await ethers.getContractFactory("TreasuryFactory");
  const factory = await TreasuryFactory.deploy(tokenAddress, deployer.address);
  await factory.waitForDeployment();
  
  const factoryAddress = await factory.getAddress();
  console.log("TreasuryFactory deployed to:", factoryAddress, "\n");

  // Step 2: Deploy X402Gateway
  console.log("Step 2: Deploying X402Gateway...");
  
  const X402Gateway = await ethers.getContractFactory("X402Gateway");
  const gateway = await X402Gateway.deploy(factoryAddress);
  await gateway.waitForDeployment();
  
  const gatewayAddress = await gateway.getAddress();
  console.log("X402Gateway deployed to:", gatewayAddress, "\n");

  // Step 3: Update TreasuryFactory to use the real gateway
  console.log("Step 3: Updating TreasuryFactory default gateway...");
  await factory.setDefaultGateway(gatewayAddress);
  console.log("Default gateway updated!\n");

  // Print summary
  console.log("=".repeat(60));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log("\nContract Addresses:");
  console.log("  MNEE Token:       ", tokenAddress);
  console.log("  TreasuryFactory:  ", factoryAddress);
  console.log("  X402Gateway:      ", gatewayAddress);
  console.log("\nGateway Owner:      ", deployer.address);
  
  console.log("\n=".repeat(60));
  console.log("NEXT STEPS");
  console.log("=".repeat(60));
  console.log("\n1. Update your .env file with these addresses:");
  console.log(`   MNEE_TOKEN_ADDRESS=${tokenAddress}`);
  console.log(`   TREASURY_FACTORY_ADDRESS=${factoryAddress}`);
  console.log(`   X402_GATEWAY_ADDRESS=${gatewayAddress}`);
  console.log(`   GATEWAY_PRIVATE_KEY=<deployer's private key>`);
  
  console.log("\n2. Verify contracts on Etherscan:");
  console.log(`   npx hardhat verify --network sepolia ${tokenAddress}`);
  console.log(`   npx hardhat verify --network sepolia ${factoryAddress} ${tokenAddress} ${deployer.address}`);
  console.log(`   npx hardhat verify --network sepolia ${gatewayAddress} ${factoryAddress}`);

  console.log("\n3. Update apps/web/.env.local with:");
  console.log(`   MNEE_CONTRACT_ADDRESS=${tokenAddress}`);
  console.log(`   TREASURY_FACTORY_ADDRESS=${factoryAddress}`);
  console.log(`   X402_GATEWAY_ADDRESS=${gatewayAddress}`);
  console.log(`   GATEWAY_PRIVATE_KEY=<deployer's private key>`);

  // Return addresses for programmatic use
  return {
    token: tokenAddress,
    factory: factoryAddress,
    gateway: gatewayAddress,
    deployer: deployer.address,
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
