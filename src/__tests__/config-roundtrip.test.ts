/**
 * Property-based tests for configuration round-trip preservation
 * Feature: ai-code-reviewer, Property 1: Configuration Round-Trip Preservation
 * Validates: Requirements 13.4
 */

import * as fc from 'fast-check';
import { ConfigurationSchema, ConfigurationType } from '../schemas';
import * as yaml from 'js-yaml';

/**
 * Serialize a Configuration object to YAML string
 */
function formatConfiguration(config: ConfigurationType): string {
  return yaml.dump(config, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });
}

/**
 * Parse a YAML string to a Configuration object
 */
function parseConfiguration(yamlString: string): ConfigurationType {
  const parsed = yaml.load(yamlString);
  return ConfigurationSchema.parse(parsed);
}

/**
 * fast-check arbitrary for generating valid Configuration objects
 */
const configurationArbitrary: fc.Arbitrary<ConfigurationType> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.string({ minLength: 1, maxLength: 500 }),
  inputs: fc.dictionary(
    fc.string({ minLength: 1, maxLength: 50 }),
    fc.record({
      description: fc.string({ minLength: 1, maxLength: 200 }),
      required: fc.option(fc.boolean(), { nil: undefined }),
      default: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
    })
  ),
  runs: fc.record({
    using: fc.string({ minLength: 1, maxLength: 20 }),
    main: fc.string({ minLength: 1, maxLength: 100 }),
  }),
});

describe('Configuration Round-Trip Preservation', () => {
  /**
   * Property 1: Configuration Round-Trip Preservation
   * 
   * For any valid Configuration object, serializing to YAML then parsing back
   * to an object SHALL produce an equivalent Configuration.
   * 
   * **Validates: Requirements 13.4**
   */
  it('should preserve configuration through YAML round-trip', () => {
    fc.assert(
      fc.property(configurationArbitrary, (config) => {
        // Serialize to YAML
        const yamlString = formatConfiguration(config);
        
        // Parse back to object
        const parsed = parseConfiguration(yamlString);
        
        // Should be equivalent to original
        expect(parsed).toEqual(config);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify that the round-trip preserves all field types
   */
  it('should preserve field types through round-trip', () => {
    fc.assert(
      fc.property(configurationArbitrary, (config) => {
        const yamlString = formatConfiguration(config);
        const parsed = parseConfiguration(yamlString);
        
        // Verify types are preserved
        expect(typeof parsed.name).toBe('string');
        expect(typeof parsed.description).toBe('string');
        expect(typeof parsed.inputs).toBe('object');
        expect(typeof parsed.runs).toBe('object');
        expect(typeof parsed.runs.using).toBe('string');
        expect(typeof parsed.runs.main).toBe('string');
        
        // Verify input field types
        for (const [key, value] of Object.entries(parsed.inputs)) {
          expect(typeof key).toBe('string');
          expect(typeof value.description).toBe('string');
          if (value.required !== undefined) {
            expect(typeof value.required).toBe('boolean');
          }
          if (value.default !== undefined) {
            expect(typeof value.default).toBe('string');
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify round-trip with realistic action.yml structure
   */
  it('should handle realistic action.yml configurations', () => {
    const realisticConfig: ConfigurationType = {
      name: 'AI Code Reviewer',
      description: 'Automatically review pull requests using LLMs',
      inputs: {
        github_token: {
          description: 'GitHub token for API access',
          required: true,
        },
        anthropic_api_key: {
          description: 'Anthropic API key',
          required: false,
        },
        openai_api_key: {
          description: 'OpenAI API key',
          required: false,
        },
        model: {
          description: 'LLM model to use',
          required: false,
          default: 'claude-3-5-sonnet-20241022',
        },
        max_files: {
          description: 'Maximum number of files to review',
          required: false,
          default: '50',
        },
        severity_threshold: {
          description: 'Minimum severity level to report',
          required: false,
          default: 'suggestion',
        },
      },
      runs: {
        using: 'node20',
        main: 'dist/index.js',
      },
    };

    const yamlString = formatConfiguration(realisticConfig);
    const parsed = parseConfiguration(yamlString);
    
    expect(parsed).toEqual(realisticConfig);
  });

  /**
   * Edge case: Empty inputs object
   */
  it('should handle configuration with empty inputs', () => {
    const config: ConfigurationType = {
      name: 'Test Action',
      description: 'Test description',
      inputs: {},
      runs: {
        using: 'node20',
        main: 'index.js',
      },
    };

    const yamlString = formatConfiguration(config);
    const parsed = parseConfiguration(yamlString);
    
    expect(parsed).toEqual(config);
  });

  /**
   * Edge case: Inputs with only required fields
   */
  it('should handle inputs with minimal fields', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string({ minLength: 1 }),
          description: fc.string({ minLength: 1 }),
          inputs: fc.dictionary(
            fc.string({ minLength: 1 }),
            fc.record({
              description: fc.string({ minLength: 1 }),
            })
          ),
          runs: fc.record({
            using: fc.string({ minLength: 1 }),
            main: fc.string({ minLength: 1 }),
          }),
        }),
        (config) => {
          const yamlString = formatConfiguration(config);
          const parsed = parseConfiguration(yamlString);
          expect(parsed).toEqual(config);
        }
      ),
      { numRuns: 100 }
    );
  });
});
