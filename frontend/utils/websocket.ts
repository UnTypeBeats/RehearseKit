"use client";

// Smart WebSocket URL - uses wss:// for HTTPS, ws:// for HTTP
const getWsUrl = () => {
  if (typeof window !== 'undefined') {
    // If accessing via HTTPS (rehearsekit.uk), use wss:// with same origin
    if (window.location.protocol === 'https:') {
      return `wss://${window.location.host}`;  // wss://rehearsekit.uk
    }
  }
  // Otherwise use configured URL or fallback
  return process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8001";
};

export interface JobProgressUpdate {
  job_id: string;
  status: string;
  progress_percent: number;
  message?: string;
}

export class JobProgressSocket {
  private ws: WebSocket | null = null;
  private jobId: string;
  private onUpdate: (update: JobProgressUpdate) => void;
  private onError?: (error: Event) => void;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(
    jobId: string,
    onUpdate: (update: JobProgressUpdate) => void,
    onError?: (error: Event) => void
  ) {
    this.jobId = jobId;
    this.onUpdate = onUpdate;
    this.onError = onError;
  }

  connect() {
    try {
      // Recalculate WS_URL in case it's dynamic
      const wsUrl = getWsUrl();
      // Use /ws/ path for Cloudflare tunnel compatibility (avoids conflict with /jobs pages)
      const url = `${wsUrl}/ws/jobs/${this.jobId}/progress`;
      console.log(`WebSocket connecting to: ${url}`);
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log(`WebSocket connected for job ${this.jobId}`);
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const update = JSON.parse(event.data) as JobProgressUpdate;
          this.onUpdate(update);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      this.ws.onerror = (error) => {
        console.error(`WebSocket error for job ${this.jobId}:`, error);
        if (this.onError) {
          this.onError(error);
        }
      };

      this.ws.onclose = () => {
        console.log(`WebSocket closed for job ${this.jobId}`);
        this.attemptReconnect();
      };
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      if (this.onError && error instanceof Event) {
        this.onError(error);
      }
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
      );
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.log("Max reconnection attempts reached");
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

