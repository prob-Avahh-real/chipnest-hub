// src/protocol.js
var PROTOCOL = {
  controlService: "0000ffe0-0000-1000-8000-00805f9b34fb",
  commandChar: "0000ffe1-0000-1000-8000-00805f9b34fb",
  sensorService: "0000ffe2-0000-1000-8000-00805f9b34fb",
  sensorChar: "0000ffe3-0000-1000-8000-00805f9b34fb",
  deviceNamePrefix: "CHIPNEST",
  commands: {
    relayOn: 192,
    relayOff: 193,
    relayToggle: 194,
    setAuto: 195
  }
};
function parseSensorFrame(dataView) {
  if (dataView.byteLength < 8) return null;
  const temp = dataView.getUint16(0, true) / 100;
  const humidity = dataView.getUint16(2, true) / 100;
  const relayOn = dataView.getUint8(4) === 1;
  const autoMode = dataView.getUint8(5) === 1;
  const seq = dataView.getUint8(6);
  return { temp, humidity, relayOn, autoMode, seq };
}
function encodeCommand(name) {
  const code = PROTOCOL.commands[name];
  if (code == null) throw new Error(`Unknown command: ${name}`);
  return new Uint8Array([code]);
}

// src/ble-hub.js
var BleHub = class {
  /** @param {{ onTelemetry?: Function, onRelay?: Function, onStatus?: Function }} handlers */
  constructor(handlers = {}) {
    this.handlers = handlers;
    this.device = null;
    this.sensorChar = null;
    this.cmdChar = null;
  }
  get supported() {
    return typeof navigator !== "undefined" && !!navigator.bluetooth;
  }
  async connect() {
    if (!this.supported) {
      throw new Error("Web Bluetooth \u4E0D\u53EF\u7528");
    }
    this.handlers.onStatus?.("ble-scanning");
    this.device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: PROTOCOL.deviceNamePrefix }],
      optionalServices: [PROTOCOL.controlService, PROTOCOL.sensorService]
    });
    this.device.addEventListener("gattserverdisconnected", () => {
      this.handlers.onStatus?.("ble-disconnected");
      this.sensorChar = null;
      this.cmdChar = null;
    });
    const server = await this.device.gatt.connect();
    const ctrlService = await server.getPrimaryService(PROTOCOL.controlService);
    this.cmdChar = await ctrlService.getCharacteristic(PROTOCOL.commandChar);
    const sensorService = await server.getPrimaryService(PROTOCOL.sensorService);
    this.sensorChar = await sensorService.getCharacteristic(PROTOCOL.sensorChar);
    await this.sensorChar.startNotifications();
    this.sensorChar.addEventListener("characteristicvaluechanged", (event) => {
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
};
export {
  BleHub
};
//# sourceMappingURL=ble-hub.js.map
