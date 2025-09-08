/**
 * Browser-based tests for yaml-cpp.wasm
 * Cross-browser compatibility validation
 * Advanced browser compatibility testing
 * 
 * WASM Integration Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under the same license as the underlying yaml-cpp project (MIT)
 */

import { test, expect } from '@playwright/test';

test.describe('yaml-cpp.wasm Browser Tests', () => {
  let yamlCpp;

  test.beforeEach(async ({ page }) => {
    // Navigate to test page
    await page.goto('http://localhost:8080/test/browser/test.html');
    
    // Wait for WASM module to load
    await page.waitForFunction(() => window.yamlCppLoaded === true, { timeout: 10000 });
    
    // Get the yaml-cpp module
    yamlCpp = await page.evaluate(() => window.yamlCpp);
  });

  test('should load WASM module successfully', async ({ page }) => {
    const moduleLoaded = await page.evaluate(() => {
      return typeof window.yamlCpp !== 'undefined' && window.yamlCppLoaded === true;
    });
    
    expect(moduleLoaded).toBe(true);
  });

  test('should parse basic YAML in browser', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const yaml = 'name: test\nversion: 1.0\nconfig:\n  debug: true';
      return await window.yamlCpp.parseYAML(yaml);
    });
    
    expect(result.name).toBe('test');
    expect(result.version).toBe(1.0);
    expect(result.config.debug).toBe(true);
  });

  test('should validate YAML in browser', async ({ page }) => {
    const validResult = await page.evaluate(async () => {
      const validYaml = 'key: value\nnumber: 42';
      return await window.yamlCpp.validateYAML(validYaml);
    });
    
    const invalidResult = await page.evaluate(async () => {
      const invalidYaml = 'key: value\n  invalid_indent: true';
      return await window.yamlCpp.validateYAML(invalidYaml);
    });
    
    expect(validResult).toBe(true);
    expect(invalidResult).toBe(false);
  });

  test('should convert objects to YAML in browser', async ({ page }) => {
    const yamlString = await page.evaluate(async () => {
      const obj = {
        name: 'browser-test',
        features: ['parsing', 'validation', 'emission'],
        config: { 
          browser: true,
          version: 2.0
        }
      };
      return await window.yamlCpp.toYAML(obj);
    });
    
    expect(typeof yamlString).toBe('string');
    expect(yamlString).toContain('name:');
    expect(yamlString).toContain('browser-test');
    expect(yamlString).toContain('features:');
  });

  test('should handle large documents in browser', async ({ page }) => {
    const result = await page.evaluate(async () => {
      // Generate large object
      const largeObj = {};
      for (let i = 0; i < 100; i++) {
        largeObj[`item_${i}`] = {
          id: i,
          value: `test_value_${i}`,
          nested: {
            array: [i, i+1, i+2]
          }
        };
      }
      
      const yaml = await window.yamlCpp.toYAML(largeObj);
      const parsed = await window.yamlCpp.parseYAML(yaml);
      
      return {
        originalKeys: Object.keys(largeObj).length,
        parsedKeys: Object.keys(parsed).length,
        sampleValue: parsed.item_50?.value
      };
    });
    
    expect(result.originalKeys).toBe(100);
    expect(result.parsedKeys).toBe(100);
    expect(result.sampleValue).toBe('test_value_50');
  });

  test('should perform well in browser environment', async ({ page }) => {
    const performanceResult = await page.evaluate(async () => {
      const testData = {
        servers: []
      };
      
      // Generate medium-sized test data
      for (let i = 0; i < 100; i++) {
        testData.servers.push({
          id: `server_${i}`,
          host: `host${i}.example.com`,
          config: { port: 8080 + i, enabled: true }
        });
      }
      
      const iterations = 100;
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        const yaml = await window.yamlCpp.toYAML(testData);
        await window.yamlCpp.parseYAML(yaml);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      return {
        totalTime,
        avgTime: totalTime / iterations,
        throughput: iterations / (totalTime / 1000)
      };
    });
    
    // Performance expectations for browser environment
    expect(performanceResult.avgTime).toBeLessThan(50); // <50ms per operation
    expect(performanceResult.throughput).toBeGreaterThan(20); // >20 ops/sec
  });

  test('should work in Web Worker context', async ({ page }) => {
    const workerResult = await page.evaluate(async () => {
      return new Promise((resolve, reject) => {
        const worker = new Worker('worker-test.js');
        
        worker.postMessage({
          type: 'test',
          yaml: 'worker: true\ntest: success\ndata:\n  value: 42'
        });
        
        worker.onmessage = (e) => {
          if (e.data.type === 'result') {
            resolve(e.data.result);
          } else if (e.data.type === 'error') {
            reject(new Error(e.data.error));
          }
        };
        
        worker.onerror = reject;
        
        setTimeout(() => reject(new Error('Worker timeout')), 5000);
      });
    });
    
    expect(workerResult.worker).toBe(true);
    expect(workerResult.test).toBe('success');
    expect(workerResult.data.value).toBe(42);
  });

  test('should handle memory efficiently', async ({ page }) => {
    const memoryTest = await page.evaluate(async () => {
      const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : null;
      
      // Perform many operations to test memory management
      for (let i = 0; i < 50; i++) {
        const obj = { iteration: i, data: new Array(100).fill(i) };
        const yaml = await window.yamlCpp.toYAML(obj);
        await window.yamlCpp.parseYAML(yaml);
      }
      
      // Force garbage collection if available
      if (window.gc) {
        window.gc();
      }
      
      const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : null;
      
      return {
        initialMemory,
        finalMemory,
        memoryGrowth: finalMemory && initialMemory ? finalMemory - initialMemory : null
      };
    });
    
    // Memory growth should be reasonable (less than 10MB for this test)
    if (memoryTest.memoryGrowth !== null) {
      expect(memoryTest.memoryGrowth).toBeLessThan(10 * 1024 * 1024);
    }
  });

  test('should handle errors gracefully in browser', async ({ page }) => {
    const errorHandling = await page.evaluate(async () => {
      const results = {};
      
      // Test invalid YAML parsing
      try {
        await window.yamlCpp.parseYAML('invalid: yaml: content:::');
        results.parseError = false;
      } catch (e) {
        results.parseError = true;
        results.parseErrorMessage = e.message;
      }
      
      // Test null/undefined inputs
      try {
        await window.yamlCpp.validateYAML(null);
        results.nullError = false;
      } catch (e) {
        results.nullError = true;
      }
      
      return results;
    });
    
    expect(errorHandling.parseError).toBe(true);
    expect(errorHandling.parseErrorMessage).toContain('YAML');
    expect(errorHandling.nullError).toBe(true);
  });
});