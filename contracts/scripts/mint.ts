import { ethers } from "hardhat";
import * as readline from "readline";

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const tokenAddress = process.env.NEXT_PUBLIC_TOKEN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
  
  console.log("\n🪙  Token Minter");
  console.log("================");
  console.log(`Token contract: ${tokenAddress}\n`);

  // Prompt for address
  const toAddress = await prompt("Enter wallet address: ");
  
  if (!toAddress || !toAddress.startsWith("0x")) {
    console.error("❌ Invalid address. Must start with 0x");
    process.exit(1);
  }

  // Prompt for amount with default
  const amountInput = await prompt("Enter amount to mint (default: 1000): ");
  const amount = amountInput || "1000";

  console.log(`\nMinting ${amount} tokens to ${toAddress}...`);

  const token = await ethers.getContractAt("MockERC20", tokenAddress);
  
  // Get decimals
  const decimals = await token.decimals();
  const amountWithDecimals = ethers.parseUnits(amount, decimals);
  
  // Mint tokens
  const tx = await token.mint(toAddress, amountWithDecimals);
  await tx.wait();
  
  // Check new balance
  const balance = await token.balanceOf(toAddress);
  const formattedBalance = ethers.formatUnits(balance, decimals);
  
  console.log(`\n✅ Minted ${amount} tokens!`);
  console.log(`New balance: ${formattedBalance} tokens\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
