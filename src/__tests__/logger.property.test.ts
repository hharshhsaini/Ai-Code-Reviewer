/**
 * Property-based tests for Logger
 * Feature: ai-code-reviewer
 */

import * as fc from 'fast-check';
import * as core from '@actions/core';
import { Logger } from '../logger';

// Mock @actions/core
jest.mock('@actions/core');

describe('Logger Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Property 21: Error Logging Completeness
  // **Validates: Requirements 10.5**
  describe('Property 21: Error Logging Completeness', () => {
    it('should log all errors with descriptive messages to GitHub Actions console', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }), // category
          fc.string({ minLength: 1, maxLength: 200 }), // message
          fc.option(fc.object(), { nil: undefined }), // context
          fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }), // action
          (category, message, context, action) => {
            // Call error logging
            Logger.error(category, message, context, action);

            // Verify core.error was called
            expect(core.error).toHaveBeenCalledTimes(1);

            // Get the logged message
            const loggedMessage = (core.error as jest.Mock).mock.calls[0][0];

            // Verify the message contains all required components
            expect(loggedMessage).toContain('[AI Code Reviewer]');
            expect(loggedMessage).toContain('ERROR:');
            expect(loggedMessage).toContain(category);
            expect(loggedMessage).toContain('Message:');
            expect(loggedMessage).toContain(message);

            // Verify context is included if provided
            if (context !== undefined) {
              expect(loggedMessage).toContain('Context:');
              expect(loggedMessage).toContain(JSON.stringify(context, null, 2));
            }

            // Verify action is included if provided
            if (action !== undefined) {
              expect(loggedMessage).toContain('Action:');
              expect(loggedMessage).toContain(action);
            }

            // Clear mock for next iteration
            jest.clearAllMocks();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should log errors with structured format for all error types', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'Authentication',
            'Rate Limit',
            'API Error',
            'Validation',
            'Mapping',
            'Resource'
          ),
          fc.string({ minLength: 10, maxLength: 200 }),
          (category, message) => {
            Logger.error(category, message);

            expect(core.error).toHaveBeenCalledTimes(1);
            const loggedMessage = (core.error as jest.Mock).mock.calls[0][0];

            // Verify structured format
            expect(loggedMessage).toMatch(/\[AI Code Reviewer\] ERROR: .+\nMessage: .+/);
            expect(loggedMessage).toContain(category);
            expect(loggedMessage).toContain(message);

            jest.clearAllMocks();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle errors with complex context objects', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.record({
            statusCode: fc.integer({ min: 400, max: 599 }),
            endpoint: fc.string(),
            response: fc.object(),
          }),
          (category, message, context) => {
            Logger.error(category, message, context);

            expect(core.error).toHaveBeenCalledTimes(1);
            const loggedMessage = (core.error as jest.Mock).mock.calls[0][0];

            // Verify context is properly serialized
            expect(loggedMessage).toContain('Context:');
            expect(loggedMessage).toContain(JSON.stringify(context, null, 2));

            jest.clearAllMocks();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
