const fs = require('fs');
const path = require('path');
const config = require('../../src/core/config');
const llm = require('../../src/llm/client');
const languageProfiles = require('../../src/languages/profile');

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined)
  },
  readFileSync: jest.fn(),
  writeFileSync: jest.fn()
}));

jest.mock('../../src/core/config');
jest.mock('../../src/llm/client');
jest.mock('../../src/languages/profile');

describe('CLI Module', () => {
  let cli;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Clear require cache to reload CLI module
    delete require.cache[require.resolve('../../src/cli/index.js')];
    
    // Reset config mock
    config.config = {
      llm: { provider: 'openai', model: 'gpt-4' },
      languages: { javascript: {} },
      paths: { services: './services', templates: './templates' }
    };
    
    // Reset LLM mock
    llm.analyzeRequirements = jest.fn();
    llm.decomposeService = jest.fn();
    llm.generateCode = jest.fn();

    // Load CLI module fresh
    cli = require('../../src/cli/index.js');
  });
  
  test('CLI initializes with correct version and description', () => {
    expect(cli.program.description()).toContain('PolyFunc');
  });
  
  test('init command creates directories and configuration file', async () => {
    await cli.handlers.init();
    
    expect(fs.promises.mkdir).toHaveBeenCalledWith('./services', { recursive: true });
    expect(fs.promises.mkdir).toHaveBeenCalledWith('./templates', { recursive: true });
    expect(fs.promises.writeFile).toHaveBeenCalledWith(
      './polyfunc.json',
      expect.any(String),
      'utf8'
    );
  });
  
  test('analyze command calls LLM and finds best language', async () => {
    const requirements = {
      useCase: 'api',
      requirements: { performance: { importance: 8, weight: 0.8 } }
    };
    llm.analyzeRequirements.mockResolvedValueOnce(requirements);
    languageProfiles.findBestLanguageForRequirements.mockReturnValueOnce({
      language: 'javascript',
      score: 0.85,
      profile: {}
    });
    
    await cli.handlers.analyze('Create an API service');
    
    expect(llm.analyzeRequirements).toHaveBeenCalledWith('Create an API service');
    expect(languageProfiles.findBestLanguageForRequirements).toHaveBeenCalledWith(requirements);
  });
  
  test('decompose command calls LLM', async () => {
    llm.decomposeService.mockResolvedValueOnce([
      { name: 'service1', purpose: 'Authentication' }
    ]);
    
    await cli.handlers.decompose('Build an e-commerce platform');
    
    expect(llm.decomposeService).toHaveBeenCalledWith('Build an e-commerce platform');
  });
  
  test('create command generates code with auto-selected language', async () => {
    const requirements = {
      useCase: 'api',
      requirements: { performance: { importance: 8, weight: 0.8 } }
    };
    llm.analyzeRequirements.mockResolvedValueOnce(requirements);
    languageProfiles.findBestLanguageForRequirements.mockReturnValueOnce({
      language: 'javascript',
      score: 0.85,
      profile: {}
    });
    llm.generateCode.mockResolvedValueOnce({
      files: [{ filename: 'index.js', content: 'console.log("API");' }],
      instructions: 'Run with node index.js',
      dependencies: ['express']
    });
    
    await cli.handlers.create('Create an API service', {});
    
    expect(llm.analyzeRequirements).toHaveBeenCalledWith('Create an API service');
    expect(llm.generateCode).toHaveBeenCalledWith('javascript', 'service', 'Create an API service');
    expect(fs.promises.mkdir).toHaveBeenCalledWith(expect.stringContaining('javascript-service'), { recursive: true });
    expect(fs.promises.writeFile).toHaveBeenCalledTimes(2); // One for the file, one for README.md
  });
  
  test('create command uses specified language when provided', async () => {
    const requirements = {
      useCase: 'api',
      requirements: { performance: { importance: 8, weight: 0.8 } }
    };
    llm.analyzeRequirements.mockResolvedValueOnce(requirements);
    llm.generateCode.mockResolvedValueOnce({
      files: [{ filename: 'main.go', content: 'package main' }],
      instructions: 'Run with go run main.go',
      dependencies: ['gin']
    });
    
    await cli.handlers.create('Create an API service', { language: 'go' });
    
    expect(llm.analyzeRequirements).toHaveBeenCalledWith('Create an API service');
    expect(llm.generateCode).toHaveBeenCalledWith('go', 'service', 'Create an API service');
    expect(fs.promises.mkdir).toHaveBeenCalledWith(expect.stringContaining('go-service'), { recursive: true });
  });
});