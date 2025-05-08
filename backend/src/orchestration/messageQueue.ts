import amqp from 'amqplib';
import { AgentMessage, AgentType } from '../types/agent';
import { EventEmitter } from 'events';
import dotenv from 'dotenv';

dotenv.config();

class MessageQueue {
  private connection: any | null = null;
  private channel: any | null = null;
  private isConnected: boolean = false;
  private queuePrefix: string;
  private events: EventEmitter;
  
  constructor() {
    this.queuePrefix = process.env.RABBITMQ_QUEUE_PREFIX || 'financial_copilot_';
    this.events = new EventEmitter();
  }
  
  async connect(): Promise<void> {
    try {
      const url = process.env.RABBITMQ_URL || 'amqp://localhost';
      console.log(`Connecting to RabbitMQ at ${url}...`);
      this.connection = await amqp.connect(url);
      
      if (!this.connection) {
        throw new Error('Connection not established');
      }
      
      this.connection.on('error', (err: any) => {
        console.error('RabbitMQ connection error:', err);
        this.isConnected = false;
      });
      
      this.connection.on('close', () => {
        console.log('RabbitMQ connection closed');
        this.isConnected = false;
        
        // Try to reconnect after a delay
        setTimeout(() => this.connect(), 5000);
      });
      
      this.channel = await this.connection.createChannel();
      this.isConnected = true;
      
      console.log('Connected to RabbitMQ');
      
      // Declare queues for each agent type
      await this.declareQueues();
      
      return;
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error);
      this.isConnected = false;
      
      // Mock mode for development without RabbitMQ
      if (process.env.NODE_ENV === 'development') {
        console.log('Running in mock mode without RabbitMQ');
        this.isConnected = true;
      } else {
        // Try to reconnect after a delay
        setTimeout(() => this.connect(), 5000);
      }
    }
  }
  
  async declareQueues(): Promise<void> {
    if (!this.channel) return;
    
    // Declare a queue for each agent type
    for (const agentType of Object.values(AgentType)) {
      const queueName = `${this.queuePrefix}${agentType}`;
      await this.channel.assertQueue(queueName, { durable: true });
    }
    
    // Also declare a broadcast queue
    const broadcastQueue = `${this.queuePrefix}broadcast`;
    await this.channel.assertQueue(broadcastQueue, { durable: true });
  }
  
  async publishMessage(message: AgentMessage): Promise<boolean> {
    try {
      if (!this.isConnected) {
        // In development, emit the message directly for mock mode
        if (process.env.NODE_ENV === 'development') {
          this.events.emit('message', message);
          return true;
        }
        
        throw new Error('Not connected to RabbitMQ');
      }
      
      if (!this.channel) {
        throw new Error('Channel not established');
      }
      
      // Determine the target queue
      let targetQueue: string;
      
      if (message.target === 'all') {
        targetQueue = `${this.queuePrefix}broadcast`;
      } else {
        targetQueue = `${this.queuePrefix}${message.target}`;
      }
      
      // Publish the message
      const result = this.channel.sendToQueue(
        targetQueue,
        Buffer.from(JSON.stringify(message)),
        {
          persistent: true,
          priority: message.priority === 'high' ? 10 : message.priority === 'medium' ? 5 : 1
        }
      );
      
      return result;
    } catch (error) {
      console.error('Error publishing message:', error);
      
      // In development, emit the message directly for mock mode
      if (process.env.NODE_ENV === 'development') {
        this.events.emit('message', message);
        return true;
      }
      
      return false;
    }
  }
  
  async subscribeToQueue(agentType: AgentType, callback: (message: AgentMessage) => void): Promise<void> {
    try {
      // In development mock mode, use event emitter
      if (process.env.NODE_ENV === 'development' && !this.channel) {
        this.events.on('message', (message: AgentMessage) => {
          if (message.target === agentType || message.target === 'all') {
            callback(message);
          }
        });
        return;
      }
      
      if (!this.isConnected || !this.channel) {
        console.log('Waiting for RabbitMQ connection...');
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds
        if (!this.isConnected || !this.channel) {
          throw new Error('Not connected to RabbitMQ');
        }
      }
      
      // Subscribe to agent-specific queue
      const queueName = `${this.queuePrefix}${agentType}`;
      console.log(`Attempting to subscribe to queue: ${queueName}`);
      console.log(`Connection status: ${this.isConnected}`);
      
      await this.channel.assertQueue(queueName, { durable: true });
      console.log(`Subscribed to queue: ${queueName}`);

      await this.channel.consume(queueName, (msg: { content: { toString: () => string; }; }) => {
        if (msg) {
          try {
            const message = JSON.parse(msg.content.toString()) as AgentMessage;
            callback(message);
            this.channel?.ack(msg);
          } catch (error) {
            console.error('Error processing message:', error);
            this.channel?.nack(msg);
          }
        }
      });
      
      // Also subscribe to broadcast queue
      const broadcastQueue = `${this.queuePrefix}broadcast`;
      await this.channel.consume(broadcastQueue, (msg: { content: { toString: () => string; }; }) => {
        if (msg) {
          try {
            const message = JSON.parse(msg.content.toString()) as AgentMessage;
            callback(message);
            this.channel?.ack(msg);
          } catch (error) {
            console.error('Error processing broadcast message:', error);
            this.channel?.nack(msg);
          }
        }
      });
    } catch (error) {
      console.error(`Error subscribing to queue for ${agentType}:`, error);
    }
  }
  
  async close(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
    }
    
    if (this.connection) {
      await this.connection.close();
    }
    
    this.isConnected = false;
  }
}

// Singleton instance
const messageQueue = new MessageQueue();

export const setupMessageQueue = async (): Promise<void> => {
  console.log('Setting up RabbitMQ connection...');
  await messageQueue.connect();
  console.log('RabbitMQ setup complete.');
};

export const getMessageQueue = (): MessageQueue => {
  return messageQueue;
};