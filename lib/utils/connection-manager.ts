import { postgresClient, getConnectionStats } from "@/lib/supabase/db-server";

export class ConnectionManager {
  private static instance: ConnectionManager;
  private connectionCount = 0;
  private maxConnections = 3; // Conservative limit for Supabase
  private connectionQueue: Array<() => void> = [];

  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  async acquireConnection(): Promise<boolean> {
    if (this.connectionCount >= this.maxConnections) {
      console.warn(`⚠️ Connection limit reached (${this.connectionCount}/${this.maxConnections}). Queuing request...`);
      return new Promise((resolve) => {
        this.connectionQueue.push(() => resolve(true));
      });
    }

    this.connectionCount++;
    console.log(`🔗 Connection acquired (${this.connectionCount}/${this.maxConnections})`);
    return true;
  }

  releaseConnection(): void {
    if (this.connectionCount > 0) {
      this.connectionCount--;
      console.log(`🔓 Connection released (${this.connectionCount}/${this.maxConnections})`);
      
      // Process queued connections
      if (this.connectionQueue.length > 0) {
        const nextConnection = this.connectionQueue.shift();
        if (nextConnection) {
          setTimeout(nextConnection, 100); // Small delay to prevent rapid reconnection
        }
      }
    }
  }

  getConnectionStatus() {
    return {
      active: this.connectionCount,
      max: this.maxConnections,
      queued: this.connectionQueue.length,
      usage: `${this.connectionCount}/${this.maxConnections}`,
      health: this.connectionCount >= this.maxConnections * 0.8 ? 'warning' : 'healthy'
    };
  }

  async executeWithConnection<T>(operation: () => Promise<T>): Promise<T> {
    await this.acquireConnection();
    try {
      return await operation();
    } finally {
      this.releaseConnection();
    }
  }
}

export const connectionManager = ConnectionManager.getInstance();
