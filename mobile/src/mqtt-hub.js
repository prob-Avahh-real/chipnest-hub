import mqtt from 'mqtt';
import { mqttTopics } from './protocol.js';

export class MqttHub {
  /** @param {{ onTelemetry?: Function, onRelay?: Function, onStatus?: Function }} handlers */
  constructor(handlers = {}) {
    this.handlers = handlers;
    this.client = null;
    this.nodeId = 'chipnest-demo';
    this.connected = false;
  }

  connect(brokerUrl, nodeId = 'chipnest-demo') {
    this.nodeId = nodeId;
    this.disconnect();

    return new Promise((resolve, reject) => {
      this.client = mqtt.connect(brokerUrl, {
        reconnectPeriod: 3000,
        connectTimeout: 8000,
      });

      this.client.on('connect', () => {
        this.connected = true;
        const topics = mqttTopics(nodeId);
        this.client.subscribe([
          topics.status,
          topics.temperature,
          topics.humidity,
          topics.relayState,
        ]);
        this.handlers.onStatus?.('mqtt-connected');
        resolve();
      });

      this.client.on('error', (err) => {
        this.handlers.onStatus?.(`mqtt-error: ${err.message}`);
        reject(err);
      });

      this.client.on('message', (topic, payload) => {
        const msg = payload.toString();
        const topics = mqttTopics(this.nodeId);
        if (topic === topics.temperature) {
          this.handlers.onTelemetry?.({ temperature: parseFloat(msg) });
        } else if (topic === topics.humidity) {
          this.handlers.onTelemetry?.({ humidity: parseFloat(msg) });
        } else if (topic === topics.relayState) {
          this.handlers.onRelay?.(msg.toUpperCase() === 'ON');
        } else if (topic === topics.status) {
          this.handlers.onStatus?.(msg);
        }
      });
    });
  }

  sendRelayCommand(state) {
    if (!this.client?.connected) return false;
    const topics = mqttTopics(this.nodeId);
    const payload = state === 'toggle' ? 'TOGGLE' : state === 'on' ? 'ON' : 'OFF';
    this.client.publish(topics.relayCommand, payload);
    return true;
  }

  disconnect() {
    if (this.client) {
      this.client.end(true);
      this.client = null;
    }
    this.connected = false;
  }
}

/** Demo mode when no broker is reachable */
export class SimulatedHub {
  constructor(handlers = {}) {
    this.handlers = handlers;
    this.relayOn = false;
    this.temp = 24.5;
    this.humidity = 55;
    this.timer = null;
  }

  connect() {
    this.handlers.onStatus?.('simulator-running');
    this.emit();
    this.timer = setInterval(() => {
      this.temp += (Math.random() - 0.5) * 0.2;
      this.humidity += (Math.random() - 0.5) * 0.4;
      this.emit();
    }, 3000);
    return Promise.resolve();
  }

  emit() {
    this.handlers.onTelemetry?.({ temperature: this.temp, humidity: this.humidity });
    this.handlers.onRelay?.(this.relayOn);
  }

  sendRelayCommand(state) {
    if (state === 'toggle') this.relayOn = !this.relayOn;
    else if (state === 'on') this.relayOn = true;
    else this.relayOn = false;
    this.handlers.onRelay?.(this.relayOn);
    return true;
  }

  disconnect() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
