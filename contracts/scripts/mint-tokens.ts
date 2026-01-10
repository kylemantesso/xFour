import { ethers } from "hardhat";

async function main() {
  const TOKEN_ADDRESS = "0x0709AA400ef60be15AE4a3B62A29253fdBA840D3";
  const RECIPIENT = "0xD795B7De0F5d068980318cf614ffcdF5591f2433";
  const AMOUNT = ethers.parseEther("100000"); // 100,000 tMNEE

  console.log("=== Minting TestMNEE Tokens ===\n");

  const [signer] = await ethers.getSigners();
  console.log("Minting from owner account:", signer.address);

  // Get the contract
  const testMNEE = await ethers.getContractAt("TestMNEE", TOKEN_ADDRESS);

  // Check current balance
  const balanceBefore = await testMNEE.balanceOf(RECIPIENT);
  console.log("Recipient balance before:", ethers.formatEther(balanceBefore), "tMNEE");

  // Mint tokens using ownerMint (no restrictions)
  console.log(`\nMinting ${ethers.formatEther(AMOUNT)} tMNEE to ${RECIPIENT}...`);
  const tx = await testMNEE.ownerMint(RECIPIENT, AMOUNT);
  console.log("Transaction hash:", tx.hash);
  
  await tx.wait();
  console.log("Transaction confirmed!");

  // Check new balance
  const balanceAfter = await testMNEE.balanceOf(RECIPIENT);
  console.log("\nRecipient balance after:", ethers.formatEther(balanceAfter), "tMNEE");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
