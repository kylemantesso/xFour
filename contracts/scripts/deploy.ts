import { ethers } from "hardhat";

async function main() {
  // Get the token address from environment or use a placeholder
  const tokenAddress = process.env.TOKEN_ADDRESS;

  if (!tokenAddress) {
    console.error("ERROR: TOKEN_ADDRESS environment variable is required");
    console.log("Usage: TOKEN_ADDRESS=0x... npx hardhat run scripts/deploy.ts --network <network>");
    process.exit(1);
  }

  console.log("Deploying ERC20WorkspaceTreasury...");
  console.log("Token address:", tokenAddress);

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const Treasury = await ethers.getContractFactory("ERC20WorkspaceTreasury");
  const treasury = await Treasury.deploy(tokenAddress);

  await treasury.waitForDeployment();

  const deployedAddress = await treasury.getAddress();
  console.log("ERC20WorkspaceTreasury deployed to:", deployedAddress);
  console.log("Owner:", await treasury.owner());
  console.log("Token:", await treasury.token());

  return deployedAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


