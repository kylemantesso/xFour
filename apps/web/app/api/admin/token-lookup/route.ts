import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, getAddress, isAddress } from "viem";
import { base, baseSepolia, mainnet, sepolia, localhost } from "viem/chains";

// ERC20 minimal ABI for reading token info
const erc20Abi = [
  {
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Chain configurations
const chains: Record<number, { chain: typeof base; rpcUrl?: string }> = {
  1: { chain: mainnet, rpcUrl: "https://eth.llamarpc.com" },
  11155111: { chain: sepolia, rpcUrl: "https://rpc.sepolia.org" },
  8453: { chain: base },
  84532: { chain: baseSepolia },
  31337: { chain: localhost, rpcUrl: "http://127.0.0.1:8545" },
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get("address");
  const chainIdParam = searchParams.get("chainId");

  if (!address) {
    return NextResponse.json(
      { error: "Missing address parameter" },
      { status: 400 }
    );
  }

  if (!isAddress(address)) {
    return NextResponse.json(
      { error: "Invalid address format" },
      { status: 400 }
    );
  }

  const chainId = chainIdParam ? parseInt(chainIdParam) : 31337;
  const chainConfig = chains[chainId];

  if (!chainConfig) {
    return NextResponse.json(
      { error: `Unsupported chain ID: ${chainId}` },
      { status: 400 }
    );
  }

  try {
    const publicClient = createPublicClient({
      chain: chainConfig.chain,
      transport: http(chainConfig.rpcUrl),
    });

    const tokenAddress = getAddress(address) as `0x${string}`;

    // Fetch token info in parallel
    const [name, symbol, decimals] = await Promise.all([
      publicClient.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "name",
      }),
      publicClient.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "symbol",
      }),
      publicClient.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "decimals",
      }),
    ]);

    return NextResponse.json({
      address: tokenAddress,
      name,
      symbol,
      decimals,
      chainId,
    });
  } catch (error) {
    console.error("Token lookup failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch token info. Make sure the address is a valid ERC20 token on this chain.",
      },
      { status: 400 }
    );
  }
}

