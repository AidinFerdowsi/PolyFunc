const llmClient = require('../../src/llm/client');
const { OpenAI } = require('openai');

// Mock OpenAI
jest.mock('openai', () => {
  const mockCompletionsCreate = jest.fn();
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCompletionsCreate
        }
      }
    })),
    mockCompletionsCreate
  };
});

describe('LLM Client Module', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Reset client
    llmClient.client = null;
    llmClient.apiKey = 'test-key';
  });

  test('getClient should create a client instance when called first time', () => {
    const client = llmClient.getClient();
    
    expect(client).toBeDefined();
    expect(OpenAI).toHaveBeenCalledTimes(1);
    expect(OpenAI).toHaveBeenCalledWith({ apiKey: 'test-key' });
  });

  test('getClient should reuse existing client', () => {
    llmClient.getClient();
    llmClient.getClient();
    
    expect(OpenAI).toHaveBeenCalledTimes(1);
  });

  test('getClient should throw error when API key is missing', () => {
    llmClient.apiKey = undefined;
    
    expect(() => llmClient.getClient()).toThrow(/OpenAI API key is required/);
  });

  test('analyzeRequirements should format prompt and parse response correctly', async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              useCase: 'api',
              requirements: {
                performance: { importance: 8, weight: 0.8 },
                memory: { importance: 7, weight: 0.7 }
              },
              dependencies: ['express', 'mongoose'],
              useCaseWeight: 0.9
            })
          }
        }
      ]
    };

    // Mock OpenAI response
    const { mockCompletionsCreate } = require('openai');
    mockCompletionsCreate.mockResolvedValueOnce(mockResponse);

    const result = await llmClient.analyzeRequirements('Create a REST API for user management');
    
    expect(mockCompletionsCreate).toHaveBeenCalledWith({
      model: llmClient.model,
      messages: expect.arrayContaining([
        expect.objectContaining({
          content: expect.stringContaining('Create a REST API for user management')
        })
      ]),
      temperature: 0.2
    });
    
    expect(result).toEqual({
      useCase: 'api',
      requirements: {
        performance: { importance: 8, weight: 0.8 },
        memory: { importance: 7, weight: 0.7 }
      },
      dependencies: ['express', 'mongoose'],
      useCaseWeight: 0.9
    });
  });

  test('analyzeRequirements should handle JSON parsing errors', async () => {
    const mockResponse = {
      choices: [{ message: { content: 'Not valid JSON' } }]
    };

    const { mockCompletionsCreate } = require('openai');
    mockCompletionsCreate.mockResolvedValueOnce(mockResponse);

    const result = await llmClient.analyzeRequirements('Invalid response');
    
    expect(result).toBeNull();
  });

  test('analyzeRequirements should handle API errors', async () => {
    const { mockCompletionsCreate } = require('openai');
    mockCompletionsCreate.mockRejectedValueOnce(new Error('API error'));

    const result = await llmClient.analyzeRequirements('Error test');
    
    expect(result).toBeNull();
  });

  test('decomposeService should format prompt and parse response correctly', async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify([
              {
                name: 'auth-service',
                purpose: 'Authentication',
                description: 'Handles user authentication',
                endpoints: ['/login', '/register']
              }
            ])
          }
        }
      ]
    };

    const { mockCompletionsCreate } = require('openai');
    mockCompletionsCreate.mockResolvedValueOnce(mockResponse);

    const result = await llmClient.decomposeService('Build an e-commerce platform');
    
    expect(mockCompletionsCreate).toHaveBeenCalledWith({
      model: llmClient.model,
      messages: expect.arrayContaining([
        expect.objectContaining({
          content: expect.stringContaining('Build an e-commerce platform')
        })
      ]),
      temperature: 0.3
    });
    
    expect(result).toEqual([
      {
        name: 'auth-service',
        purpose: 'Authentication',
        description: 'Handles user authentication',
        endpoints: ['/login', '/register']
      }
    ]);
  });

  test('generateCode should format prompt with language and parse response correctly', async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              files: [
                {
                  filename: 'index.js',
                  content: 'console.log("Hello world");'
                }
              ],
              instructions: 'Run with node index.js',
              dependencies: ['express', 'dotenv']
            })
          }
        }
      ]
    };

    const { mockCompletionsCreate } = require('openai');
    mockCompletionsCreate.mockResolvedValueOnce(mockResponse);

    const result = await llmClient.generateCode('javascript', 'simple-service', 'A simple demo service');
    
    expect(mockCompletionsCreate).toHaveBeenCalledWith({
      model: llmClient.model,
      messages: expect.arrayContaining([
        expect.objectContaining({
          content: expect.stringContaining('javascript')
        })
      ]),
      temperature: 0.2
    });
    
    expect(result).toEqual({
      files: [
        {
          filename: 'index.js',
          content: 'console.log("Hello world");'
        }
      ],
      instructions: 'Run with node index.js',
      dependencies: ['express', 'dotenv']
    });
  });
});