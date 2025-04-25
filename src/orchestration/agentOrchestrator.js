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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAgentOrchestrator = exports.AgentOrchestrator = void 0;
const messageQueue_1 = require("./messageQueue");
const events_1 = require("events");
class AgentOrchestrator {
    constructor() {
        this.agents = new Map();
        this.events = new events_1.EventEmitter();
    }
    registerAgent(agent) {
        const agentType = agent.getType();
        if (this.agents.has(agentType)) {
            throw new Error(`Agent of type ${agentType} already registered`);
        }
        this.agents.set(agentType, agent);
        // Setup message handling for this agent
        this.setupAgentMessageHandling(agent);
        console.log(`Agent ${agentType} registered with orchestrator`);
    }
    getAgent(type) {
        return this.agents.get(type);
    }
    startAllAgents() {
        return __awaiter(this, void 0, void 0, function* () {
            for (const agent of this.agents.values()) {
                yield agent.start();
            }
            console.log(`Started ${this.agents.size} agents`);
        });
    }
    stopAllAgents() {
        return __awaiter(this, void 0, void 0, function* () {
            for (const agent of this.agents.values()) {
                yield agent.stop();
            }
            console.log(`Stopped ${this.agents.size} agents`);
        });
    }
    setupAgentMessageHandling(agent) {
        const agentType = agent.getType();
        const messageQueue = (0, messageQueue_1.getMessageQueue)();
        // Subscribe to messages for this agent
        messageQueue.subscribeToQueue(agentType, (message) => __awaiter(this, void 0, void 0, function* () {
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
                yield this.handleAgentMessage(agent, message);
                // Emit completion event
                this.events.emit('message_processed', {
                    agentType,
                    messageId: message.id,
                    success: true,
                    timestamp: new Date()
                });
            }
            catch (error) {
                console.error(`Error handling message for agent ${agentType}:`, error);
                // Emit error event
                this.events.emit('message_error', {
                    agentType,
                    messageId: message.id,
                    error: error instanceof Error ? error.message : String(error),
                    timestamp: new Date()
                });
            }
        }));
        // Forward agent events to orchestrator events
        agent.on('log', (data) => {
            this.events.emit('agent_log', Object.assign(Object.assign({ agentType }, data), { timestamp: new Date() }));
        });
    }
    handleAgentMessage(agent, message) {
        return __awaiter(this, void 0, void 0, function* () {
            // This method would contain the logic to handle different message types
            // For example:
            switch (message.type) {
                case 'process_data':
                    yield agent.process(message.payload, {
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
        });
    }
    publishMessage(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const messageQueue = (0, messageQueue_1.getMessageQueue)();
            return messageQueue.publishMessage(message);
        });
    }
    on(event, listener) {
        this.events.on(event, listener);
    }
    off(event, listener) {
        this.events.off(event, listener);
    }
}
exports.AgentOrchestrator = AgentOrchestrator;
// Singleton instance
const orchestrator = new AgentOrchestrator();
const getAgentOrchestrator = () => {
    return orchestrator;
};
exports.getAgentOrchestrator = getAgentOrchestrator;
