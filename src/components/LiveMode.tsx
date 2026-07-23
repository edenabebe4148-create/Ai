import React, { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video, VideoOff, X, Sparkles, RefreshCcw } from "lucide-react";
import { GeminiLiveClient } from "../lib/liveClient";

interface LiveModeProps {
  apiKey: string;
  onClose: () => void;
}

export function LiveMode({ apiKey, onClose }: LiveModeProps) {
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [aiSpeaking, setAiSpeaking] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const clientRef = useRef<GeminiLiveClient | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  
  // Playback state
  const playbackContextRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef<number>(0);

  // Initialize
  useEffect(() => {
    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: true
        });
        
        mediaStreamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Setup Audio Capture
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        audioContextRef.current = audioCtx;
        
        const source = audioCtx.createMediaStreamSource(stream);
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;
        
        source.connect(processor);
        processor.connect(audioCtx.destination);
        
        processor.onaudioprocess = (e) => {
          if (!micEnabled || !clientRef.current) return;
          const inputData = e.inputBuffer.getChannelData(0);
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            let s = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          const base64Pcm = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));
          clientRef.current.sendRealtimeAudio(base64Pcm);
        };

        // Setup Playback Audio Context
        playbackContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        nextPlayTimeRef.current = playbackContextRef.current.currentTime;

        // Connect to Gemini WebSocket
        const client = new GeminiLiveClient({
          apiKey,
          onSetupComplete: () => {
            setIsConnecting(false);
          },
          onAudioData: (pcm16) => {
            playAudioChunk(pcm16);
          },
          onTurnComplete: () => {
            setAiSpeaking(false);
          },
          onError: (err) => {
            setIsConnecting(false);
            setError("Connection error with Gemini Live. You may have exceeded your API quota.");
            console.error(err);
          },
          onClose: (event) => {
            setIsConnecting(false);
            if (event && event.code !== 1000) {
              setError(`Session closed (${event.code}): ${event.reason || "Quota Exceeded or Policy Violation"}`);
            } else {
              setError((prev) => prev ? prev : "Session disconnected.");
            }
          }
        });
        
        clientRef.current = client;
        client.connect();

      } catch (err: any) {
        setIsConnecting(false);
        console.error("Media setup failed", err);
        setError("Could not access Camera/Microphone: " + err.message);
      }
    };

    init();

    return () => {
      cleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Frame capture loop
  useEffect(() => {
    let frameInterval: any;
    if (!isConnecting && !error && cameraEnabled) {
      frameInterval = setInterval(() => {
        captureAndSendFrame();
      }, 1000); // 1 frame per second
    }
    return () => clearInterval(frameInterval);
  }, [isConnecting, error, cameraEnabled]);

  // Handle Mute/Unmute
  useEffect(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach(t => t.enabled = micEnabled);
    }
  }, [micEnabled]);

  // Handle Camera toggle
  useEffect(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getVideoTracks().forEach(t => t.enabled = cameraEnabled);
    }
  }, [cameraEnabled]);

  const toggleCameraFacing = async () => {
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newMode, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      if (audioContextRef.current && processorRef.current) {
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(processorRef.current);
      }
    } catch (err) {
      console.error("Failed to switch camera", err);
    }
  };

  const cleanup = () => {
    if (clientRef.current) {
      clientRef.current.disconnect();
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (playbackContextRef.current) {
      playbackContextRef.current.close();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
    }
  };

  const handleClose = () => {
    cleanup();
    onClose();
  };

  const captureAndSendFrame = () => {
    if (!videoRef.current || !canvasRef.current || !clientRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.videoWidth === 0 || video.videoHeight === 0) return;
    
    // Scale down for speed (e.g., 320x240)
    canvas.width = 320;
    canvas.height = (320 / video.videoWidth) * video.videoHeight;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.5);
    const base64Jpeg = dataUrl.split(",")[1];
    
    clientRef.current.sendRealtimeVideo(base64Jpeg);
  };

  const playAudioChunk = (pcm16: Int16Array) => {
    const ctx = playbackContextRef.current;
    if (!ctx) return;
    
    setAiSpeaking(true);

    const float32Data = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32Data[i] = pcm16[i] / 32768.0;
    }

    const buffer = ctx.createBuffer(1, float32Data.length, 24000);
    buffer.copyToChannel(float32Data, 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const currentTime = ctx.currentTime;
    if (nextPlayTimeRef.current < currentTime) {
      nextPlayTimeRef.current = currentTime;
    }
    source.start(nextPlayTimeRef.current);
    nextPlayTimeRef.current += buffer.duration;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
      
      {/* FULLSCREEN CAMERA BACKGROUND */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 z-0 ${cameraEnabled ? 'opacity-40 sm:opacity-100' : 'opacity-0'}`}
      />
      {!cameraEnabled && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950 z-0">
          <VideoOff className="w-16 h-16 text-slate-800" />
        </div>
      )}

      {/* Dark gradient overlay for UI readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/80 z-0 pointer-events-none" />

      {/* Header */}
      <div className="absolute top-6 left-6 flex items-center gap-2 z-10">
        <Sparkles className={`w-5 h-5 text-cyan-400 ${aiSpeaking ? 'animate-pulse' : ''}`} />
        <span className="font-medium tracking-wide text-sm opacity-90">Gemini Live</span>
      </div>
      
      <button 
        onClick={handleClose}
        className="absolute top-6 right-6 p-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-all backdrop-blur-md z-10"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-4xl flex flex-col items-center justify-center gap-8 z-10">
        
        {/* Status Indicator */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative flex items-center justify-center">
            {/* Glowing Orb for AI */}
            <div className={`w-40 h-40 rounded-full blur-3xl transition-all duration-500 ${
              isConnecting ? 'bg-amber-500/40 animate-pulse' :
              error ? 'bg-red-500/40' :
              aiSpeaking ? 'bg-cyan-500/70 animate-ping scale-110' :
              'bg-blue-500/30'
            }`} />
            
            {/* Core center point */}
            <div className={`absolute w-12 h-12 rounded-full transition-all duration-500 ${
              isConnecting ? 'bg-amber-400/50' :
              error ? 'bg-red-500/50' :
              aiSpeaking ? 'bg-cyan-300/80' :
              'bg-blue-400/40'
            }`} />
          </div>
          
          <p className="text-sm font-medium tracking-wide opacity-70 mt-4">
            {isConnecting ? "Connecting to Gemini..." :
             error ? <span className="text-red-400">{error}</span> :
             aiSpeaking ? "Gemini is speaking..." : "Listening..."}
          </p>
        </div>

      </div>

      {/* Controls Footer */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 sm:gap-6 p-3 sm:p-4 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 shadow-2xl z-10">
        <button
          onClick={() => setMicEnabled(!micEnabled)}
          className={`p-3 sm:p-4 rounded-full transition-all ${
            micEnabled ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}
        >
          {micEnabled ? <Mic className="w-5 h-5 sm:w-6 sm:h-6" /> : <MicOff className="w-5 h-5 sm:w-6 sm:h-6" />}
        </button>

        <button
          onClick={() => setCameraEnabled(!cameraEnabled)}
          className={`p-3 sm:p-4 rounded-full transition-all ${
            cameraEnabled ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}
        >
          {cameraEnabled ? <Video className="w-5 h-5 sm:w-6 sm:h-6" /> : <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" />}
        </button>

        <button
          onClick={toggleCameraFacing}
          className="p-3 sm:p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
          title="Flip Camera"
        >
          <RefreshCcw className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        <div className="w-px h-8 bg-white/10 mx-1"></div>

        <button
          onClick={handleClose}
          className="p-3 sm:p-4 px-6 sm:px-8 rounded-full bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-bold transition-all shadow-lg shadow-red-500/20"
        >
          End Call
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
