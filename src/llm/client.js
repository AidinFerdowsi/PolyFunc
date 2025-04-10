/**
 * LLM client for PolyFunc
 * Handles interaction with large language models for code generation and service decomposition
 */

const { OpenAI } = require('openai');
const config = require('../core/config');

class LLMClient {
  constructor() {
    this.provider = config.get('llm.provider');
    this.model = config.get('llm.model');
    this.apiKey = config.get('llm.apiKey');
    
    if (!this.apiKey) {
      console.warn('No API key found for LLM provider. Set OPENAI_API_KEY in your environment or in the config file.');
    }
    
    // Don't initialize the client immediately
    this.client = null;
  }
  
  // Lazy initialization of the client
  getClient() {
    if (!this.client) {
      if (!this.apiKey) {
        throw new Error('OpenAI API key is required. Set OPENAI_API_KEY in your environment or in the config file.');
      }
      this.client = this.initializeClient();
    }
    return this.client;
  }
  
  initializeClient() {
    switch (this.provider) {
      case 'openai':
        return new OpenAI({
          apiKey: this.apiKey
        });
      // Add other providers as needed
      default:
        throw new Error(`Unsupported LLM provider: ${this.provider}`);
    }
  }
  
  async analyzeRequirements(description) {
    try {
      const prompt = `
      Analyze the following microservice description and extract key requirements.
      Determine the primary use case (web, api, data, ml, system, performance, concurrency, etc.)
      and performance characteristics needed.
      
      Description: ${description}
      
      Output format:
      {
        "useCase": "primary use case",
        "requirements": {
          "performance": { "importance": 0-10, "weight": 0-1 },
          "memory": { "importance": 0-10, "weight": 0-1 },
          "startupTime": { "importance": 0-10, "weight": 0-1 },
          "ecosystem": { "importance": 0-10, "weight": 0-1 },
          "concurrency": { "importance": 0-10, "weight": 0-1 }
        },
        "dependencies": ["list", "of", "dependencies"],
        "useCaseWeight": 0-1
      }
      `;
      
      const response = await this.getClient().chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      });
      
      try {
        return JSON.parse(response.choices[0].message.content);
      } catch (error) {
        console.error('Failed to parse LLM response as JSON:', error);
        return null;
      }
    } catch (error) {
      console.error('Error calling LLM API:', error);
      return null;
    }
  }
  
  async decomposeService(description) {
    try {
      const prompt = `
      Decompose the following service description into microservices.
      For each microservice, provide a name, purpose, and brief description.
      
      Service: ${description}
      
      Output format:
      [
        {
          "name": "service-name",
          "purpose": "brief purpose",
          "description": "detailed description",
          "endpoints": ["endpoint1", "endpoint2"]
        }
      ]
      `;
      
      const response = await this.getClient().chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      });
      
      try {
        return JSON.parse(response.choices[0].message.content);
      } catch (error) {
        console.error('Failed to parse LLM response as JSON:', error);
        return null;
      }
    } catch (error) {
      console.error('Error calling LLM API:', error);
      return null;
    }
  }
  
  async generateCode(language, serviceName, serviceDescription) {
    try {
      const prompt = `
      Generate code for a ${language} microservice with the following details:
      
      Service name: ${serviceName}
      Description: ${serviceDescription}
      
      Provide the complete code needed to implement this service, including:
      1. Main service implementation
      2. Any necessary configuration
      3. Dependencies and package management
      4. Instructions for running the service
      
      Format the response as a valid JSON object with these fields:
      {
        "files": [
          {
            "filename": "path/to/file.ext",
            "content": "file content here"
          }
        ],
        "instructions": "instructions on how to run the service",
        "dependencies": ["list", "of", "dependencies"]
      }
      `;
      
      const response = await this.getClient().chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      });
      
      try {
        return JSON.parse(response.choices[0].message.content);
      } catch (error) {
        console.error('Failed to parse LLM response as JSON:', error);
        return null;
      }
    } catch (error) {
      console.error('Error calling LLM API:', error);
      return null;
    }
  }
}

module.exports = new LLMClient();