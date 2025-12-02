// src/index.ts
var X402Client = class {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://api.x402.io";
  }
  /**
   * Get a quote for an x402 payment
   *
   * @param request - The quote request containing the target URL and invoice headers
   * @returns A promise that resolves to the quote response
   */
  async getQuote(request) {
    throw new Error("Not implemented yet");
  }
};
function parseX402Headers(response) {
  if (response.status !== 402) {
    return null;
  }
  return {
    "X-402-Invoice-Id": response.headers.get("X-402-Invoice-Id") ?? void 0,
    "X-402-Amount": response.headers.get("X-402-Amount") ?? void 0,
    "X-402-Currency": response.headers.get("X-402-Currency") ?? void 0,
    "X-402-Network": response.headers.get("X-402-Network") ?? void 0,
    "X-402-Pay-To": response.headers.get("X-402-Pay-To") ?? void 0
  };
}
function isPaymentRequired(response) {
  return response.status === 402;
}
var VERSION = "0.0.1";

export { VERSION, X402Client, isPaymentRequired, parseX402Headers };
//# sourceMappingURL=index.mjs.map
//# sourceMappingURL=index.mjs.map