import { UserSettings } from "../types";

export interface LiveClientOptions {
  apiKey: string;
  onSetupComplete?: () => void;
  onAudioData?: (pcmData: Int16Array) => void;
  onTurnComplete?: () => void;
  onError?: (err: any) => void;
  onClose?: (event?: CloseEvent) => void;
}

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private options: LiveClientOptions;
  
  constructor(options: LiveClientOptions) {
    this.options = options;
  }

  public connect() {
    const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${this.options.apiKey}`;
    
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      // Send setup message
      const setupMessage = {
        setup: {
          model: "models/gemini-2.0-flash-exp",
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: "Aoede" // Choose a nice voice: Puck, Aoede, Charon, Kore, Fenrir
                }
              }
            }
          }
        }
      };
      this.ws?.send(JSON.stringify(setupMessage));
    };

    this.ws.onmessage = async (event) => {
      try {
        let textData = "";
        if (event.data instanceof Blob) {
          textData = await event.data.text();
        } else {
          textData = event.data;
        }

        const msg = JSON.parse(textData);

        if (msg.error) {
          if (this.options.onError) this.options.onError(msg.error.message || "Unknown Gemini Error");
          return;
        }

        if (msg.setupComplete) {
          if (this.options.onSetupComplete) this.options.onSetupComplete();
        }

        if (msg.serverContent?.modelTurn?.parts) {
          for (const part of msg.serverContent.modelTurn.parts) {
            if (part.inlineData && part.inlineData.mimeType.startsWith("audio/pcm")) {
              const base64 = part.inlineData.data;
              const pcm16 = this.base64ToInt16Array(base64);
              if (this.options.onAudioData) this.options.onAudioData(pcm16);
            }
          }
        }

        if (msg.serverContent?.turnComplete) {
          if (this.options.onTurnComplete) this.options.onTurnComplete();
        }

      } catch (err) {
        console.error("LiveClient parse error", err);
      }
    };

    this.ws.onerror = (err) => {
      console.error("LiveClient WS Error", err);
      if (this.options.onError) this.options.onError(err);
    };

    this.ws.onclose = (event) => {
      if (this.options.onClose) this.options.onClose(event);
    };
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public sendRealtimeAudio(base64Pcm: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        realtimeInput: {
          mediaChunks: [
            {
              mimeType: "audio/pcm;rate=16000",
              data: base64Pcm
            }
          ]
        }
      }));
    }
  }

  public sendRealtimeVideo(base64Jpeg: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        realtimeInput: {
          mediaChunks: [
            {
              mimeType: "image/jpeg",
              data: base64Jpeg
            }
          ]
        }
      }));
    }
  }

  public sendClientContent(text: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        clientContent: {
          turns: [
            {
              role: "user",
              parts: [{ text }]
            }
          ],
          turnComplete: true
        }
      }));
    }
  }

  private base64ToInt16Array(base64: string): Int16Array {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return new Int16Array(bytes.buffer);
  }
}
