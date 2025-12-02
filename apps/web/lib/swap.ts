import {
  createWalletClient,
  createPublicClient,
  http,
  parseUnits,
  formatUnits,
  getAddress,
  encodeFunctionData,
  type Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { localhost, base, baseSepolia, ZEROX_API_URLS } from "./wagmi";
import { erc20Abi } from "./contracts";

// ============================================
// TYPES
// ============================================

export interface SwapQuote {
  sellToken: `0x${string}`;
  buyToken: `0x${string}`;
  sellAmount: bigint;
  buyAmount: bigint;
  price: string;
  guaranteedPrice: string;
  to: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
  gas: bigint;
  gasPrice: bigint;
  estimatedGas: bigint;
  sources: Array<{ name: string; proportion: string }>;
  allowanceTarget: `0x${string}`;
}

export interface SwapResult {
  success: boolean;
  txHash?: string;
  sellAmount: bigint;
  buyAmount: bigint;
  error?: string;
}

export interface SwapParams {
  sellToken: `0x${string}`;
  buyToken: `0x${string}`;
  buyAmount: bigint; // Amount we need to receive
  sellTokenDecimals: number;
  buyTokenDecimals: number;
  fromAddress: `0x${string}`; // Address executing the swap
  slippagePercentage?: number;
}

// ============================================
// MOCK SWAP ROUTER ABI
// ============================================

export const mockSwapRouterAbi = [
  {
    name: "swap",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "to", type: "address" },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
  },
  {
    name: "getAmountIn",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "amountOut", type: "uint256" },
    ],
    outputs: [{ name: "amountIn", type: "uint256" }],
  },
  {
    name: "getAmountOut",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "amountIn", type: "uint256" },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
  },
] as const;

// ============================================
// ENVIRONMENT DETECTION
// ============================================

export type SwapEnvironment = "localhost" | "base" | "base-sepolia";

export function getSwapEnvironment(chainId: number): SwapEnvironment {
  switch (chainId) {
    case 31337:
      return "localhost";
    case 8453:
      return "base";
    case 84532:
      return "base-sepolia";
    default:
      throw new Error(`Unsupported chain ID for swaps: ${chainId}`);
  }
}

export function getChainForEnvironment(env: SwapEnvironment): Chain {
  switch (env) {
    case "localhost":
      return localhost;
    case "base":
      return base;
    case "base-sepolia":
      return baseSepolia;
  }
}

/**
 * Build a chain from Convex config
 */
function buildChainFromConfig(chainId: number, rpcUrl: string): Chain {
  return {
    id: chainId,
    name: `Chain ${chainId}`,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: { http: [rpcUrl] },
    },
  } as Chain;
}

// ============================================
// SWAP SERVICE CLASS
// ============================================

export interface SwapServiceConfig {
  chainId: number;
  rpcUrl: string;
  signerPrivateKey: `0x${string}`;
  // For localhost: mock router address from Convex
  mockRouterAddress?: `0x${string}`;
  // For production: 0x API URL from Convex and API key from env
  zeroxApiUrl?: string;
  zeroxApiKey?: string;
}

export class SwapService {
  private chainId: number;
  private rpcUrl: string;
  private environment: SwapEnvironment;
  private signerPrivateKey: `0x${string}`;
  private mockRouterAddress?: `0x${string}`;
  private zeroxApiUrl?: string;
  private zeroxApiKey?: string;

  constructor(config: SwapServiceConfig) {
    this.chainId = config.chainId;
    this.rpcUrl = config.rpcUrl;
    this.environment = getSwapEnvironment(config.chainId);
    this.signerPrivateKey = config.signerPrivateKey;
    this.mockRouterAddress = config.mockRouterAddress ? config.mockRouterAddress as `0x${string}` : undefined;
    this.zeroxApiUrl = config.zeroxApiUrl;
    this.zeroxApiKey = config.zeroxApiKey;

    // Validate config
    if (this.environment === "localhost" && !this.mockRouterAddress) {
      throw new Error("MockSwapRouter address required for localhost");
    }
    if (this.environment !== "localhost" && !this.zeroxApiUrl) {
      throw new Error("0x API URL required for production chains");
    }
    if (this.environment !== "localhost" && !this.zeroxApiKey) {
      throw new Error("0x API key required for production chains");
    }
  }

  /**
   * Check if a swap is needed between two tokens
   */
  isSwapNeeded(sellToken: string, buyToken: string): boolean {
    return sellToken.toLowerCase() !== buyToken.toLowerCase();
  }

  /**
   * Get a quote for swapping tokens
   * Returns the amount of sellToken needed to receive buyAmount of buyToken
   */
  async getQuote(params: SwapParams): Promise<SwapQuote> {
    if (this.environment === "localhost") {
      return this.getMockQuote(params);
    }
    return this.get0xQuote(params);
  }

  /**
   * Execute a token swap
   */
  async executeSwap(
    params: SwapParams,
    quote?: SwapQuote
  ): Promise<SwapResult> {
    // Get quote if not provided
    const swapQuote = quote ?? (await this.getQuote(params));

    if (this.environment === "localhost") {
      return this.executeMockSwap(params, swapQuote);
    }
    return this.execute0xSwap(params, swapQuote);
  }

  // ============================================
  // MOCK SWAP IMPLEMENTATION (Localhost)
  // ============================================

  private async getMockQuote(params: SwapParams): Promise<SwapQuote> {
    const chain = buildChainFromConfig(this.chainId, this.rpcUrl);
    const publicClient = createPublicClient({
      chain,
      transport: http(this.rpcUrl),
    });

    // Mock router uses 1:1 rate, adjusted for decimals
    // If selling MNEE (18 decimals) to buy USDC (6 decimals), need to adjust
    const decimalDiff = params.sellTokenDecimals - params.buyTokenDecimals;
    let sellAmount: bigint;
    
    if (decimalDiff > 0) {
      // sellToken has more decimals, multiply buyAmount
      sellAmount = params.buyAmount * BigInt(10 ** decimalDiff);
    } else if (decimalDiff < 0) {
      // buyToken has more decimals, divide buyAmount
      sellAmount = params.buyAmount / BigInt(10 ** Math.abs(decimalDiff));
    } else {
      // Same decimals, 1:1
      sellAmount = params.buyAmount;
    }

    // Add 1% buffer for mock slippage
    sellAmount = (sellAmount * 101n) / 100n;

    return {
      sellToken: params.sellToken,
      buyToken: params.buyToken,
      sellAmount,
      buyAmount: params.buyAmount,
      price: "1.0",
      guaranteedPrice: "0.99",
      to: this.mockRouterAddress!,
      data: "0x" as `0x${string}`,
      value: 0n,
      gas: 200000n,
      gasPrice: 1000000000n, // 1 gwei
      estimatedGas: 150000n,
      sources: [{ name: "MockRouter", proportion: "1" }],
      allowanceTarget: this.mockRouterAddress!,
    };
  }

  private async executeMockSwap(
    params: SwapParams,
    quote: SwapQuote
  ): Promise<SwapResult> {
    const chain = buildChainFromConfig(this.chainId, this.rpcUrl);
    const account = privateKeyToAccount(this.signerPrivateKey);

    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(this.rpcUrl),
    });

    const publicClient = createPublicClient({
      chain,
      transport: http(this.rpcUrl),
    });

    try {
      // 1. Approve mock router to spend sellToken
      const approveHash = await walletClient.writeContract({
        address: params.sellToken,
        abi: erc20Abi,
        functionName: "approve",
        args: [this.mockRouterAddress!, quote.sellAmount],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      // 2. Execute swap on mock router
      const swapHash = await walletClient.writeContract({
        address: this.mockRouterAddress!,
        abi: mockSwapRouterAbi,
        functionName: "swap",
        args: [
          params.sellToken,
          params.buyToken,
          quote.sellAmount,
          quote.buyAmount,
          params.fromAddress,
        ],
      });
      await publicClient.waitForTransactionReceipt({ hash: swapHash });

      return {
        success: true,
        txHash: swapHash,
        sellAmount: quote.sellAmount,
        buyAmount: quote.buyAmount,
      };
    } catch (error) {
      return {
        success: false,
        sellAmount: quote.sellAmount,
        buyAmount: quote.buyAmount,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ============================================
  // 0x SWAP IMPLEMENTATION (Production)
  // ============================================

  private async get0xQuote(params: SwapParams): Promise<SwapQuote> {
    // Use 0x API URL from Convex chain config
    if (!this.zeroxApiUrl) {
      throw new Error(`No 0x API URL configured for chain ${this.chainId}`);
    }

    const slippage = params.slippagePercentage ?? 1; // Default 1%

    // Use sellAmount endpoint - we need to know how much to sell to get buyAmount
    const queryParams = new URLSearchParams({
      sellToken: params.sellToken,
      buyToken: params.buyToken,
      buyAmount: params.buyAmount.toString(),
      slippagePercentage: (slippage / 100).toString(),
      takerAddress: params.fromAddress,
    });

    const response = await fetch(`${this.zeroxApiUrl}/swap/v1/quote?${queryParams}`, {
      headers: {
        "0x-api-key": this.zeroxApiKey!,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`0x API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return {
      sellToken: getAddress(data.sellToken) as `0x${string}`,
      buyToken: getAddress(data.buyToken) as `0x${string}`,
      sellAmount: BigInt(data.sellAmount),
      buyAmount: BigInt(data.buyAmount),
      price: data.price,
      guaranteedPrice: data.guaranteedPrice,
      to: getAddress(data.to) as `0x${string}`,
      data: data.data as `0x${string}`,
      value: BigInt(data.value || "0"),
      gas: BigInt(data.gas || "0"),
      gasPrice: BigInt(data.gasPrice || "0"),
      estimatedGas: BigInt(data.estimatedGas || data.gas || "0"),
      sources: data.sources || [],
      allowanceTarget: getAddress(data.allowanceTarget) as `0x${string}`,
    };
  }

  private async execute0xSwap(
    params: SwapParams,
    quote: SwapQuote
  ): Promise<SwapResult> {
    const chain = buildChainFromConfig(this.chainId, this.rpcUrl);
    const account = privateKeyToAccount(this.signerPrivateKey);

    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(this.rpcUrl),
    });

    const publicClient = createPublicClient({
      chain,
      transport: http(this.rpcUrl),
    });

    try {
      // 1. Check and set allowance if needed
      const currentAllowance = await publicClient.readContract({
        address: params.sellToken,
        abi: erc20Abi,
        functionName: "allowance",
        args: [params.fromAddress, quote.allowanceTarget],
      });

      if (currentAllowance < quote.sellAmount) {
        const approveHash = await walletClient.writeContract({
          address: params.sellToken,
          abi: erc20Abi,
          functionName: "approve",
          args: [quote.allowanceTarget, quote.sellAmount],
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      // 2. Execute the swap via 0x
      const swapHash = await walletClient.sendTransaction({
        to: quote.to,
        data: quote.data,
        value: quote.value,
        gas: quote.estimatedGas,
      });

      await publicClient.waitForTransactionReceipt({ hash: swapHash });

      return {
        success: true,
        txHash: swapHash,
        sellAmount: quote.sellAmount,
        buyAmount: quote.buyAmount,
      };
    } catch (error) {
      return {
        success: false,
        sellAmount: quote.sellAmount,
        buyAmount: quote.buyAmount,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

export interface CreateSwapServiceParams {
  chainId: number;
  rpcUrl: string;
  swapRouterAddress?: string; // Mock router for localhost (from Convex)
  zeroxApiUrl?: string; // 0x API URL (from Convex)
}

/**
 * Create a SwapService instance with chain config from Convex
 * Only the API key comes from environment variables
 */
export function createSwapService(params: CreateSwapServiceParams): SwapService {
  const signerPrivateKey = process.env.TREASURY_SIGNER_PRIVATE_KEY as `0x${string}`;
  const zeroxApiKey = process.env.ZEROX_API_KEY;

  if (!signerPrivateKey) {
    throw new Error("TREASURY_SIGNER_PRIVATE_KEY not configured");
  }

  return new SwapService({
    chainId: params.chainId,
    rpcUrl: params.rpcUrl,
    signerPrivateKey,
    mockRouterAddress: params.swapRouterAddress as `0x${string}` | undefined,
    zeroxApiUrl: params.zeroxApiUrl,
    zeroxApiKey,
  });
}

