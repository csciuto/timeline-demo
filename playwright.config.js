const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:8092' },
  webServer: {
    command: 'python3 -m http.server 8092',
    url: 'http://localhost:8092',
    reuseExistingServer: !process.env.CI,
  },
});
