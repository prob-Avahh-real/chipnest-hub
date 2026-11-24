import { PROTOCOL, encodeCommand, parseSensorFrame } from './protocol.js';

export class BleHub {
  /** @param {{ onTelemetry?: Function, onRelay?: Function, onStatus?: Function }} handlers */
  constructor(handlers = {}) {
    this.handlers = handlers;
    this.device = null;
    this.sensorChar = null;
    this.cmdChar = null;
  }

  get supported() {
    return typeof navigator !== 'undefined' && !!navigator.bluetooth;
  }

  async connect() {
    if (!this.supported) {
      throw new Error('Web Bluetooth 不可用');
    }

    this.handlers.onStatus?.('ble-scanning');

    this.device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: PROTOCOL.deviceNamePrefix }],
      optionalServices: [PROTOCOL.controlService, PROTOCOL.sensorService],
    });

    this.device.addEventListener('gattserverdisconnected', () => {
      this.handlers.onStatus?.('ble-disconnected');
      this.sensorChar = null;
      this.cmdChar = null;
    });

    const server = await this.device.gatt.connect();
    const ctrlService = await server.getPrimaryService(PROTOCOL.controlService);
    this.cmdChar = await ctrlService.getCharacteristic(PROTOCOL.commandChar);

    const sensorService = await server.getPrimaryService(PROTOCOL.sensorService);
    this.sensorChar = await sensorService.getCharacteristic(PROTOCOL.sensorChar);
    await this.sensorChar.startNotifications();
    this.sensorChar.addEventListener('characteristicvaluechanged', (event) => {
      const frame = parseSensorFrame(event.target.value);
      if (!frame) return;
      this.handlers.onTelemetry?.({ temperature: frame.temp, humidity: frame.humidity });
      this.handlers.onRelay?.(frame.relayOn);
    });

    this.handlers.onStatus?.(`ble-connected: ${this.device.name}`);
    return this.device.name;
  }

  async sendCommand(name) {
    if (!this.cmdChar) return false;
    const bytes = encodeCommand(name);
    await this.cmdChar.writeValue(bytes);
    return true;
  }

  disconnect() {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
  }
}
