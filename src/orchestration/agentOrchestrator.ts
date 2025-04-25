import { BaseAgent } from '../agents/baseAgent';
import { AgentType, AgentMessage } from '../types/agent';
import { getMessageQueue } from './messageQueue';
import { EventEmitter } from 'events';

export class AgentOrchestrator {
  private agents: Map<AgentType, BaseAgent>;
  private events: EventEmitter;
  
  constructor() {
    this.agents = new Map();
    this.events = new EventEmitter();
  }
  
  registerAgent(agent: BaseAgent): void {
    const agentType = agent.getType();
    
    if (this.agents.has(agentType)) {
      throw new Error(`Agent of type ${agentType} already registered`);
    }
    
    this.agents.set(agentType, agent);
    
    // Setup message handling for this agent
    this.setupAgentMessageHandling(agent);
    
    console.log(`Agent ${agentType} registered with orchestrator`);
  }
  
  getAgent(type: AgentType): BaseAgent | undefined {
    return this.agents.get(type);
  }
  
  async startAllAgents(): Promise<void> {
    for (const agent of this.agents.values()) {
      await agent.start();
    }
    
    console.log(`Started ${this.agents.size} agents`);
  }
  
  async stopAllAgents(): Promise<void> {
    for (const agent of this.agents.values()) {
      await agent.stop();
    }
    
    console.log(`Stopped ${this.agents.size} agents`);
  }
  
  private setupAgentMessageHandling(agent: BaseAgent): void {
    const agentType = agent.getType();
    const messageQueue = getMessageQueue();
    
    // Subscribe to messages for this agent
    messageQueue.subscribeToQueue(agentType, async (message: AgentMessage) => {
      try {
        console.log(`Agent ${agentType} received message:`, message.type);
        
        // Emit event for monitoring
        this.events.emit('message_received', {
          agentType,
          messageId: message.id,
          messageType: message.type,
          timestamp: new Date()
        });
        
        // Process message based on its type
        await this.handleAgentMessage(agent, message);
        
        // Emit completion event
        this.events.emit('message_processed', {
          agentType,
          messageId: message.id,
          success: true,
          timestamp: new Date()
        });
      } catch (error) {
        console.error(`Error handling message for agent ${agentType}:`, error);
        
        // Emit error event
        this.events.emit('message_error', {
          agentType,
          messageId: message.id,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date()
        });
      }
    });
    
    // Forward agent events to orchestrator events
    agent.on('log', (data) => {
      this.events.emit('agent_log', {
        agentType,
        ...data,
        timestamp: new Date()
      });
    });
  }
  
  private async handleAgentMessage(agent: BaseAgent, message: AgentMessage): Promise<void> {
    // This method would contain the logic to handle different message types
    // For example:
    switch (message.type) {
      case 'process_data':
        await agent.process(message.payload, {
          userId: message.payload.userId,
          requestId: message.id
        });
        break;
        
      case 'status_request':
        // Send back status info
        this.publishMessage({
          id: `response-${message.id}`,
          type: 'status_response',
          payload: {
            isActive: agent.isActive(),
            timestamp: new Date()
          },
          source: agent.getType(),
          target: message.source,
          priority: 'high',
          timestamp: new Date()
        });
        break;
        
      // Add handlers for other message types
      
      default:
        console.warn(`Unhandled message type: ${message.type}`);
    }
  }
  
  async publishMessage(message: AgentMessage): Promise<boolean> {
    const messageQueue = getMessageQueue();
    return messageQueue.publishMessage(message);
  }
  
  on(event: string, listener: (...args: any[]) => void): void {
    this.events.on(event, listener);
  }
  
  off(event: string, listener: (...args: any[]) => void): void {
    this.events.off(event, listener);
  }
}

// Singleton instance
const orchestrator = new AgentOrchestrator();

export const getAgentOrchestrator = (): AgentOrchestrator => {
  return orchestrator;
};