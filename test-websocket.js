// Quick WebSocket test script
// Run with: node test-websocket.js

const WebSocket = require('ws');

const WS_URL = 'wss://shastra-sync.onrender.com/ws/alerts';

console.log('🔌 Connecting to:', WS_URL);

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✅ WebSocket CONNECTED!');
  console.log('📡 Listening for alerts... (Press Ctrl+C to stop)\n');
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('📨 RECEIVED ALERT:');
  console.log(JSON.stringify(message, null, 2));
  console.log('---');
});

ws.on('error', (error) => {
  console.log('❌ WebSocket ERROR:', error.message);
});

ws.on('close', () => {
  console.log('🔌 WebSocket DISCONNECTED');
});

// Keep alive for 60 seconds then close
setTimeout(() => {
  console.log('\n⏰ Test complete (60s timeout)');
  ws.close();
  process.exit(0);
}, 60000);
