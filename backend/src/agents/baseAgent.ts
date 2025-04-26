import { AgentType, AgentContext, AgentResult, AgentMessage } from '../types/agent';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export abstract class BaseAgent {
  protected type: AgentType;
  protected context: AgentContext | null = null;
  protected events: EventEmitter;
  protected isRunning: boolean = false;
  
  constructor(type: AgentType) {
    this.type = type;
    this.events = new EventEmitter();
  }
  
  abstract process<T>(input: any, context?: AgentContext): Promise<AgentResult<T>>;
  
  setContext(context: AgentContext): void {
    this.context = context;
  }
  
  getType(): AgentType {
    return this.type;
  }
  
  on(event: string, listener: (...args: any[]) => void): void {
    this.events.on(event, listener);
  }
  
  off(event: string, listener: (...args: any[]) => void): void {
    this.events.off(event, listener);
  }
  
  emit(event: string, ...args: any[]): boolean {
    return this.events.emit(event, ...args);
  }
  
  protected createMessage(type: string, payload: any, target: AgentType | 'all' = 'all', priority: 'low' | 'medium' | 'high' = 'medium'): AgentMessage {
    return {
      id: uuidv4(),
      type,
      payload,
      source: this.type,
      target,
      priority,
      timestamp: new Date()
    };
  }
  
  async start(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log(`Agent ${this.type} started`);
    
    this.emit('start', { agentType: this.type, timestamp: new Date() });
  }
  
  async stop(): Promise<void> {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    console.log(`Agent ${this.type} stopped`);
    
    this.emit('stop', { agentType: this.type, timestamp: new Date() });
  }
  
  isActive(): boolean {
    return this.isRunning;
  }
  
  protected logEvent(eventType: string, data?: any): void {
    console.log(`[${this.type}] ${eventType}:`, data || '');
    
    this.emit('log', {
      agentType: this.type,
      eventType,
      data,
      timestamp: new Date()
    });
  }
  
  protected handleError(error: Error): AgentResult<any> {
    this.logEvent('error', error.message);
    
    return {
      success: false,
      error: error.message
    };
  }
}