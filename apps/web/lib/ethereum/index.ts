/**
 * Ethereum Integration Module
 * 
 * Re-exports all Ethereum-related utilities for the x402 gateway.
 * Uses non-custodial Treasury contracts for payments.
 */

// Client utilities
export {
  createEthereumPublicClient,
  createEthereumWalletClient,
  getChain,
  getChainId,
  getExplorerTxUrl,
  getExplorerAddressUrl,
  getExplorerTokenUrl,
  type EthereumNetwork,
} from "./client";

// MNEE Contract configuration
export {
  MNEE_ABI,
  TEST_MNEE_ABI,
  MNEE_CONTRACT_ADDRESSES,
  MNEE_DECIMALS,
  getMneeContractAddress,
  parseMneeAmount,
  formatMneeAmount,
} from "./mnee-contract";

// Treasury system (non-custodial)
export {
  // ABIs
  TREASURY_FACTORY_ABI,
  TREASURY_ABI,
  X402_GATEWAY_ABI,
  ERC20_ABI,
  // Utilities
  hashApiKey,
  generatePaymentNonce,
  parseMneeAmount as parseTreasuryAmount,
  formatMneeAmount as formatTreasuryAmount,
  // Contract addresses
  getContractAddresses,
  getTreasuryAddress,
  // Treasury reads
  getTreasuryStats,
  getTreasuryBalance,
  getApiKeyLimits,
  getApiKeySpending,
  getRemainingAllowance,
  checkPaymentAllowed,
  // Treasury writes (transaction builders)
  buildApproveTransaction,
  buildDepositTransaction,
  buildConfigureApiKeyTransaction,
  // Gateway payment execution
  executeGatewayPayment,
  // Types
  type ContractAddresses,
  type TreasuryStats,
  type ApiKeyLimits,
  type ApiKeySpending,
  type RemainingAllowance,
} from "./treasury";
