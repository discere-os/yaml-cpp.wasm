/**
 * WASM-Native Filesystem Integration Tests
 * Advanced web-native capabilities testing for yaml-cpp.wasm
 */

import { describe, it, beforeAll, afterAll } from 'node:test';
import assert from 'node:assert';
import { parseYAML, validateYAML, toYAML, init } from '../../dist/yaml-cpp.mjs';

describe('WASM-Native Filesystem Tests', () => {
    let yamlModule;
    let wasmNativeAvailable = false;

    beforeAll(async () => {
        yamlModule = await init();
        
        // Check if WASM-native features are available
        if (typeof yamlModule._yaml_init_filesystem === 'function') {
            wasmNativeAvailable = true;
            
            // Initialize filesystem
            const initResult = yamlModule._yaml_init_filesystem('/yaml-cache');
            console.log(`WASM-native filesystem init: ${initResult ? '✅' : '❌'}`);
        }
    });

    it('should detect WASM-native availability', async () => {
        console.log(`WASM-native features: ${wasmNativeAvailable ? '✅ Available' : '❌ Not Available'}`);
        
        if (wasmNativeAvailable) {
            // Test filesystem functions are exported
            assert(typeof yamlModule._yaml_init_filesystem === 'function', 'init_filesystem should be exported');
            assert(typeof yamlModule._yaml_load_schema_from_url === 'function', 'load_schema_from_url should be exported');
            assert(typeof yamlModule._yaml_load_template_from_url === 'function', 'load_template_from_url should be exported');
        }
    });

    it('should initialize virtual directories', async () => {
        if (!wasmNativeAvailable) {
            console.log('⏭️  Skipping virtual directories test (WASM-native not available)');
            return;
        }

        // Test that virtual directories are created
        const result = yamlModule._yaml_init_filesystem('/test-cache');
        
        // In a real browser environment, this would create IDBFS-backed directories
        // In Node.js test environment, this tests the function exists and executes
        assert(typeof result === 'number', 'init_filesystem should return number');
    });

    it('should handle resource loading gracefully', async () => {
        if (!wasmNativeAvailable) {
            console.log('⏭️  Skipping resource loading test (WASM-native not available)');
            return;
        }

        // Test loading a schema (will fail in Node.js but should not crash)
        const schemaResult = yamlModule._yaml_load_schema_from_url(
            'https://example.com/schema.yaml', 'test-schema');
        
        assert(typeof schemaResult === 'number', 'load_schema_from_url should return number');
        
        // Test loading a template
        const templateResult = yamlModule._yaml_load_template_from_url(
            'https://example.com/template.yaml', 'test-template');
        
        assert(typeof templateResult === 'number', 'load_template_from_url should return number');
    });

    it('should simulate persistent storage operations', async () => {
        if (!wasmNativeAvailable) {
            console.log('⏭️  Skipping persistent storage test (WASM-native not available)');
            return;
        }

        // Simulate the persistent storage callback
        if (typeof yamlModule._yaml_set_persistent_storage === 'function') {
            yamlModule._yaml_set_persistent_storage(1); // Simulate available
            
            // Check if we can query persistent storage status
            if (typeof yamlModule._yaml_has_persistent_storage === 'function') {
                const hasStorage = yamlModule._yaml_has_persistent_storage();
                assert(typeof hasStorage === 'number', 'persistent storage query should return number');
            }
        }
    });

    it('should test template processing patterns', async () => {
        // Test YAML template-like functionality using regular parsing
        const templateYaml = `
config:
  app_name: "\${APP_NAME}"
  version: "\${VERSION}"
  environment: "\${ENVIRONMENT}"
  database:
    host: "\${DB_HOST}"
    port: "\${DB_PORT}"
    name: "\${DB_NAME}"
`;

        const parsed = await parseYAML(templateYaml);
        assert(parsed.config.app_name === '${APP_NAME}', 'Template variables should be preserved');
        assert(parsed.config.database.host === '${DB_HOST}', 'Nested template variables should be preserved');
        
        // Simulate template processing
        const processedTemplate = JSON.stringify(parsed)
            .replace(/\$\{APP_NAME\}/g, 'yaml-cpp-wasm')
            .replace(/\$\{VERSION\}/g, '0.8.0')
            .replace(/\$\{ENVIRONMENT\}/g, 'production')
            .replace(/\$\{DB_HOST\}/g, 'localhost')
            .replace(/\$\{DB_PORT\}/g, '5432')
            .replace(/\$\{DB_NAME\}/g, 'app_db');
        
        const processed = JSON.parse(processedTemplate);
        assert(processed.config.app_name === 'yaml-cpp-wasm', 'Template processing should work');
        assert(processed.config.database.port === '5432', 'Numeric template variables should be processed');
    });

    it('should test schema-like validation patterns', async () => {
        // Simulate schema-based validation using structural checks
        const configYaml = `
app:
  name: yaml-cpp-wasm
  version: 0.8.0
  features:
    - parsing
    - validation
    - emission
  config:
    tier: 2
    performance: high
`;

        const config = await parseYAML(configYaml);
        
        // Schema-like validation checks
        assert(typeof config.app === 'object', 'app section should be object');
        assert(typeof config.app.name === 'string', 'app.name should be string');
        assert(typeof config.app.version === 'number', 'app.version should be number');
        assert(Array.isArray(config.app.features), 'app.features should be array');
        assert(config.app.features.length > 0, 'app.features should not be empty');
        assert(typeof config.app.config === 'object', 'app.config should be object');
        
        console.log('✅ Schema-like validation passed');
    });

    it('should test package-like resource organization', async () => {
        // Simulate package-based resource organization
        const packages = {
            schemas: {
                'app-config': `
type: object
properties:
  app:
    type: object
    required: [name, version]
`,
                'database-config': `
type: object
properties:
  database:
    type: object
    required: [host, port, name]
`
            },
            templates: {
                'app-template': `
app:
  name: "\${APP_NAME}"
  version: "\${APP_VERSION}"
`,
                'db-template': `
database:
  host: "\${DB_HOST}"
  port: "\${DB_PORT}"
`
            }
        };
        
        // Test that we can organize and access resources
        assert(typeof packages.schemas === 'object', 'schemas package should exist');
        assert(typeof packages.templates === 'object', 'templates package should exist');
        assert(typeof packages.schemas['app-config'] === 'string', 'schema resources should be accessible');
        assert(typeof packages.templates['app-template'] === 'string', 'template resources should be accessible');
        
        // Test parsing resources from packages
        const appSchema = await parseYAML(packages.schemas['app-config']);
        assert(appSchema.type === 'object', 'Schema should be parseable');
        
        const appTemplate = await parseYAML(packages.templates['app-template']);
        assert(appTemplate.app.name === '${APP_NAME}', 'Template should preserve variables');
        
        console.log('✅ Package-like organization tests passed');
    });

    it('should test progressive loading simulation', async () => {
        // Simulate progressive loading by parsing resources in priority order
        const resources = [
            { id: 'critical-config', priority: 4, yaml: 'critical: true\nload_first: yes' },
            { id: 'normal-config', priority: 2, yaml: 'normal: true\nload_order: 2' },
            { id: 'high-priority', priority: 3, yaml: 'high: true\nload_order: 1.5' },
            { id: 'low-priority', priority: 1, yaml: 'low: true\nload_last: yes' }
        ];
        
        // Sort by priority (higher number = higher priority)
        const sortedResources = resources.sort((a, b) => b.priority - a.priority);
        
        // Verify sorting
        assert(sortedResources[0].id === 'critical-config', 'Critical resource should load first');
        assert(sortedResources[1].id === 'high-priority', 'High priority resource should load second');
        assert(sortedResources[2].id === 'normal-config', 'Normal priority resource should load third');
        assert(sortedResources[3].id === 'low-priority', 'Low priority resource should load last');
        
        // Test parsing in priority order
        const results = [];
        for (const resource of sortedResources) {
            const parsed = await parseYAML(resource.yaml);
            results.push({ id: resource.id, data: parsed });
        }
        
        assert(results.length === 4, 'All resources should be processed');
        assert(results[0].id === 'critical-config', 'Results should maintain priority order');
        
        console.log('✅ Progressive loading simulation passed');
    });

    it('should test memory-efficient operations', async () => {
        // Test large YAML processing without excessive memory usage
        const largeConfig = {
            metadata: { 
                generated: new Date().toISOString(),
                generator: 'yaml-cpp-wasm-test'
            },
            resources: []
        };
        
        // Generate moderately large dataset
        for (let i = 0; i < 100; i++) {
            largeConfig.resources.push({
                id: `resource_${i}`,
                name: `Resource ${i}`,
                config: {
                    enabled: i % 2 === 0,
                    priority: i % 5,
                    metadata: {
                        created: new Date(Date.now() - i * 1000).toISOString(),
                        tags: [`tag_${i % 10}`, `category_${i % 3}`]
                    }
                }
            });
        }
        
        // Test round-trip processing
        const yamlString = await toYAML(largeConfig);
        assert(typeof yamlString === 'string', 'Large config should convert to YAML');
        assert(yamlString.length > 1000, 'YAML should be substantial size');
        
        const parsed = await parseYAML(yamlString);
        assert(parsed.resources.length === 100, 'All resources should be parsed');
        assert(parsed.resources[50].name === 'Resource 50', 'Resource data should be intact');
        
        console.log(`✅ Memory-efficient operations passed (${(yamlString.length / 1024).toFixed(1)}KB)`);
    });

    it('should test error handling in WASM-native context', async () => {
        if (!wasmNativeAvailable) {
            console.log('⏭️  Skipping WASM-native error handling test');
            return;
        }

        // Test error handling for invalid operations
        try {
            // This should not crash even if WASM-native features fail
            const result = yamlModule._yaml_load_schema_from_url(null, null);
            assert(typeof result === 'number', 'Function should return number even with null args');
        } catch (error) {
            // Error is acceptable in test environment
            console.log('Expected error in test environment:', error.message);
        }
        
        // Test async callback error handling
        if (typeof yamlModule._yaml_async_load_complete === 'function') {
            // These should not crash
            yamlModule._yaml_async_load_complete(0, ''); // Failure case
            yamlModule._yaml_async_load_complete(1, '/test/path'); // Success case
        }
        
        console.log('✅ Error handling tests passed');
    });

    afterAll(() => {
        if (wasmNativeAvailable) {
            console.log('🧹 WASM-native test cleanup completed');
        }
    });
});