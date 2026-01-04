"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useToast } from "../../components/Toast";

// Types for our demo
type StepStatus = "pending" | "running" | "success" | "error";

interface Step {
  id: string;
  title: string;
  description: string;
  status: StepStatus;
  data?: Record<string, unknown> | null;
  timestamp?: number;
  duration?: number;
}

interface LogEntry {
  id: string;
  type: "info" | "request" | "response" | "error" | "success";
  message: string;
  data?: Record<string, unknown> | null;
  timestamp: number;
}

// MNEE-only networks
const PRESET_NETWORKS = [
  { key: "mnee-sandbox", name: "MNEE Sandbox", description: "MNEE testnet" },
  { key: "mnee-mainnet", name: "MNEE Mainnet", description: "MNEE production" },
];

export default function SDKDemoPage() {
  const [apiKey, setApiKey] = useState("");
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<Id<"apiKeys"> | "">("");
  const [providerAmount, setProviderAmount] = useState("0.50");
  const [providerNetwork, setProviderNetwork] = useState("mnee-sandbox");
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [finalResponse, setFinalResponse] = useState<Record<string, unknown> | null>(null);

  // Fetch user's API keys
  const apiKeys = useQuery(api.apiKeys.listApiKeys, {});
  // Fetch the full API key when one is selected
  const fullApiKeyData = useQuery(
    api.apiKeys.getApiKey,
    selectedApiKeyId && selectedApiKeyId !== "" ? { apiKeyId: selectedApiKeyId } : "skip"
  );

  // Update apiKey when a full key is fetched
  useEffect(() => {
    if (fullApiKeyData?.apiKey) {
      setApiKey(fullApiKeyData.apiKey);
    }
  }, [fullApiKeyData]);

  const addLog = useCallback((type: LogEntry["type"], message: string, data?: Record<string, unknown> | null) => {
    setLogs((prev) => [
      ...prev,
      {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type,
        message,
        data,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  const updateStep = useCallback((id: string, updates: Partial<Step>) => {
    setSteps((prev) =>
      prev.map((step) => (step.id === id ? { ...step, ...updates } : step))
    );
  }, []);

  const toast = useToast();

  const runDemo = async () => {
    if (!apiKey.trim()) {
      toast.warning("Please enter your API key");
      return;
    }

    setIsRunning(true);
    setFinalResponse(null);
    setLogs([]);

    // Initialize steps
    const initialSteps: Step[] = [
      {
        id: "initial-request",
        title: "1. Initial Request",
        description: "Making request to mock provider API",
        status: "pending",
      },
      {
        id: "receive-402",
        title: "2. Receive 402 Response",
        description: `API returns Payment Required (${providerAmount} MNEE)`,
        status: "pending",
      },
      {
        id: "extract-headers",
        title: "3. Extract Invoice Headers",
        description: "SDK extracts and normalizes x402 headers",
        status: "pending",
      },
      {
        id: "call-quote",
        title: "4. Call Gateway /quote",
        description: "SDK requests payment authorization from gateway",
        status: "pending",
      },
      {
        id: "call-pay",
        title: "5. Call Gateway /pay",
        description: "SDK executes the MNEE payment",
        status: "pending",
      },
      {
        id: "retry-request",
        title: "6. Retry with Proof",
        description: "SDK retries original request with payment proof header",
        status: "pending",
      },
      {
        id: "final-response",
        title: "7. Final Response",
        description: "Receive successful response from API",
        status: "pending",
      },
    ];
    setSteps(initialSteps);

    const gatewayBaseUrl = typeof window !== "undefined" 
      ? `${window.location.origin}/api/gateway`
      : "/api/gateway";
    
    // Build mock provider URL with config params
    const mockProviderParams = new URLSearchParams({
      currency: "MNEE",
      amount: providerAmount,
      network: providerNetwork,
    });
    const mockProviderUrl = typeof window !== "undefined"
      ? `${window.location.origin}/api/mock-provider?${mockProviderParams}`
      : `/api/mock-provider?${mockProviderParams}`;

    try {
      // Step 1: Initial Request
      const step1Start = Date.now();
      updateStep("initial-request", { status: "running", timestamp: step1Start });
      addLog("info", "Starting fetchWithX402...");
      addLog("info", `Provider configured to request: ${providerAmount} MNEE on ${providerNetwork}`);
      addLog("request", `POST ${mockProviderUrl}`, {
        headers: { "Content-Type": "application/json" },
        body: { message: "Hello from SDK demo!" },
      });

      const initialResponse = await fetch(mockProviderUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Hello from SDK demo!" }),
      });

      updateStep("initial-request", {
        status: "success",
        duration: Date.now() - step1Start,
      });

      // Step 2: Receive 402
      const step2Start = Date.now();
      updateStep("receive-402", { status: "running", timestamp: step2Start });

      if (initialResponse.status === 402) {
        const headers402: Record<string, string> = {};
        initialResponse.headers.forEach((value, key) => {
          if (key.toLowerCase().startsWith("x-402-")) {
            headers402[key] = value;
          }
        });
        
        addLog("response", `Received 402 Payment Required`, {
          status: 402,
          requiredPayment: {
            currency: "MNEE",
            amount: providerAmount,
            network: providerNetwork,
          },
          headers: headers402,
        });
        updateStep("receive-402", {
          status: "success",
          duration: Date.now() - step2Start,
          data: { status: 402, currency: "MNEE", amount: providerAmount },
        });
      } else {
        throw new Error(`Expected 402, got ${initialResponse.status}`);
      }

      // Step 3: Extract Headers
      const step3Start = Date.now();
      updateStep("extract-headers", { status: "running", timestamp: step3Start });

      const invoiceHeaders: Record<string, string> = {};
      initialResponse.headers.forEach((value, key) => {
        const lower = key.toLowerCase();
        if (lower.startsWith("x-402-")) {
          const suffix = lower.slice("x-402-".length);
          const canonical =
            "X-402-" +
            suffix
              .split("-")
              .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
              .join("-");
          invoiceHeaders[canonical] = value;
        }
      });

      addLog("info", "Extracted invoice headers", invoiceHeaders);
      updateStep("extract-headers", {
        status: "success",
        duration: Date.now() - step3Start,
        data: invoiceHeaders,
      });

      // Step 4: Call /quote
      const step4Start = Date.now();
      updateStep("call-quote", { status: "running", timestamp: step4Start });

      const quotePayload = {
        apiKey,
        requestUrl: mockProviderUrl,
        method: "POST",
        invoiceHeaders,
      };
      addLog("request", `POST ${gatewayBaseUrl}/quote`, quotePayload);

      const quoteResponse = await fetch(`${gatewayBaseUrl}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quotePayload),
      });

      const quoteData = await quoteResponse.json();
      addLog("response", "Quote response", quoteData);

      if (quoteData.status === "denied") {
        updateStep("call-quote", {
          status: "error",
          duration: Date.now() - step4Start,
          data: quoteData,
        });
        throw new Error(`Payment denied: ${quoteData.reason}`);
      }

      if (!quoteResponse.ok) {
        updateStep("call-quote", {
          status: "error",
          duration: Date.now() - step4Start,
          data: quoteData,
        });
        throw new Error(quoteData.error || "Quote failed");
      }

      updateStep("call-quote", {
        status: "success",
        duration: Date.now() - step4Start,
        data: quoteData,
      });

      // Step 5: Call /pay
      const step5Start = Date.now();
      updateStep("call-pay", { status: "running", timestamp: step5Start });

      const payPayload = {
        apiKey,
        paymentId: quoteData.paymentId,
      };
      addLog("request", `POST ${gatewayBaseUrl}/pay`, payPayload);

      const payResponse = await fetch(`${gatewayBaseUrl}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payPayload),
      });

      const payData = await payResponse.json();
      addLog("response", "Pay response", payData);

      if (payData.status !== "ok") {
        updateStep("call-pay", {
          status: "error",
          duration: Date.now() - step5Start,
          data: payData,
        });
        throw new Error(payData.message || "Payment failed");
      }

      updateStep("call-pay", {
        status: "success",
        duration: Date.now() - step5Start,
        data: payData,
      });

      // Step 6: Retry with proof
      const step6Start = Date.now();
      updateStep("retry-request", { status: "running", timestamp: step6Start });

      addLog("request", `POST ${mockProviderUrl} (with proof header)`, {
        headers: {
          "Content-Type": "application/json",
          "X-MOCK-PAID-INVOICE": quoteData.invoiceId,
        },
      });

      const retryResponse = await fetch(mockProviderUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-MOCK-PAID-INVOICE": quoteData.invoiceId,
        },
        body: JSON.stringify({ message: "Hello from SDK demo!" }),
      });

      updateStep("retry-request", {
        status: "success",
        duration: Date.now() - step6Start,
      });

      // Step 7: Final Response
      const step7Start = Date.now();
      updateStep("final-response", { status: "running", timestamp: step7Start });

      const finalData = await retryResponse.json();
      addLog("success", "Final response received!", {
        status: retryResponse.status,
        data: finalData,
      });

      updateStep("final-response", {
        status: retryResponse.ok ? "success" : "error",
        duration: Date.now() - step7Start,
        data: finalData,
      });

      setFinalResponse(finalData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLog("error", `Error: ${errorMessage}`);
      
      // Mark remaining steps as error
      setSteps((prev) =>
        prev.map((step) =>
          step.status === "pending" || step.status === "running"
            ? { ...step, status: "error" as StepStatus }
            : step
        )
      );
    } finally {
      setIsRunning(false);
    }
  };

  const resetDemo = () => {
    setSteps([]);
    setLogs([]);
    setFinalResponse(null);
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm text-[#888] hover:text-white mb-4 inline-flex items-center gap-1"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold mt-4">xFour SDK Demo</h1>
          <p className="text-[#888] mt-2">
            Watch the SDK handle an xFour MNEE payment flow step-by-step
          </p>
        </div>

        {/* Config Panel */}
        <div className="bg-[#111] rounded-xl border border-[#333] p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Configuration</h2>
          
          {/* API Key */}
          <div className="mb-6">
            <label className="block text-sm text-[#888] mb-2">
              API Key
            </label>
            
            {/* API Key Dropdown */}
            {apiKeys && apiKeys.length > 0 && (
              <div className="mb-3">
                <select
                  value={selectedApiKeyId}
                  onChange={(e) => {
                    const value = e.target.value as Id<"apiKeys"> | "";
                    setSelectedApiKeyId(value);
                    if (!value) {
                      setApiKey("");
                    }
                  }}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#333] rounded-lg text-white focus:outline-none focus:border-[#555]"
                >
                  <option value="">Select an API key...</option>
                  {apiKeys.map((key) => (
                    <option key={key._id} value={key._id}>
                      {key.name} ({key.apiKeyPrefix}••••) - {key.isActive ? "Active" : "Inactive"}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {/* Manual Input */}
            <input
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setSelectedApiKeyId("");
              }}
              placeholder="Or paste your API key here"
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#333] rounded-lg text-white placeholder-[#666] focus:outline-none focus:border-[#555]"
            />
            <p className="text-xs text-[#666] mt-2">
              Don&apos;t have a key?{" "}
              <Link href="/workspace/agents" className="text-violet-400 hover:text-violet-300">
                Create one in Agents →
              </Link>
            </p>
          </div>

          {/* Provider Configuration */}
          <div className="bg-[#0a0a0a] rounded-lg p-4 mb-6 border border-[#222]">
            <h3 className="text-sm font-medium text-amber-400 mb-3 flex items-center gap-2">
              <ProviderIcon className="w-4 h-4" />
              Mock Provider Settings
            </h3>
            <p className="text-xs text-[#666] mb-4">
              Configure what the mock provider will request in MNEE.
            </p>
            
            <div className="grid md:grid-cols-2 gap-4">
              {/* Network */}
              <div>
                <label className="block text-xs text-[#888] mb-1">MNEE Network</label>
                <select
                  value={providerNetwork}
                  onChange={(e) => setProviderNetwork(e.target.value)}
                  className="w-full px-3 py-2 bg-[#111] border border-[#333] rounded-lg text-white text-sm focus:outline-none focus:border-[#555]"
                >
                  {PRESET_NETWORKS.map((net) => (
                    <option key={net.key} value={net.key}>
                      {net.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs text-[#888] mb-1">Amount (MNEE)</label>
                <input
                  type="text"
                  value={providerAmount}
                  onChange={(e) => setProviderAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-[#111] border border-[#333] rounded-lg text-white text-sm focus:outline-none focus:border-[#555]"
                />
              </div>
            </div>

            {/* MNEE info */}
            <div className="mt-4 p-3 rounded-lg bg-amber-900/20 border border-amber-900/50">
              <p className="text-xs text-amber-300">
                <strong>💡 MNEE Payments:</strong> All payments use the MNEE Bitcoin-based stablecoin. 
                Make sure your workspace has an MNEE wallet with sufficient balance.
              </p>
            </div>
          </div>

          {/* Run buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={runDemo}
              disabled={isRunning || !apiKey.trim()}
              className="px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRunning ? "Running..." : "Run Demo"}
            </button>
            <button
              onClick={resetDemo}
              disabled={isRunning}
              className="px-6 py-3 bg-[#1a1a1a] text-white font-medium rounded-lg hover:bg-[#222] disabled:opacity-50 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Steps Panel */}
          <div className="bg-[#111] rounded-xl border border-[#333] p-6">
            <h2 className="text-lg font-semibold mb-4">Payment Flow Steps</h2>
            <div className="space-y-4">
              {steps.length === 0 ? (
                <p className="text-[#666] text-center py-8">
                  Click &quot;Run Demo&quot; to start
                </p>
              ) : (
                steps.map((step) => (
                  <StepCard key={step.id} step={step} />
                ))
              )}
            </div>
          </div>

          {/* Logs Panel */}
          <div className="bg-[#111] rounded-xl border border-[#333] p-6">
            <h2 className="text-lg font-semibold mb-4">Live Logs</h2>
            <div className="bg-[#0a0a0a] rounded-lg p-4 h-[500px] overflow-y-auto font-mono text-sm">
              {logs.length === 0 ? (
                <p className="text-[#666]">Logs will appear here...</p>
              ) : (
                logs.map((log) => <LogEntryDisplay key={log.id} log={log} />)
              )}
            </div>
          </div>
        </div>

        {/* Final Response */}
        {finalResponse && (
          <div className="mt-8 bg-emerald-900/20 border border-emerald-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-emerald-400 mb-4">
              ✓ Success! Final Response
            </h2>
            <pre className="bg-[#0a0a0a] rounded-lg p-4 overflow-x-auto text-sm">
              {JSON.stringify(finalResponse, null, 2)}
            </pre>
          </div>
        )}

        {/* Code Example */}
        <div className="mt-8 bg-[#111] rounded-xl border border-[#333] p-6">
          <h2 className="text-lg font-semibold mb-4">SDK Code</h2>
          <p className="text-[#888] mb-4">
            This is what happens under the hood when you use{" "}
            <code className="text-white bg-[#1a1a1a] px-2 py-1 rounded">
              fetchWithX402
            </code>
            :
          </p>
          <pre className="bg-[#0a0a0a] rounded-lg p-4 overflow-x-auto text-sm text-[#888]">
            <code>{`import { createGatewayClient } from '@xfour/sdk';

const client = createGatewayClient({
  gatewayBaseUrl: '${typeof window !== "undefined" ? window.location.origin : ""}/api/gateway',
  apiKey: 'your-api-key',
});

// Just use it like regular fetch!
const response = await client.fetchWithX402(
  '/api/mock-provider',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Hello!' }),
  }
);

// The SDK automatically handles:
// 1. Detects 402 Payment Required
// 2. Extracts xFour invoice headers
// 3. Calls /quote to get authorization
// 4. Calls /pay to execute MNEE payment
// 5. Retries with proof header
// 6. Returns the final response`}</code>
          </pre>
        </div>
      </div>
    </main>
  );
}

function StepCard({ step }: { step: Step }) {
  const statusColors = {
    pending: "bg-[#1a1a1a] text-[#666]",
    running: "bg-blue-900/50 text-blue-400 animate-pulse",
    success: "bg-emerald-900/50 text-emerald-400",
    error: "bg-red-900/50 text-red-400",
  };

  const statusIcons = {
    pending: "○",
    running: "◐",
    success: "✓",
    error: "✕",
  };

  return (
    <div
      className={`p-4 rounded-lg border transition-all ${
        step.status === "running"
          ? "border-blue-500 bg-blue-900/10"
          : step.status === "success"
          ? "border-emerald-800 bg-emerald-900/10"
          : step.status === "error"
          ? "border-red-800 bg-red-900/10"
          : "border-[#333]"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${statusColors[step.status]}`}
        >
          {statusIcons[step.status]}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-white">{step.title}</h3>
          <p className="text-sm text-[#888]">{step.description}</p>
          {step.duration !== undefined && (
            <p className="text-xs text-[#666] mt-1">{step.duration}ms</p>
          )}
          {step.data && (
            <pre className="mt-2 text-xs bg-[#0a0a0a] p-2 rounded overflow-x-auto max-h-32 text-[#888]">
              {JSON.stringify(step.data, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

function LogEntryDisplay({ log }: { log: LogEntry }) {
  const typeColors = {
    info: "text-[#888]",
    request: "text-blue-400",
    response: "text-violet-400",
    error: "text-red-400",
    success: "text-emerald-400",
  };

  const typeLabels = {
    info: "INFO",
    request: "REQ →",
    response: "RES ←",
    error: "ERR",
    success: "OK",
  };

  const time = new Date(log.timestamp).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });

  return (
    <div className="mb-2 pb-2 border-b border-[#222] last:border-0">
      <div className="flex items-start gap-2">
        <span className="text-[#666] text-xs">{time}</span>
        <span className={`text-xs font-bold ${typeColors[log.type]}`}>
          [{typeLabels[log.type]}]
        </span>
        <span className="text-white flex-1">{log.message}</span>
      </div>
      {log.data && (
        <pre className="mt-1 ml-16 text-xs text-[#666] overflow-x-auto">
          {JSON.stringify(log.data, null, 2)}
        </pre>
      )}
    </div>
  );
}

// Icons
function ProviderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
      />
    </svg>
  );
}
