/**
 * Configuration management for PolyFunc
 */
const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

class Config {
  constructor() {
    this.config = {
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
  }

  loadFromFile(configPath) {
    try {
      const fileContents = fs.readFileSync(configPath, 'utf8');
      const extension = path.extname(configPath).toLowerCase();
      
      if (extension === '.json') {
        this.config = { ...this.config, ...JSON.parse(fileContents) };
      } else if (['.yml', '.yaml'].includes(extension)) {
        this.config = { ...this.config, ...yaml.parse(fileContents) };
      } else {
        throw new Error(`Unsupported configuration file format: ${extension}`);
      }
      
      console.log('Configuration loaded successfully');
      return true;
    } catch (error) {
      console.error(`Failed to load configuration: ${error.message}`);
      return false;
    }
  }

  get(key) {
    const keys = key.split('.');
    let result = this.config;
    
    for (const k of keys) {
      if (result[k] === undefined) {
        return undefined;
      }
      result = result[k];
    }
    
    return result;
  }

  set(key, value) {
    const keys = key.split('.');
    let current = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!current[k]) {
        current[k] = {};
      }
      current = current[k];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  saveToFile(configPath) {
    try {
      const extension = path.extname(configPath).toLowerCase();
      let fileContents;
      
      if (extension === '.json') {
        fileContents = JSON.stringify(this.config, null, 2);
      } else if (['.yml', '.yaml'].includes(extension)) {
        fileContents = yaml.stringify(this.config);
      } else {
        throw new Error(`Unsupported configuration file format: ${extension}`);
      }
      
      fs.writeFileSync(configPath, fileContents, 'utf8');
      console.log('Configuration saved successfully');
      return true;
    } catch (error) {
      console.error(`Failed to save configuration: ${error.message}`);
      return false;
    }
  }
}

module.exports = new Config();