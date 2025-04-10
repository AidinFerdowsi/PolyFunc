const fs = require('fs');
const path = require('path');
const config = require('../../src/core/config');

// Mock fs module
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn()
}));

describe('Config Module', () => {
  beforeEach(() => {
    // Reset the config to its default state
    config.config = {
      llm: {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: process.env.OPENAI_API_KEY,
      },
      languages: {
        javascript: { priority: 1, useCase: ['web', 'api'] },
        python: { priority: 2, useCase: ['data', 'ml'] },
        go: { priority: 3, useCase: ['performance', 'concurrency'] },
        rust: { priority: 4, useCase: ['system', 'performance'] },
      },
      paths: {
        services: './services',
        templates: './templates',
      }
    };
    // Clear all mock data
    jest.clearAllMocks();
  });

  test('get should retrieve nested properties correctly', () => {
    expect(config.get('llm.provider')).toBe('openai');
    expect(config.get('languages.javascript.priority')).toBe(1);
    expect(config.get('paths.services')).toBe('./services');
    expect(config.get('nonexistent')).toBeUndefined();
    expect(config.get('languages.nonexistent')).toBeUndefined();
  });

  test('set should set nested properties correctly', () => {
    config.set('llm.model', 'gpt-3.5-turbo');
    expect(config.get('llm.model')).toBe('gpt-3.5-turbo');

    config.set('newProperty.nested.value', 'test');
    expect(config.get('newProperty.nested.value')).toBe('test');
  });

  test('loadFromFile should parse JSON config correctly', () => {
    const jsonConfig = JSON.stringify({
      llm: { model: 'custom-model' },
      newSetting: true
    });

    fs.readFileSync.mockReturnValueOnce(jsonConfig);

    const result = config.loadFromFile('config.json');
    
    expect(result).toBe(true);
    expect(fs.readFileSync).toHaveBeenCalledWith('config.json', 'utf8');
    expect(config.get('llm.model')).toBe('custom-model');
    expect(config.get('newSetting')).toBe(true);
    expect(config.get('llm.provider')).toBe('openai'); // Should keep existing values not overwritten
  });

  test('loadFromFile should parse YAML config correctly', () => {
    const yamlConfig = 'llm:\n  model: yaml-model\nnewYamlSetting: true';

    fs.readFileSync.mockReturnValueOnce(yamlConfig);

    const result = config.loadFromFile('config.yml');
    
    expect(result).toBe(true);
    expect(fs.readFileSync).toHaveBeenCalledWith('config.yml', 'utf8');
    expect(config.get('llm.model')).toBe('yaml-model');
    expect(config.get('newYamlSetting')).toBe(true);
  });

  test('loadFromFile should handle unsupported formats', () => {
    fs.readFileSync.mockReturnValueOnce('some content');

    const result = config.loadFromFile('config.txt');
    
    expect(result).toBe(false);
  });

  test('loadFromFile should handle errors', () => {
    fs.readFileSync.mockImplementationOnce(() => {
      throw new Error('File not found');
    });

    const result = config.loadFromFile('nonexistent.json');
    
    expect(result).toBe(false);
  });

  test('saveToFile should save JSON config correctly', () => {
    const result = config.saveToFile('config.json');
    
    expect(result).toBe(true);
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      'config.json',
      expect.any(String),
      'utf8'
    );
    const savedConfig = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
    expect(savedConfig.llm.provider).toBe('openai');
  });

  test('saveToFile should save YAML config correctly', () => {
    const result = config.saveToFile('config.yaml');
    
    expect(result).toBe(true);
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      'config.yaml',
      expect.any(String),
      'utf8'
    );
  });

  test('saveToFile should handle unsupported formats', () => {
    const result = config.saveToFile('config.txt');
    
    expect(result).toBe(false);
  });

  test('saveToFile should handle errors', () => {
    fs.writeFileSync.mockImplementationOnce(() => {
      throw new Error('Permission denied');
    });

    const result = config.saveToFile('config.json');
    
    expect(result).toBe(false);
  });
});