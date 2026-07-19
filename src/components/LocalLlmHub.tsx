import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Wifi, 
  Cpu, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Play, 
  Square, 
  Database, 
  Terminal, 
  Network, 
  ArrowRight,
  HelpCircle
} from "lucide-react";
import { UserSettings } from "../types";

interface LocalLlmHubProps {
  settings: UserSettings;
  onSaveSettings: (settings: UserSettings) => void;
}

export default function LocalLlmHub({ settings, onSaveSettings }: LocalLlmHubProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const [foundServices, setFoundServices] = useState<{ ip: string; port: number; provider: string; modelCount: number }[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [localModels, setLocalModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  
  const [subnetInput, setSubnetInput] = useState("192.168.1");
  const [scanPort, setScanPort] = useState<number>(11434); // Default to Ollama port

  const logContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll scanning logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [scanLogs]);

  // Load models if local LLM URL is available
  useEffect(() => {
    if (settings.preferredModel === "local" && settings.localLlmUrl) {
      fetchLocalModels();
    }
  }, [settings.localLlmUrl, settings.localLlmProvider]);

  const addLog = (msg: string) => {
    setScanLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const fetchLocalModels = async () => {
    setLoadingModels(true);
    setLocalModels([]);
    try {
      const resolvedUrl = settings.localLlmUrl.replace(/\/$/, "");
      let endpoint = "";
      
      if (settings.localLlmProvider === "ollama") {
        endpoint = `${resolvedUrl}/api/tags`;
      } else {
        endpoint = `${resolvedUrl}/v1/models`;
      }

      const res = await fetch(endpoint, { method: "GET", mode: "cors" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      let modelsList: string[] = [];
      
      if (settings.localLlmProvider === "ollama") {
        if (data.models && Array.isArray(data.models)) {
          modelsList = data.models.map((m: any) => m.name);
        }
      } else {
        if (data.data && Array.isArray(data.data)) {
          modelsList = data.data.map((m: any) => m.id);
        }
      }

      if (modelsList.length > 0) {
        setLocalModels(modelsList);
        // If current model is empty or not in the list, auto-select first one
        if (!settings.localLlmModel || !modelsList.includes(settings.localLlmModel)) {
          onSaveSettings({
            ...settings,
            localLlmModel: modelsList[0]
          });
        }
      } else {
        setLocalModels(["No models detected"]);
      }
    } catch (e: any) {
      console.warn("Could not retrieve models list automatically", e);
      setLocalModels([]);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const resolvedUrl = settings.localLlmUrl.replace(/\/$/, "");
      let endpoint = "";
      
      if (settings.localLlmProvider === "ollama") {
        endpoint = `${resolvedUrl}/api/tags`;
      } else {
        endpoint = `${resolvedUrl}/v1/models`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(endpoint, {
        method: "GET",
        mode: "cors",
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        setTestResult({
          success: true,
          message: "Successfully connected! Models retrieved successfully."
        });
        fetchLocalModels();
      } else {
        setTestResult({
          success: false,
          message: `Connected but got response status code: ${res.status}.`
        });
      }
    } catch (err: any) {
      console.error(err);
      setTestResult({
        success: false,
        message: `Failed to connect. Make sure your local server is running and CORS is configured properly.`
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Perform parallel async Wi-Fi network subnet scan
  const startNetworkScan = async () => {
    setIsScanning(true);
    setScanProgress(0);
    setScanLogs([]);
    setFoundServices([]);
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    addLog(`Initiating Local Area Wi-Fi Scan...`);
    addLog(`Scanning subnet: ${subnetInput}.X on Port: ${scanPort}`);
    addLog(`Targeting common LLM services (Ollama, LM Studio, Llama.cpp)`);

    const targets: { ip: string; port: number }[] = [];
    
    // Add localhost & loopbacks
    targets.push({ ip: "127.0.0.1", port: 11434 });
    targets.push({ ip: "127.0.0.1", port: 1234 });
    targets.push({ ip: "127.0.0.1", port: 8080 });

    // Add IPs on selected subnet (IP 1 to 45 for high speed preview)
    for (let i = 1; i <= 45; i++) {
      const targetIp = `${subnetInput}.${i}`;
      // Skip loopback duplicates if user entered loopback subnet
      if (subnetInput !== "127.0.0" && subnetInput !== "127.0.1") {
        targets.push({ ip: targetIp, port: scanPort });
      }
    }

    const batchSize = 8;
    const total = targets.length;

    for (let i = 0; i < total; i += batchSize) {
      if (signal.aborted) {
        addLog("Scan terminated by user.");
        break;
      }

      const batch = targets.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (target) => {
          try {
            const url = `http://${target.ip}:${target.port}`;
            // Try fetching tags/models to identify service
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1200);

            // Test Ollama endpoint first
            let detectedProvider = "Ollama";
            let checkUrl = `${url}/api/tags`;
            
            if (target.port === 1234) {
              detectedProvider = "LM Studio";
              checkUrl = `${url}/v1/models`;
            } else if (target.port === 8080) {
              detectedProvider = "Llama.cpp";
              checkUrl = `${url}/v1/models`;
            }

            addLog(`Probing ${target.ip}:${target.port}...`);

            const res = await fetch(checkUrl, {
              method: "GET",
              mode: "cors",
              signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.ok) {
              const data = await res.json();
              let count = 0;
              if (detectedProvider === "Ollama" && data.models) count = data.models.length;
              if (detectedProvider !== "Ollama" && data.data) count = data.data.length;

              setFoundServices((prev) => [
                ...prev,
                { ip: target.ip, port: target.port, provider: detectedProvider.toLowerCase(), modelCount: count }
              ]);
              addLog(`✨ FOUND: ${detectedProvider} active at ${target.ip}:${target.port}! (${count} models loaded)`);
            }
          } catch (e) {
            // Service not responding or CORS failure (connection refused is caught here)
          }
        })
      );

      const computedProgress = Math.round(((i + batch.length) / total) * 100);
      setScanProgress(computedProgress);
    }

    setScanProgress(100);
    setIsScanning(false);
    addLog(`Network scan complete. Found ${foundServices.length} active Local LLM instances.`);
  };

  const stopNetworkScan = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsScanning(false);
  };

  const handleConnectToFound = (ip: string, port: number, provider: string) => {
    const url = `http://${ip}:${port}`;
    onSaveSettings({
      ...settings,
      localLlmProvider: provider as any,
      localLlmUrl: url,
      localLlmModel: "" // reset model to force reload
    });
    addLog(`Switched LLM config to ${url} (${provider})`);
    
    // Quick test
    setTimeout(() => {
      handleTestConnection();
    }, 400);
  };

  return (
    <div className="space-y-4" id="local-llm-hub-root">
      <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl space-y-4 transition-colors duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#FF4D4D]" />
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">Local LLM Host</h3>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono transition-colors">
            OFFLINE CHAT
          </span>
        </div>

        {/* Form Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-mono">
              Provider Service
            </label>
            <select
              value={settings.localLlmProvider}
              onChange={(e) => onSaveSettings({ ...settings, localLlmProvider: e.target.value as any })}
              className="w-full mt-1 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-[#FF4D4D] cursor-pointer transition-colors"
              id="local-provider-select"
            >
              <option value="ollama" className="dark:bg-slate-900 text-slate-850 dark:text-slate-100">Ollama (Default Port 11434)</option>
              <option value="lm-studio" className="dark:bg-slate-900 text-slate-850 dark:text-slate-100">LM Studio (Default Port 1234)</option>
              <option value="llama-cpp" className="dark:bg-slate-900 text-slate-850 dark:text-slate-100">Llama.cpp (Default Port 8080)</option>
              <option value="openai-compatible" className="dark:bg-slate-900 text-slate-850 dark:text-slate-100">OpenAI-Compatible Server</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-mono">
              Connection Base URL
            </label>
            <div className="flex gap-1.5 mt-1">
              <input
                type="text"
                value={settings.localLlmUrl}
                onChange={(e) => onSaveSettings({ ...settings, localLlmUrl: e.target.value })}
                placeholder="e.g. http://localhost:11434"
                className="flex-1 px-3 py-2 text-xs font-mono font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-[#FF4D4D] transition-colors"
                id="local-url-input"
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-3 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                id="test-connection-btn"
              >
                {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Test"}
              </button>
            </div>
          </div>
        </div>

        {/* Test Result Indicator */}
        {testResult && (
          <div className={`p-3 rounded-xl flex items-start gap-2.5 border text-xs leading-normal ${
            testResult.success 
              ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
              : "bg-amber-50 border-amber-200 text-amber-800"
          }`} id="test-result-alert">
            {testResult.success ? (
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <p className="font-semibold">{testResult.success ? "Connection Active" : "Connection Failed"}</p>
              <p className="opacity-90">{testResult.message}</p>
            </div>
          </div>
        )}

        {/* Model Picker */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-mono">
              Select Active Local Model
            </label>
            <button
              type="button"
              onClick={fetchLocalModels}
              disabled={loadingModels}
              className="text-[10px] font-bold text-[#FF4D4D] flex items-center gap-0.5 hover:underline disabled:opacity-50"
            >
              <RefreshCw className={`w-2.5 h-2.5 ${loadingModels ? "animate-spin" : ""}`} />
              Reload Models
            </button>
          </div>
          
          {localModels.length > 0 ? (
            <select
              value={settings.localLlmModel}
              onChange={(e) => onSaveSettings({ ...settings, localLlmModel: e.target.value })}
              className="w-full px-3 py-2 mt-1 text-xs font-mono font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-[#FF4D4D] cursor-pointer transition-colors"
              id="local-model-picker"
            >
              {localModels.map((model) => (
                <option key={model} value={model} className="dark:bg-slate-900 text-slate-850 dark:text-slate-100">{model}</option>
              ))}
            </select>
          ) : (
            <div className="p-2.5 border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-[11px] text-slate-500 dark:text-slate-400 rounded-xl text-center italic transition-colors">
              {loadingModels ? "Quering local server models..." : "No local models cached. Click test connection or reload."}
            </div>
          )}
        </div>

        {/* CORS Troubleshooting Toggle */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowTroubleshoot(!showTroubleshoot)}
            className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#FF4D4D]" />
            How to resolve CORS block errors?
          </button>
          
          <AnimatePresence>
            {showTroubleshoot && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden text-[11px] text-slate-500 dark:text-slate-400 space-y-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800"
                id="cors-tips-container"
              >
                <p>Browsers block requests to local addresses unless cross-origin requests are enabled. Choose your server model below:</p>
                <div className="space-y-1.5 pl-2 font-mono text-[10px] text-slate-600 dark:text-slate-400">
                  <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md">
                    <strong className="text-slate-800 dark:text-slate-200 block text-[9px] uppercase font-sans font-bold">Ollama (macOS/Linux)</strong>
                    OLLAMA_ORIGINS="*" ollama serve
                  </div>
                  <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md">
                    <strong className="text-slate-800 dark:text-slate-200 block text-[9px] uppercase font-sans font-bold">Ollama (Windows Environment)</strong>
                    Set System Variable <code className="bg-slate-200 dark:bg-slate-900 px-1 rounded text-[#FF4D4D]">OLLAMA_ORIGINS=*</code>, then restart Ollama.
                  </div>
                  <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md">
                    <strong className="text-slate-800 dark:text-slate-200 block text-[9px] uppercase font-sans font-bold">LM Studio</strong>
                    Server Settings Tab &gt; Enable Toggle &quot;CORS&quot; (Cross-Origin Resource Sharing).
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Network Scanner Section */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl space-y-4 transition-colors duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-[#FF4D4D]" />
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">Wi-Fi Network Scanner</h3>
          </div>
          {isScanning && (
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF4D4D]"></span>
            </span>
          )}
        </div>

        <p className="text-[11px] text-slate-500 leading-normal">
          Automatically sweeps your active local network and Wi-Fi subnet to detect any running Ollama or LM Studio models.
        </p>

        {/* Scan Inputs */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-mono">
              Wi-Fi Subnet
            </label>
            <input
              type="text"
              value={subnetInput}
              onChange={(e) => setSubnetInput(e.target.value)}
              placeholder="e.g. 192.168.1"
              className="w-full mt-1 px-3 py-1.5 text-xs font-mono text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-[#FF4D4D] transition-colors"
              id="subnet-scan-input"
            />
          </div>
          <div>
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-mono">
              Target Port
            </label>
            <input
              type="number"
              value={scanPort}
              onChange={(e) => setScanPort(Number(e.target.value))}
              placeholder="11434"
              className="w-full mt-1 px-3 py-1.5 text-xs font-mono text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-[#FF4D4D] transition-colors"
              id="port-scan-input"
            />
          </div>
        </div>

        {/* Action Button & Progress */}
        <div className="space-y-2">
          {isScanning ? (
            <button
              type="button"
              onClick={stopNetworkScan}
              className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              id="stop-scan-btn"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              Stop Wi-Fi Scan ({scanProgress}%)
            </button>
          ) : (
            <button
              type="button"
              onClick={startNetworkScan}
              className="w-full py-2.5 bg-[#FF4D4D] hover:bg-[#E03C3C] text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              id="start-scan-btn"
            >
              <Wifi className="w-3.5 h-3.5" />
              Scan Local Network
            </button>
          )}

          {isScanning && (
            <div className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden transition-colors">
              <div 
                className="h-full bg-[#FF4D4D] transition-all duration-300" 
                style={{ width: `${scanProgress}%` }}
              ></div>
            </div>
          )}
        </div>

        {/* Dynamic Sweep Radar (Animated) */}
        {isScanning && (
          <div className="flex flex-col items-center justify-center py-4 bg-slate-900 rounded-2xl relative overflow-hidden h-36" id="radar-container">
            {/* Pulsing circular rings representing radar waves */}
            <div className="absolute w-28 h-28 rounded-full border border-[#FF4D4D]/25 animate-ping opacity-75"></div>
            <div className="absolute w-20 h-20 rounded-full border border-[#FF4D4D]/35 animate-pulse opacity-90"></div>
            <div className="absolute w-12 h-12 rounded-full border border-[#FF4D4D]/50"></div>
            
            {/* Spinning sweeps line */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-[#FF4D4D]/5 to-[#FF4D4D]/15 animate-spin origin-center pointer-events-none rounded-full" style={{ animationDuration: '3s' }}></div>

            <Wifi className="w-8 h-8 text-[#FF4D4D] z-10 animate-pulse" />
            <span className="text-[10px] font-mono font-bold text-red-400 mt-2 z-10 tracking-widest animate-pulse">
              SWEEPING SUBNET...
            </span>
          </div>
        )}

        {/* Found services List */}
        {foundServices.length > 0 && (
          <div className="space-y-1.5" id="found-llms-list">
            <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-mono">
              Detected active services ({foundServices.length})
            </h4>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {foundServices.map((srv, index) => (
                <div 
                  key={index}
                  className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs transition-colors hover:border-[#FF4D4D] dark:hover:border-[#FF4D4D]"
                >
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-500" />
                    <div>
                      <p className="font-extrabold text-slate-800 dark:text-slate-200 font-mono text-[11px]">{srv.ip}:{srv.port}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 capitalize font-medium">{srv.provider} • {srv.modelCount} models</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleConnectToFound(srv.ip, srv.port, srv.provider)}
                    className="p-1 px-2.5 bg-slate-900 dark:bg-slate-800 text-white text-[10px] font-extrabold rounded-lg hover:bg-[#FF4D4D] dark:hover:bg-[#FF4D4D] transition-colors flex items-center gap-0.5 cursor-pointer"
                  >
                    Connect <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scan Log Terminal */}
        {(scanLogs.length > 0) && (
          <div className="space-y-1" id="scan-terminal">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1">
                <Terminal className="w-3 h-3" />
                Active scan traces
              </span>
              <button 
                type="button" 
                onClick={() => setScanLogs([])} 
                className="text-[9px] text-[#FF4D4D] font-bold font-mono hover:underline"
              >
                Clear Trace
              </button>
            </div>
            <div 
              ref={logContainerRef}
              className="p-3 bg-slate-900 border border-slate-800 text-[10px] font-mono text-emerald-400 rounded-xl h-24 overflow-y-auto scroll-smooth leading-relaxed"
            >
              {scanLogs.map((log, index) => (
                <p key={index} className="truncate">{log}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
