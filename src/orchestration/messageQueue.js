"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMessageQueue = exports.setupMessageQueue = void 0;
const amqplib_1 = __importDefault(require("amqplib"));
const agent_1 = require("../types/agent");
const events_1 = require("events");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class MessageQueue {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.isConnected = false;
        this.queuePrefix = process.env.RABBITMQ_QUEUE_PREFIX || 'financial_copilot_';
        this.events = new events_1.EventEmitter();
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const url = process.env.RABBITMQ_URL || 'amqp://localhost';
                this.connection = yield amqplib_1.default.connect(url);
                if (!this.connection) {
                    throw new Error('Connection not established');
                }
                this.connection.on('error', (err) => {
                    console.error('RabbitMQ connection error:', err);
                    this.isConnected = false;
                });
                this.connection.on('close', () => {
                    console.log('RabbitMQ connection closed');
                    this.isConnected = false;
                    // Try to reconnect after a delay
                    setTimeout(() => this.connect(), 5000);
                });
                this.channel = yield this.connection.createChannel();
                this.isConnected = true;
                console.log('Connected to RabbitMQ');
                // Declare queues for each agent type
                yield this.declareQueues();
                return;
            }
            catch (error) {
                console.error('Failed to connect to RabbitMQ:', error);
                this.isConnected = false;
                // Mock mode for development without RabbitMQ
                if (process.env.NODE_ENV === 'development') {
                    console.log('Running in mock mode without RabbitMQ');
                    this.isConnected = true;
                }
                else {
                    // Try to reconnect after a delay
                    setTimeout(() => this.connect(), 5000);
                }
            }
        });
    }
    declareQueues() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.channel)
                return;
            // Declare a queue for each agent type
            for (const agentType of Object.values(agent_1.AgentType)) {
                const queueName = `${this.queuePrefix}${agentType}`;
                yield this.channel.assertQueue(queueName, { durable: true });
            }
            // Also declare a broadcast queue
            const broadcastQueue = `${this.queuePrefix}broadcast`;
            yield this.channel.assertQueue(broadcastQueue, { durable: true });
        });
    }
    publishMessage(message) {
        return __awaiter(this, void 0, void 0, function* () {
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
                let targetQueue;
                if (message.target === 'all') {
                    targetQueue = `${this.queuePrefix}broadcast`;
                }
                else {
                    targetQueue = `${this.queuePrefix}${message.target}`;
                }
                // Publish the message
                const result = this.channel.sendToQueue(targetQueue, Buffer.from(JSON.stringify(message)), {
                    persistent: true,
                    priority: message.priority === 'high' ? 10 : message.priority === 'medium' ? 5 : 1
                });
                return result;
            }
            catch (error) {
                console.error('Error publishing message:', error);
                // In development, emit the message directly for mock mode
                if (process.env.NODE_ENV === 'development') {
                    this.events.emit('message', message);
                    return true;
                }
                return false;
            }
        });
    }
    subscribeToQueue(agentType, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // In development mock mode, use event emitter
                if (process.env.NODE_ENV === 'development' && !this.channel) {
                    this.events.on('message', (message) => {
                        if (message.target === agentType || message.target === 'all') {
                            callback(message);
                        }
                    });
                    return;
                }
                if (!this.isConnected || !this.channel) {
                    throw new Error('Not connected to RabbitMQ');
                }
                // Subscribe to agent-specific queue
                const queueName = `${this.queuePrefix}${agentType}`;
                yield this.channel.consume(queueName, (msg) => {
                    var _a, _b;
                    if (msg) {
                        try {
                            const message = JSON.parse(msg.content.toString());
                            callback(message);
                            (_a = this.channel) === null || _a === void 0 ? void 0 : _a.ack(msg);
                        }
                        catch (error) {
                            console.error('Error processing message:', error);
                            (_b = this.channel) === null || _b === void 0 ? void 0 : _b.nack(msg);
                        }
                    }
                });
                // Also subscribe to broadcast queue
                const broadcastQueue = `${this.queuePrefix}broadcast`;
                yield this.channel.consume(broadcastQueue, (msg) => {
                    var _a, _b;
                    if (msg) {
                        try {
                            const message = JSON.parse(msg.content.toString());
                            callback(message);
                            (_a = this.channel) === null || _a === void 0 ? void 0 : _a.ack(msg);
                        }
                        catch (error) {
                            console.error('Error processing broadcast message:', error);
                            (_b = this.channel) === null || _b === void 0 ? void 0 : _b.nack(msg);
                        }
                    }
                });
            }
            catch (error) {
                console.error(`Error subscribing to queue for ${agentType}:`, error);
            }
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.channel) {
                yield this.channel.close();
            }
            if (this.connection) {
                yield this.connection.close();
            }
            this.isConnected = false;
        });
    }
}
// Singleton instance
const messageQueue = new MessageQueue();
const setupMessageQueue = () => __awaiter(void 0, void 0, void 0, function* () {
    yield messageQueue.connect();
});
exports.setupMessageQueue = setupMessageQueue;
const getMessageQueue = () => {
    return messageQueue;
};
exports.getMessageQueue = getMessageQueue;
