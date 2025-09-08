/**
 * Basic functionality tests for yaml-cpp.wasm
 * Comprehensive testing for YAML parsing functionality
 */

import { describe, it, beforeAll } from 'node:test';
import assert from 'node:assert';
import { parseYAML, validateYAML, toYAML, init } from '../../dist/yaml-cpp.mjs';

describe('yaml-cpp.wasm Basic Tests', () => {
    beforeAll(async () => {
        await init();
    });

    it('should initialize WASM module', async () => {
        const module = await init();
        assert(module, 'Module should be initialized');
    });

    it('should parse simple YAML string', async () => {
        const yaml = 'key: value\nnumber: 42\nboolean: true';
        const result = await parseYAML(yaml);
        
        assert.strictEqual(result.key, 'value');
        assert.strictEqual(result.number, 42);
        assert.strictEqual(result.boolean, true);
    });

    it('should parse nested YAML objects', async () => {
        const yaml = `
database:
  host: localhost
  port: 5432
  credentials:
    user: admin
    password: secret
`;
        const result = await parseYAML(yaml);
        
        assert.strictEqual(result.database.host, 'localhost');
        assert.strictEqual(result.database.port, 5432);
        assert.strictEqual(result.database.credentials.user, 'admin');
        assert.strictEqual(result.database.credentials.password, 'secret');
    });

    it('should parse YAML arrays', async () => {
        const yaml = `
servers:
  - web1.example.com
  - web2.example.com
  - database.example.com
ports:
  - 80
  - 443
  - 5432
`;
        const result = await parseYAML(yaml);
        
        assert(Array.isArray(result.servers));
        assert.strictEqual(result.servers.length, 3);
        assert.strictEqual(result.servers[0], 'web1.example.com');
        
        assert(Array.isArray(result.ports));
        assert.strictEqual(result.ports.length, 3);
        assert.strictEqual(result.ports[0], 80);
    });

    it('should validate correct YAML', async () => {
        const validYaml = 'key: value\nnumber: 42';
        const isValid = await validateYAML(validYaml);
        assert.strictEqual(isValid, true);
    });

    it('should detect invalid YAML', async () => {
        const invalidYaml = 'key: value\n  invalid_indentation: true';
        const isValid = await validateYAML(invalidYaml);
        assert.strictEqual(isValid, false);
    });

    it('should handle empty YAML', async () => {
        const emptyYaml = '';
        const result = await parseYAML(emptyYaml);
        assert(result === null || typeof result === 'object');
    });

    it('should handle YAML with comments', async () => {
        const yamlWithComments = `
# Configuration file
app:
  name: MyApp  # Application name
  version: 1.0 # Version number
  debug: true  # Enable debugging
`;
        const result = await parseYAML(yamlWithComments);
        
        assert.strictEqual(result.app.name, 'MyApp');
        assert.strictEqual(result.app.version, 1.0);
        assert.strictEqual(result.app.debug, true);
    });

    it('should handle multi-line strings', async () => {
        const yamlWithMultiline = `
description: |
  This is a multi-line
  string that preserves
  line breaks.
summary: >
  This is a folded
  string that folds
  line breaks into spaces.
`;
        const result = await parseYAML(yamlWithMultiline);
        
        assert(result.description.includes('\n'));
        assert(!result.summary.includes('\n'));
    });

    it('should handle special characters and escapes', async () => {
        const yamlWithSpecials = `
special:
  quote: "He said \\"Hello\\""
  path: "C:\\\\Users\\\\test"
  unicode: "Unicode: \\u2603"
`;
        const result = await parseYAML(yamlWithSpecials);
        
        assert(result.special.quote.includes('"'));
        assert(result.special.path.includes('\\'));
    });

    it('should convert JavaScript object to YAML', async () => {
        const obj = {
            name: 'test',
            number: 123,
            nested: {
                array: [1, 2, 3],
                boolean: false
            }
        };
        
        const yamlString = await toYAML(obj);
        assert(typeof yamlString === 'string');
        assert(yamlString.includes('name:'));
        assert(yamlString.includes('123'));
        
        // Verify round-trip
        const parsed = await parseYAML(yamlString);
        assert.strictEqual(parsed.name, obj.name);
        assert.strictEqual(parsed.number, obj.number);
        assert.deepStrictEqual(parsed.nested.array, obj.nested.array);
    });

    it('should handle large YAML documents', async () => {
        // Generate a large YAML document
        const largeObj = {};
        for (let i = 0; i < 1000; i++) {
            largeObj[`key_${i}`] = {
                index: i,
                value: `value_${i}`,
                array: [i, i+1, i+2]
            };
        }
        
        const yamlString = await toYAML(largeObj);
        const parsed = await parseYAML(yamlString);
        
        assert.strictEqual(Object.keys(parsed).length, 1000);
        assert.strictEqual(parsed.key_500.index, 500);
        assert.strictEqual(parsed.key_999.value, 'value_999');
    });

    it('should handle YAML with various data types', async () => {
        const yaml = `
string_value: "hello"
integer_value: 42
float_value: 3.14159
boolean_true: true
boolean_false: false
null_value: null
date_value: 2023-12-25
`;
        const result = await parseYAML(yaml);
        
        assert.strictEqual(typeof result.string_value, 'string');
        assert.strictEqual(typeof result.integer_value, 'number');
        assert.strictEqual(typeof result.float_value, 'number');
        assert.strictEqual(typeof result.boolean_true, 'boolean');
        assert.strictEqual(typeof result.boolean_false, 'boolean');
        assert.strictEqual(result.null_value, null);
    });
});