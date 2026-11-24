import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PROTOCOL, encodeCommand, parseSensorFrame, mqttTopics } from '../src/protocol.js';

describe('ChipNest protocol', () => {
  it('encodes known relay commands', () => {
    assert.deepEqual(encodeCommand('relayOn'), new Uint8Array([0xc0]));
    assert.deepEqual(encodeCommand('relayToggle'), new Uint8Array([0xc2]));
  });

  it('parses sensor frames', () => {
    const buf = new ArrayBuffer(8);
    const view = new DataView(buf);
    view.setUint16(0, 2450, true);
    view.setUint16(2, 5510, true);
    view.setUint8(4, 1);
    view.setUint8(5, 0);
    view.setUint8(6, 3);
    const parsed = parseSensorFrame(view);
    assert.equal(parsed.temp, 24.5);
    assert.equal(parsed.humidity, 55.1);
    assert.equal(parsed.relayOn, true);
    assert.equal(parsed.seq, 3);
  });

  it('builds mqtt topics', () => {
    const t = mqttTopics('demo');
    assert.equal(t.relayCommand, 'chipnest/demo/switch/relay/command');
    assert.equal(PROTOCOL.deviceNamePrefix, 'CHIPNEST');
  });
});
