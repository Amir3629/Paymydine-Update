export interface WebSocketMessage {
    type: 'order_update' | 'menu_update' | 'waiter_call' | 'payment_update'
    data: any
  }
  
  export class WebSocketClient {
    private ws: WebSocket | null = null
    private reconnectAttempts = 0
    private maxReconnectAttempts = 5
    private reconnectDelay = 1000
    private messageHandlers: Map<string, (data: any) => void> = new Map()
  
    constructor(private url: string = 'ws://localhost/ws') {}
  
    connect() {
      try {
        this.ws = new WebSocket(this.url)
        this.setupEventHandlers()
      } catch (error) {
        console.error('WebSocket connection failed:', error)
        this.handleReconnect()
      }
    }
  
    private setupEventHandlers() {
      if (!this.ws) return
  
      this.ws.onopen = () => {
        console.log('WebSocket connected')
        this.reconnectAttempts = 0
      }
  
      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          this.handleMessage(message)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }
  
      this.ws.onclose = () => {
        console.log('WebSocket disconnected')
        this.handleReconnect()
      }
  
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
    }
  
    private handleMessage(message: WebSocketMessage) {
      const handler = this.messageHandlers.get(message.type)
      if (handler) {
        handler(message.data)
      }
    }
  
    private handleReconnect() {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++
        setTimeout(() => {
          console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
          this.connect()
        }, this.reconnectDelay * this.reconnectAttempts)
      }
    }
  
    onMessage(type: string, handler: (data: any) => void) {
      this.messageHandlers.set(type, handler)
    }
  
    send(message: WebSocketMessage) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(message))
      }
    }
  
    disconnect() {
      if (this.ws) {
        this.ws.close()
        this.ws = null
      }
    }
  }
  
  export const wsClient = new WebSocketClient()
