// Test bootstrap isolates storage before production main creates any windows.
// No production renderer code or Electron IPC is replaced.
const { app } = require('electron');
if (!process.env.SERENE_TEST_PROFILE) throw new Error('Missing isolated QA profile');
app.setPath('userData', process.env.SERENE_TEST_PROFILE);
require('../../electron/main.cjs');
