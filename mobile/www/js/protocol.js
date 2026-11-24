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
function mqttTopics(nodeId) {
  const prefix = `chipnest/${nodeId}`;
  return {
    status: `${prefix}/status`,
    temperature: `${prefix}/sensor/temperature/state`,
    humidity: `${prefix}/sensor/humidity/state`,
    relayState: `${prefix}/switch/relay/state`,
    relayCommand: `${prefix}/switch/relay/command`
  };
}
export {
  PROTOCOL,
  encodeCommand,
  mqttTopics,
  parseSensorFrame
};
//# sourceMappingURL=protocol.js.map
