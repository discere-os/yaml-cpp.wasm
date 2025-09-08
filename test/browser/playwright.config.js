/**
 * Playwright configuration for yaml-cpp.wasm browser testing
 * Advanced browser testing configuration
 * 
 * WASM Integration Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under the same license as the underlying yaml-cpp project (MIT)
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './browser',
  timeout: 60000,
  fullyParallel: true,
  retries: 2,
  workers: process.env.CI ? 2 : undefined,
  
  reporter: [
    ['html'],
    ['json', { outputFile: 'playwright-results.json' }],
    ['junit', { outputFile: 'playwright-results.xml' }]
  ],
  
  use: {
    // Required headers for WebAssembly and SharedArrayBuffer
    extraHTTPHeaders: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'cross-origin'
    },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  
  webServer: {
    command: 'python -m http.server 8080',
    port: 8080,
    reuseExistingServer: !process.env.CI,
  },
  
  projects: [
    // Desktop Browsers - Standard builds
    {
      name: 'chromium-standard',
      use: {
        ...devices['Desktop Chrome'],
        contextOptions: {
          // Standard build testing
        }
      }
    },
    
    {
      name: 'firefox-standard',
      use: {
        ...devices['Desktop Firefox']
      }
    },
    
    {
      name: 'webkit-standard',
      use: {
        ...devices['Desktop Safari']
      }
    },
    
    // SIMD-enabled browsers (when available)
    {
      name: 'chromium-simd',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--enable-features=WebAssemblySimd',
            '--enable-experimental-wasm-simd'
          ]
        }
      }
    },
    
    {
      name: 'firefox-simd',
      use: {
        ...devices['Desktop Firefox'],
        launchOptions: {
          firefoxUserPrefs: {
            'javascript.options.wasm_simd': true,
            'javascript.options.wasm_simd_wormhole': true
          }
        }
      }
    },
    
    // Mobile browsers
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5']
      }
    },
    
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 12']
      }
    },
    
    // Worker context testing
    {
      name: 'worker-chrome',
      use: {
        ...devices['Desktop Chrome'],
        contextOptions: {
          // Worker-specific configuration
          serviceWorkers: 'allow'
        }
      }
    }
  ]
});