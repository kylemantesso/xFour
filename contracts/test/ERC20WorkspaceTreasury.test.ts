import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("ERC20WorkspaceTreasury", function () {
  // Helper to create a workspace key from a string
  function workspaceKeyFromString(str: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(str));
  }

  async function deployFixture() {
    const [owner, user1, user2, recipient] = await ethers.getSigners();

    // Deploy a mock ERC20 token for testing
    const MockToken = await ethers.getContractFactory("MockERC20");
    const token = await MockToken.deploy("Mock Token", "MOCK", 18);
    await token.waitForDeployment();

    // Deploy the treasury
    const Treasury = await ethers.getContractFactory("ERC20WorkspaceTreasury");
    const treasury = await Treasury.deploy(await token.getAddress());
    await treasury.waitForDeployment();

    // Mint tokens to users
    const mintAmount = ethers.parseEther("10000");
    await token.mint(user1.address, mintAmount);
    await token.mint(user2.address, mintAmount);

    return { treasury, token, owner, user1, user2, recipient };
  }

  describe("Deployment", function () {
    it("Should set the correct token address", async function () {
      const { treasury, token } = await loadFixture(deployFixture);
      expect(await treasury.token()).to.equal(await token.getAddress());
    });

    it("Should set the deployer as owner", async function () {
      const { treasury, owner } = await loadFixture(deployFixture);
      expect(await treasury.owner()).to.equal(owner.address);
    });

    it("Should revert if token address is zero", async function () {
      const Treasury = await ethers.getContractFactory("ERC20WorkspaceTreasury");
      await expect(Treasury.deploy(ethers.ZeroAddress)).to.be.revertedWith(
        "ERC20WorkspaceTreasury: invalid token address"
      );
    });
  });

  describe("Deposit", function () {
    it("Should allow deposits and update workspace balance", async function () {
      const { treasury, token, user1 } = await loadFixture(deployFixture);
      const workspaceKey = workspaceKeyFromString("workspace-1");
      const depositAmount = ethers.parseEther("100");

      // Approve treasury to spend tokens
      await token.connect(user1).approve(await treasury.getAddress(), depositAmount);

      // Deposit
      await expect(treasury.connect(user1).deposit(workspaceKey, depositAmount))
        .to.emit(treasury, "Deposited")
        .withArgs(workspaceKey, user1.address, depositAmount);

      // Check balance
      expect(await treasury.workspaceBalance(workspaceKey)).to.equal(depositAmount);
      expect(await treasury.balances(workspaceKey)).to.equal(depositAmount);
    });

    it("Should allow multiple deposits to the same workspace", async function () {
      const { treasury, token, user1, user2 } = await loadFixture(deployFixture);
      const workspaceKey = workspaceKeyFromString("workspace-1");
      const depositAmount1 = ethers.parseEther("100");
      const depositAmount2 = ethers.parseEther("200");

      // User1 deposits
      await token.connect(user1).approve(await treasury.getAddress(), depositAmount1);
      await treasury.connect(user1).deposit(workspaceKey, depositAmount1);

      // User2 deposits to same workspace
      await token.connect(user2).approve(await treasury.getAddress(), depositAmount2);
      await treasury.connect(user2).deposit(workspaceKey, depositAmount2);

      // Check total balance
      expect(await treasury.workspaceBalance(workspaceKey)).to.equal(
        depositAmount1 + depositAmount2
      );
    });

    it("Should revert if amount is zero", async function () {
      const { treasury, user1 } = await loadFixture(deployFixture);
      const workspaceKey = workspaceKeyFromString("workspace-1");

      await expect(treasury.connect(user1).deposit(workspaceKey, 0)).to.be.revertedWith(
        "ERC20WorkspaceTreasury: amount must be greater than zero"
      );
    });

    it("Should revert if transfer fails (no approval)", async function () {
      const { treasury, user1 } = await loadFixture(deployFixture);
      const workspaceKey = workspaceKeyFromString("workspace-1");
      const depositAmount = ethers.parseEther("100");

      // No approval given - MockERC20 reverts with "ERC20: insufficient allowance"
      await expect(
        treasury.connect(user1).deposit(workspaceKey, depositAmount)
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });
  });

  describe("Debit", function () {
    it("Should allow owner to debit tokens", async function () {
      const { treasury, token, owner, user1, recipient } = await loadFixture(deployFixture);
      const workspaceKey = workspaceKeyFromString("workspace-1");
      const depositAmount = ethers.parseEther("100");
      const debitAmount = ethers.parseEther("30");

      // Setup: deposit first
      await token.connect(user1).approve(await treasury.getAddress(), depositAmount);
      await treasury.connect(user1).deposit(workspaceKey, depositAmount);

      // Debit
      await expect(treasury.connect(owner).debit(workspaceKey, recipient.address, debitAmount))
        .to.emit(treasury, "Debited")
        .withArgs(workspaceKey, recipient.address, debitAmount);

      // Check balances
      expect(await treasury.workspaceBalance(workspaceKey)).to.equal(depositAmount - debitAmount);
      expect(await token.balanceOf(recipient.address)).to.equal(debitAmount);
    });

    it("Should revert if caller is not owner", async function () {
      const { treasury, token, user1, recipient } = await loadFixture(deployFixture);
      const workspaceKey = workspaceKeyFromString("workspace-1");
      const depositAmount = ethers.parseEther("100");

      // Setup: deposit first
      await token.connect(user1).approve(await treasury.getAddress(), depositAmount);
      await treasury.connect(user1).deposit(workspaceKey, depositAmount);

      // Try to debit as non-owner
      await expect(
        treasury.connect(user1).debit(workspaceKey, recipient.address, depositAmount)
      ).to.be.revertedWith("ERC20WorkspaceTreasury: caller is not the owner");
    });

    it("Should revert if recipient is zero address", async function () {
      const { treasury, token, owner, user1 } = await loadFixture(deployFixture);
      const workspaceKey = workspaceKeyFromString("workspace-1");
      const depositAmount = ethers.parseEther("100");

      // Setup: deposit first
      await token.connect(user1).approve(await treasury.getAddress(), depositAmount);
      await treasury.connect(user1).deposit(workspaceKey, depositAmount);

      // Try to debit to zero address
      await expect(
        treasury.connect(owner).debit(workspaceKey, ethers.ZeroAddress, depositAmount)
      ).to.be.revertedWith("ERC20WorkspaceTreasury: invalid recipient address");
    });

    it("Should revert if amount is zero", async function () {
      const { treasury, owner, recipient } = await loadFixture(deployFixture);
      const workspaceKey = workspaceKeyFromString("workspace-1");

      await expect(
        treasury.connect(owner).debit(workspaceKey, recipient.address, 0)
      ).to.be.revertedWith("ERC20WorkspaceTreasury: amount must be greater than zero");
    });

    it("Should revert if insufficient balance", async function () {
      const { treasury, token, owner, user1, recipient } = await loadFixture(deployFixture);
      const workspaceKey = workspaceKeyFromString("workspace-1");
      const depositAmount = ethers.parseEther("100");
      const debitAmount = ethers.parseEther("150");

      // Setup: deposit first
      await token.connect(user1).approve(await treasury.getAddress(), depositAmount);
      await treasury.connect(user1).deposit(workspaceKey, depositAmount);

      // Try to debit more than balance
      await expect(
        treasury.connect(owner).debit(workspaceKey, recipient.address, debitAmount)
      ).to.be.revertedWith("ERC20WorkspaceTreasury: insufficient workspace balance");
    });
  });

  describe("TransferOwnership", function () {
    it("Should allow owner to transfer ownership", async function () {
      const { treasury, owner, user1 } = await loadFixture(deployFixture);

      await expect(treasury.connect(owner).transferOwnership(user1.address))
        .to.emit(treasury, "OwnershipTransferred")
        .withArgs(owner.address, user1.address);

      expect(await treasury.owner()).to.equal(user1.address);
    });

    it("Should revert if caller is not owner", async function () {
      const { treasury, user1, user2 } = await loadFixture(deployFixture);

      await expect(treasury.connect(user1).transferOwnership(user2.address)).to.be.revertedWith(
        "ERC20WorkspaceTreasury: caller is not the owner"
      );
    });

    it("Should revert if new owner is zero address", async function () {
      const { treasury, owner } = await loadFixture(deployFixture);

      await expect(treasury.connect(owner).transferOwnership(ethers.ZeroAddress)).to.be.revertedWith(
        "ERC20WorkspaceTreasury: new owner is the zero address"
      );
    });
  });
});

