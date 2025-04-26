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
exports.BaseAgent = void 0;
const events_1 = require("events");
const uuid_1 = require("uuid");
class BaseAgent {
    constructor(type) {
        this.context = null;
        this.isRunning = false;
        this.type = type;
        this.events = new events_1.EventEmitter();
    }
    setContext(context) {
        this.context = context;
    }
    getType() {
        return this.type;
    }
    on(event, listener) {
        this.events.on(event, listener);
    }
    off(event, listener) {
        this.events.off(event, listener);
    }
    emit(event, ...args) {
        return this.events.emit(event, ...args);
    }
    createMessage(type, payload, target = 'all', priority = 'medium') {
        return {
            id: (0, uuid_1.v4)(),
            type,
            payload,
            source: this.type,
            target,
            priority,
            timestamp: new Date()
        };
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isRunning)
                return;
            this.isRunning = true;
            console.log(`Agent ${this.type} started`);
            this.emit('start', { agentType: this.type, timestamp: new Date() });
        });
    }
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isRunning)
                return;
            this.isRunning = false;
            console.log(`Agent ${this.type} stopped`);
            this.emit('stop', { agentType: this.type, timestamp: new Date() });
        });
    }
    isActive() {
        return this.isRunning;
    }
    logEvent(eventType, data) {
        console.log(`[${this.type}] ${eventType}:`, data || '');
        this.emit('log', {
            agentType: this.type,
            eventType,
            data,
            timestamp: new Date()
        });
    }
    handleError(error) {
        this.logEvent('error', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}
exports.BaseAgent = BaseAgent;
