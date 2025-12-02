import { ethers } from "hardhat";

async function main() {
  const [owner, user1, user2] = await ethers.getSigners();

  console.log("=".repeat(60));
  console.log("Deploying contracts for local development");
  console.log("=".repeat(60));
  console.log("Deployer:", owner.address);
  console.log("");

  // 1. Deploy MockERC20 tokens
  console.log("1. Deploying MockERC20 tokens...");
  const MockToken = await ethers.getContractFactory("MockERC20");
  
  // MNEE token (18 decimals)
  const mneeToken = await MockToken.deploy("Mock MNEE", "MNEE", 18);
  await mneeToken.waitForDeployment();
  const mneeAddress = await mneeToken.getAddress();
  console.log("   MockERC20 (MNEE) deployed to:", mneeAddress);

  // USDC token (6 decimals, like real USDC)
  const usdcToken = await MockToken.deploy("Mock USDC", "USDC", 6);
  await usdcToken.waitForDeployment();
  const usdcAddress = await usdcToken.getAddress();
  console.log("   MockERC20 (USDC) deployed to:", usdcAddress);

  // 2. Deploy ERC20WorkspaceTreasury
  console.log("2. Deploying ERC20WorkspaceTreasury...");
  const Treasury = await ethers.getContractFactory("ERC20WorkspaceTreasury");
  const treasury = await Treasury.deploy();
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log("   Treasury deployed to:", treasuryAddress);

  // 3. Deploy MockSwapRouter
  console.log("3. Deploying MockSwapRouter...");
  const SwapRouter = await ethers.getContractFactory("MockSwapRouter");
  const swapRouter = await SwapRouter.deploy();
  await swapRouter.waitForDeployment();
  const swapRouterAddress = await swapRouter.getAddress();
  console.log("   MockSwapRouter deployed to:", swapRouterAddress);

  // 4. Mint tokens to test accounts
  console.log("4. Minting tokens to test accounts...");
  const mneeAmount = ethers.parseEther("1000000"); // 1M MNEE (18 decimals)
  const usdcAmount = ethers.parseUnits("1000000", 6); // 1M USDC (6 decimals)

  // Mint MNEE
  await mneeToken.mint(owner.address, mneeAmount);
  console.log("   Minted 1,000,000 MNEE to owner:", owner.address);

  await mneeToken.mint(user1.address, mneeAmount);
  console.log("   Minted 1,000,000 MNEE to user1:", user1.address);

  await mneeToken.mint(user2.address, mneeAmount);
  console.log("   Minted 1,000,000 MNEE to user2:", user2.address);

  // Mint USDC
  await usdcToken.mint(owner.address, usdcAmount);
  console.log("   Minted 1,000,000 USDC to owner:", owner.address);

  await usdcToken.mint(user1.address, usdcAmount);
  console.log("   Minted 1,000,000 USDC to user1:", user1.address);

  await usdcToken.mint(user2.address, usdcAmount);
  console.log("   Minted 1,000,000 USDC to user2:", user2.address);

  // 5. Fund the swap router with liquidity
  console.log("5. Funding MockSwapRouter with liquidity...");
  const routerMneeAmount = ethers.parseEther("100000"); // 100K MNEE
  const routerUsdcAmount = ethers.parseUnits("100000", 6); // 100K USDC

  // Mint tokens to owner for funding the router
  await mneeToken.mint(owner.address, routerMneeAmount);
  await usdcToken.mint(owner.address, routerUsdcAmount);

  // Approve and add liquidity
  await mneeToken.approve(swapRouterAddress, routerMneeAmount);
  await swapRouter.addLiquidity(mneeAddress, routerMneeAmount);
  console.log("   Added 100,000 MNEE liquidity to swap router");

  await usdcToken.approve(swapRouterAddress, routerUsdcAmount);
  await swapRouter.addLiquidity(usdcAddress, routerUsdcAmount);
  console.log("   Added 100,000 USDC liquidity to swap router");

  // 6. Summary
  console.log("");
  console.log("=".repeat(60));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log("");
  console.log("Contract Addresses:");
  console.log("  MockERC20 (MNEE):", mneeAddress);
  console.log("  MockERC20 (USDC):", usdcAddress);
  console.log("  Treasury:        ", treasuryAddress);
  console.log("  SwapRouter:      ", swapRouterAddress);
  console.log("");
  console.log("Test Accounts:");
  console.log("  Owner:", owner.address);
  console.log("  User1:", user1.address);
  console.log("  User2:", user2.address);
  console.log("");

  // 7. Auto-setup Convex
  console.log("=".repeat(60));
  console.log("SETTING UP CONVEX...");
  console.log("=".repeat(60));
  console.log("");

  try {
    const response = await fetch("http://localhost:3000/api/admin/setup-local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        treasuryAddress,
        swapRouterAddress,
        mneeAddress,
        usdcAddress,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log("✅ Convex setup successful!");
      console.log("");
      result.results.forEach((r: string) => console.log("   •", r));
      console.log("");
      console.log("=".repeat(60));
      console.log("READY TO GO!");
      console.log("=".repeat(60));
      console.log("");
      console.log("Next step: Go to Treasury page → Select Localhost → Add MNEE/USDC to your workspace");
      console.log("");
    } else {
      const error = await response.text();
      console.log("❌ Convex setup failed:", error);
      console.log("");
      console.log("Make sure Next.js is running (pnpm dev), then run manually:");
      printManualInstructions(treasuryAddress, swapRouterAddress, mneeAddress, usdcAddress);
    }
  } catch (error) {
    console.log("❌ Could not connect to Next.js server");
    console.log("");
    console.log("Make sure Next.js is running (pnpm dev), then run manually:");
    printManualInstructions(treasuryAddress, swapRouterAddress, mneeAddress, usdcAddress);
  }

  console.log("");
  console.log("Swap Router Liquidity:");
  console.log("  MNEE: 100,000");
  console.log("  USDC: 100,000");
  console.log("");
}

function printManualInstructions(
  treasuryAddress: string,
  swapRouterAddress: string,
  mneeAddress: string,
  usdcAddress: string
) {
  console.log("");
  console.log(`curl -X POST http://localhost:3000/api/admin/setup-local \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"treasuryAddress":"${treasuryAddress}","swapRouterAddress":"${swapRouterAddress}","mneeAddress":"${mneeAddress}","usdcAddress":"${usdcAddress}"}'`);
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


