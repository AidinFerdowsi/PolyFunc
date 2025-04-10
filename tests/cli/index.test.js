const commander = require('commander');
const fs = require('fs').promises;
const config = require('../../src/core/config');
const llm = require('../../src/llm/client');
const languageProfiles = require('../../src/languages/profile');
const path = require('path');

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(),
    writeFile: jest.fn().mockResolvedValue()
  }
}));

jest.mock('../../src/core/config');
jest.mock('../../src/llm/client');
jest.mock('../../src/languages/profile');

// Mock commander more accurately to capture command registrations
jest.mock('commander', () => {
  const actionMock = jest.fn().mockReturnThis();
  const descriptionMock = jest.fn().mockReturnThis();
  const optionMock = jest.fn().mockReturnThis();
  
  const mockCommand = {
    action: actionMock,
    description: descriptionMock,
    option: optionMock
  };
  
  // Store all registered commands with their handlers
  const commands = {};
  
  const mockProgram = {
    version: jest.fn().mockReturnThis(),
    description: jest.fn().mockReturnThis(),
    command: jest.fn().mockImplementation((name) => {
      commands[name] = { ...mockCommand };
      return commands[name];
    }),
    parse: jest.fn(),
    outputHelp: jest.fn(),
    commands: commands // Store commands for testing
  };
  
  return {
    Command: jest.fn().mockImplementation(() => mockProgram),
    mockProgram,
    commands
  };
});

describe('CLI Module', () => {
  let cli;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the commands
    commander.commands = {};
    
    // Clear the require cache to reload the CLI module
    delete require.cache[require.resolve('../../src/cli/index.js')];
    
    // Set up config mock
    config.config = {
      llm: { provider: 'openai', model: 'gpt-4' },
      languages: { javascript: {} },
      paths: { services: './services', templates: './templates' }
    };
    
    // Set up llm mock
    llm.analyzeRequirements = jest.fn();
    llm.decomposeService = jest.fn();
    llm.generateCode = jest.fn();
  });
  
  test('CLI initializes with correct version and description', () => {
    // Load the CLI module
    cli = require('../../src/cli/index.js');
    
    expect(commander.mockProgram.version).toHaveBeenCalledWith('0.1.0');
    expect(commander.mockProgram.description).toHaveBeenCalledWith(expect.stringContaining('PolyFunc'));
  });
  
  test('init command creates directories and configuration file', async () => {
    // Load the CLI module to register commands
    cli = require('../../src/cli/index.js');
    
    // Access the registered init command and its action
    const initCommand = commander.commands['init'];
    expect(initCommand).toBeDefined();
    
    // Get the init command action handler (first argument to the action method)
    const handler = initCommand.action.mock.calls[0][0];
    expect(handler).toBeDefined();
    
    // Call the action handler
    await handler();
    
    // Verify directories were created
    expect(fs.promises.mkdir).toHaveBeenCalledWith('./services', { recursive: true });
    expect(fs.promises.mkdir).toHaveBeenCalledWith('./templates', { recursive: true });
    
    // Verify config file was created
    expect(fs.promises.writeFile).toHaveBeenCalledWith(
      './polyfunc.json',
      expect.any(String),
      'utf8'
    );
  });
  
  test('analyze command calls LLM and finds best language', async () => {
    // Setup mocks
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
    
    cli = require('../../src/cli/index.js');
    
    // Access the registered analyze command and its action
    const analyzeCommand = commander.commands['analyze'];
    expect(analyzeCommand).toBeDefined();
    
    // Get the analyze command action handler
    const handler = analyzeCommand.action.mock.calls[0][0];
    expect(handler).toBeDefined();
    
    // Call the action handler
    await handler('Create an API service');
    
    // Verify LLM was called with correct description
    expect(llm.analyzeRequirements).toHaveBeenCalledWith('Create an API service');
    
    // Verify language profiles were checked
    expect(languageProfiles.findBestLanguageForRequirements).toHaveBeenCalledWith(requirements);
  });
  
  test('decompose command calls LLM', async () => {
    // Setup mocks
    llm.decomposeService.mockResolvedValueOnce([
      { name: 'service1', purpose: 'Authentication' }
    ]);
    
    cli = require('../../src/cli/index.js');
    
    // Access the registered decompose command and its action
    const decomposeCommand = commander.commands['decompose'];
    expect(decomposeCommand).toBeDefined();
    
    // Get the decompose command action handler
    const handler = decomposeCommand.action.mock.calls[0][0];
    expect(handler).toBeDefined();
    
    // Call the action handler
    await handler('Build an e-commerce platform');
    
    // Verify LLM was called with correct description
    expect(llm.decomposeService).toHaveBeenCalledWith('Build an e-commerce platform');
  });
  
  test('create command generates code with auto-selected language', async () => {
    // Setup mocks
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
    
    cli = require('../../src/cli/index.js');
    
    // Access the registered create command and its action
    const createCommand = commander.commands['create'];
    expect(createCommand).toBeDefined();
    
    // Get the create command action handler
    const handler = createCommand.action.mock.calls[0][0];
    expect(handler).toBeDefined();
    
    // Call the action handler with no language option
    await handler('Create an API service', {});
    
    // Verify LLM was called with correct parameters
    expect(llm.analyzeRequirements).toHaveBeenCalledWith('Create an API service');
    expect(llm.generateCode).toHaveBeenCalledWith('javascript', 'service', 'Create an API service');
    
    // Verify directories and files were created
    expect(fs.promises.mkdir).toHaveBeenCalledWith(expect.stringContaining('javascript-service'), { recursive: true });
    expect(fs.promises.writeFile).toHaveBeenCalledTimes(2); // One for the file, one for README.md
  });
  
  test('create command uses specified language when provided', async () => {
    // Setup mocks
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
    
    cli = require('../../src/cli/index.js');
    
    // Access the registered create command and its action
    const createCommand = commander.commands['create'];
    expect(createCommand).toBeDefined();
    
    // Get the create command action handler
    const handler = createCommand.action.mock.calls[0][0];
    expect(handler).toBeDefined();
    
    // Call the action handler with language option
    await handler('Create an API service', { language: 'go' });
    
    // Verify LLM was still called for requirements analysis
    expect(llm.analyzeRequirements).toHaveBeenCalledWith('Create an API service');
    
    // Verify code was generated with the specified language
    expect(llm.generateCode).toHaveBeenCalledWith('go', 'service', 'Create an API service');
    
    // Verify directories and files were created for the right language
    expect(fs.promises.mkdir).toHaveBeenCalledWith(expect.stringContaining('go-service'), { recursive: true });
  });
});