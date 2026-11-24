# ChipNest Hub

ESP32 智能家居节点控制面板：BLE 温湿度/继电器 + MQTT 桥 + 戒指/手杖。源码已从 `www/js/*.map` 恢复。

## 命令

```bash
cd mobile
npm install
npm test
npm run build
npm run sync:android
npm run apk:debug
```

协议见 `../protocol/chipnest.json` 与 `src/protocol.js`，须与固件命令码一致。
