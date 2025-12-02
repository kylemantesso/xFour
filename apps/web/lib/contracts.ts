/**
 * Minimal ERC-20 ABI for treasury operations
 */
export const erc20Abi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

/**
 * ERC20WorkspaceTreasury ABI
 */
export const treasuryAbi = [
  {
    name: "deposit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "workspaceKey", type: "bytes32" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "balances",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "workspaceKey", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "workspaceBalance",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "workspaceKey", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "token",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

