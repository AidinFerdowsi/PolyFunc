const languageProfiles = require('../../src/languages/profile');
const { LanguageProfile, profiles, findBestLanguageForRequirements } = languageProfiles;

describe('Language Profile Module', () => {
  test('LanguageProfile class should initialize with default values', () => {
    const profile = new LanguageProfile('test');
    
    expect(profile.name).toBe('test');
    expect(profile.characteristics.performance).toBe(5);
    expect(profile.characteristics.memory).toBe(5);
    expect(profile.characteristics.startupTime).toBe(5);
    expect(profile.characteristics.ecosystem).toBe(5);
    expect(profile.characteristics.concurrency).toBe(5);
    expect(profile.useCases).toEqual([]);
    expect(profile.libraries).toEqual({});
  });

  test('LanguageProfile should accept custom characteristics', () => {
    const profile = new LanguageProfile('custom', {
      performance: 8,
      memory: 7,
      startupTime: 9
    });
    
    expect(profile.characteristics.performance).toBe(8);
    expect(profile.characteristics.memory).toBe(7);
    expect(profile.characteristics.startupTime).toBe(9);
    expect(profile.characteristics.ecosystem).toBe(5); // Default value
  });

  test('addUseCase should add use cases with scores', () => {
    const profile = new LanguageProfile('test');
    
    profile.addUseCase('web', 8);
    profile.addUseCase('api', 7);
    
    expect(profile.useCases).toHaveLength(2);
    expect(profile.useCases[0]).toEqual({ name: 'web', score: 8 });
    expect(profile.useCases[1]).toEqual({ name: 'api', score: 7 });
  });

  test('addLibrary should add libraries with purpose and maturity', () => {
    const profile = new LanguageProfile('test');
    
    profile.addLibrary('express', 'web server', 9);
    profile.addLibrary('axios', 'http client', 8);
    
    expect(Object.keys(profile.libraries)).toHaveLength(2);
    expect(profile.libraries.express).toEqual({ purpose: 'web server', maturity: 9 });
    expect(profile.libraries.axios).toEqual({ purpose: 'http client', maturity: 8 });
  });

  test('matches should calculate score based on requirements', () => {
    const profile = new LanguageProfile('test', {
      performance: 8,
      memory: 7,
      ecosystem: 9
    });
    
    profile.addUseCase('web', 10);
    
    const requirements = {
      performance: { weight: 1 },
      memory: { weight: 0.5 },
      ecosystem: { weight: 0.8 },
      useCase: 'web',
      useCaseWeight: 2
    };
    
    const score = profile.matches(requirements);
    
    // Expected calculation: 
    // (8*1 + 7*0.5 + 9*0.8 + 10*2) / (1 + 0.5 + 0.8 + 2)
    // = (8 + 3.5 + 7.2 + 20) / 4.3
    // = 38.7 / 4.3
    // = 9
    expect(score).toBeCloseTo(9, 1);
  });

  test('matches should handle missing requirements', () => {
    const profile = new LanguageProfile('test', {
      performance: 8,
      memory: 7
    });
    
    const score = profile.matches({});
    
    expect(score).toBe(0);
  });

  test('matches should handle unknown use cases', () => {
    const profile = new LanguageProfile('test');
    profile.addUseCase('web', 9);
    
    const score = profile.matches({
      useCase: 'unknown',
      useCaseWeight: 1
    });
    
    expect(score).toBe(0);
  });

  test('toJSON should return a serializable representation', () => {
    const profile = new LanguageProfile('test');
    profile.addUseCase('web', 9);
    profile.addLibrary('express', 'web server', 8);
    
    const json = profile.toJSON();
    
    expect(json).toEqual({
      name: 'test',
      characteristics: {
        performance: 5,
        memory: 5,
        startupTime: 5,
        ecosystem: 5,
        concurrency: 5
      },
      useCases: [{ name: 'web', score: 9 }],
      libraries: {
        express: { purpose: 'web server', maturity: 8 }
      }
    });
  });

  test('findBestLanguageForRequirements should return the best match', () => {
    const requirements = {
      performance: { weight: 1 },
      concurrency: { weight: 1 },
      useCase: 'system'
    };
    
    const result = languageProfiles.findBestLanguageForRequirements(requirements);
    
    expect(result.language).toBe('rust');
    expect(result.profile).toBe(profiles.rust);
    expect(result.score).toBeGreaterThan(0);
  });

  test('predefined language profiles should exist', () => {
    expect(profiles.javascript).toBeDefined();
    expect(profiles.python).toBeDefined();
    expect(profiles.go).toBeDefined();
    expect(profiles.rust).toBeDefined();
  });
  
  test('each language should have appropriate characteristics', () => {
    // JavaScript should be strong for web and API use cases
    expect(profiles.javascript.characteristics.ecosystem).toBeGreaterThan(7);
    
    // Python should be strong for data and ML
    const pythonDataUseCase = profiles.python.useCases.find(uc => uc.name === 'data');
    const pythonMlUseCase = profiles.python.useCases.find(uc => uc.name === 'ml');
    expect(pythonDataUseCase.score).toBeGreaterThan(7);
    expect(pythonMlUseCase.score).toBeGreaterThan(7);
    
    // Go should be strong for concurrency
    expect(profiles.go.characteristics.concurrency).toBeGreaterThan(8);
    
    // Rust should be strong for performance
    expect(profiles.rust.characteristics.performance).toBeGreaterThan(8);
  });
});