/**
 * Web Worker test for yaml-cpp.wasm
 * Tests WASM module functionality in worker context
 */

let yamlCpp = null;

// Load yaml-cpp.wasm in worker context
async function initYamlCpp() {
    try {
        // Import the module (path relative to worker location)
        const module = await import('../../dist/yaml-cpp.mjs');
        yamlCpp = module;
        await module.init();
        return true;
    } catch (error) {
        console.error('Failed to load yaml-cpp.wasm in worker:', error);
        return false;
    }
}

// Handle messages from main thread
self.onmessage = async function(e) {
    try {
        if (!yamlCpp) {
            const initialized = await initYamlCpp();
            if (!initialized) {
                self.postMessage({
                    type: 'error',
                    error: 'Failed to initialize yaml-cpp.wasm in worker'
                });
                return;
            }
        }

        const { type, yaml } = e.data;

        if (type === 'test') {
            // Parse the YAML in worker context
            const result = await yamlCpp.parseYAML(yaml);
            
            self.postMessage({
                type: 'result',
                result: result
            });
        } else if (type === 'performance') {
            // Run performance test in worker
            const iterations = e.data.iterations || 100;
            const testObj = e.data.testObj || { test: 'data' };
            
            const startTime = performance.now();
            
            for (let i = 0; i < iterations; i++) {
                const yamlStr = await yamlCpp.toYAML(testObj);
                await yamlCpp.parseYAML(yamlStr);
            }
            
            const endTime = performance.now();
            const totalTime = endTime - startTime;
            
            self.postMessage({
                type: 'performance-result',
                result: {
                    iterations,
                    totalTime: totalTime.toFixed(2),
                    avgTime: (totalTime / iterations).toFixed(3),
                    throughput: (iterations / (totalTime / 1000)).toFixed(1)
                }
            });
        }

    } catch (error) {
        self.postMessage({
            type: 'error',
            error: error.message
        });
    }
};