import { MqttHub, SimulatedHub } from './mqtt-hub.js';
import { BleHub } from './ble-hub.js';
import { WearableInput } from './wearable-input.js';

const $ = (id) => document.getElementById(id);

const state = {
  temperature: null,
  humidity: null,
  relayOn: false,
  mqttConnected: false,
  bleConnected: false,
  mode: 'simulator',
};

let hub = null;
const ble = new BleHub({
  onTelemetry: applyTelemetry,
  onRelay: applyRelay,
  onStatus: setStatus,
});
const wearable = new WearableInput({
  onAction: (action) => dispatchCommand(action),
  onBadge: updateBadge,
});

function applyTelemetry(partial) {
  if (partial.temperature != null) {
    state.temperature = partial.temperature;
    $('temp-val').textContent = `${partial.temperature.toFixed(1)}°C`;
  }
  if (partial.humidity != null) {
    state.humidity = partial.humidity;
    $('hum-val').textContent = `${partial.humidity.toFixed(1)}%`;
  }
}

function applyRelay(on) {
  state.relayOn = on;
  $('relay-state').textContent = on ? 'ON' : 'OFF';
  $('relay-state').classList.toggle('on', on);
  $('relay-btn').textContent = on ? '关闭继电器' : '打开继电器';
}

function setStatus(msg) {
  $('conn-status').textContent = msg;
  state.mqttConnected = msg.includes('mqtt-connected') || msg.includes('simulator');
  state.bleConnected = msg.includes('ble-connected');
}

function updateBadge(kind, text, active) {
  const el = $(`${kind}-badge`);
  if (!el) return;
  el.textContent = text;
  el.classList.toggle('active', active);
  el.style.display = 'flex';
}

async function dispatchCommand(action) {
  const map = {
    relayOn: 'on',
    relayOff: 'off',
    relayToggle: 'toggle',
  };
  const relayState = map[action];
  if (!relayState) return;

  if (state.bleConnected) {
    const cmdMap = { on: 'relayOn', off: 'relayOff', toggle: 'relayToggle' };
    await ble.sendCommand(cmdMap[relayState]);
  }
  if (hub) hub.sendRelayCommand(relayState);

  if (relayState === 'toggle') applyRelay(!state.relayOn);
  else applyRelay(relayState === 'on');
}

async function connectMqtt() {
  const broker = $('mqtt-broker').value.trim();
  const nodeId = $('node-id').value.trim() || 'chipnest-demo';
  state.mode = 'mqtt';

  hub?.disconnect();
  hub = new MqttHub({
    onTelemetry: applyTelemetry,
    onRelay: applyRelay,
    onStatus: setStatus,
  });

  try {
    await hub.connect(broker, nodeId);
  } catch {
    setStatus('mqtt-failed → 切换模拟器');
    hub.disconnect();
    hub = new SimulatedHub({
      onTelemetry: applyTelemetry,
      onRelay: applyRelay,
      onStatus: setStatus,
    });
    state.mode = 'simulator';
    await hub.connect();
  }
}

async function connectBle() {
  try {
    await ble.connect();
  } catch (err) {
    setStatus(`ble-error: ${err.message}`);
  }
}

function useSimulator() {
  hub?.disconnect();
  state.mode = 'simulator';
  hub = new SimulatedHub({
    onTelemetry: applyTelemetry,
    onRelay: applyRelay,
    onStatus: setStatus,
  });
  hub.connect();
}

$('btn-mqtt').addEventListener('click', connectMqtt);
$('btn-ble').addEventListener('click', connectBle);
$('btn-sim').addEventListener('click', useSimulator);
$('relay-btn').addEventListener('click', () => dispatchCommand(state.relayOn ? 'relayOff' : 'relayOn'));
$('toggle-btn').addEventListener('click', () => dispatchCommand('relayToggle'));

wearable.setupRing();
wearable.setupCane();
useSimulator();

export {};
