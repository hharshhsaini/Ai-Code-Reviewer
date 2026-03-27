/**
 * Basic setup test to verify Jest configuration
 */

describe('Setup', () => {
  it('should run tests', () => {
    expect(true).toBe(true);
  });

  it('should have TypeScript support', () => {
    const value: string = 'test';
    expect(typeof value).toBe('string');
  });
});
