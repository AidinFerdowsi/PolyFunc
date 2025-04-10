#!/usr/bin/env node
/**
 * Command Line Interface for PolyFunc
 */

const commander = require('commander');
const fs = require('fs').promises;
const path = require('path');
const config = require('../core/config');
const llm = require('../llm/client');
const languageProfiles = require('../languages/profile');

const program = new commander.Command();

program
  .version('0.1.0')
  .description('PolyFunc - Microservice Framework with Smart Language Selection');

// Initialize command
program
  .command('init')
  .description('Initialize a new PolyFunc project')
  .action(async () => {
    try {
      console.log('Initializing a new PolyFunc project...');
      
      // Create basic folder structure
      await fs.mkdir('./services', { recursive: true });
      await fs.mkdir('./templates', { recursive: true });
      
      // Create default configuration
      await fs.writeFile(
        './polyfunc.json',
        JSON.stringify(config.config, null, 2),
        'utf8'
      );
      
      console.log('Project initialized successfully!');
      console.log('Set your OpenAI API key with:');
      console.log('  export OPENAI_API_KEY=your_api_key');
      console.log('\nThen create a new service with:');
      console.log('  node src/cli/index.js create "Your service description"');
    } catch (error) {
      console.error('Failed to initialize project:', error);
    }
  });

// Analyze requirements command
program
  .command('analyze <description>')
  .description('Analyze requirements from a service description')
  .action(async (description) => {
    try {
      console.log('Analyzing requirements...');
      const requirements = await llm.analyzeRequirements(description);
      
      if (!requirements) {
        console.error('Failed to analyze requirements');
        return;
      }
      
      console.log('\nRequirements Analysis:');
      console.log(JSON.stringify(requirements, null, 2));
      
      // Find best language match
      const bestLanguage = languageProfiles.findBestLanguageForRequirements(requirements);
      
      console.log('\nRecommended Language:');
      console.log(`${bestLanguage.language} (Score: ${bestLanguage.score.toFixed(2)})`);
    } catch (error) {
      console.error('Error analyzing requirements:', error);
    }
  });

// Decompose service command
program
  .command('decompose <description>')
  .description('Decompose a service into microservices')
  .action(async (description) => {
    try {
      console.log('Decomposing service...');
      const microservices = await llm.decomposeService(description);
      
      if (!microservices) {
        console.error('Failed to decompose service');
        return;
      }
      
      console.log('\nMicroservices:');
      console.log(JSON.stringify(microservices, null, 2));
    } catch (error) {
      console.error('Error decomposing service:', error);
    }
  });

// Create service command
program
  .command('create <description>')
  .description('Create a new microservice from description')
  .option('-l, --language <language>', 'Force a specific programming language')
  .action(async (description, options) => {
    try {
      console.log('Creating new microservice...');
      
      // Step 1: Analyze requirements
      console.log('Analyzing requirements...');
      const requirements = await llm.analyzeRequirements(description);
      
      if (!requirements) {
        console.error('Failed to analyze requirements');
        return;
      }
      
      // Step 2: Determine best language
      let language = options.language;
      if (!language) {
        const bestLanguage = languageProfiles.findBestLanguageForRequirements(requirements);
        language = bestLanguage.language;
        console.log(`\nSelected language: ${language} (Score: ${bestLanguage.score.toFixed(2)})`);
      } else {
        console.log(`\nUsing specified language: ${language}`);
      }
      
      // Step 3: Generate code
      console.log('Generating code...');
      const code = await llm.generateCode(language, 'service', description);
      
      if (!code || !code.files) {
        console.error('Failed to generate code');
        return;
      }
      
      // Step 4: Save generated files
      const servicePath = path.join('./services', language + '-service');
      await fs.mkdir(servicePath, { recursive: true });
      
      for (const file of code.files) {
        const filePath = path.join(servicePath, file.filename);
        const dirPath = path.dirname(filePath);
        
        await fs.mkdir(dirPath, { recursive: true });
        await fs.writeFile(filePath, file.content, 'utf8');
      }
      
      // Step 5: Create readme with instructions
      await fs.writeFile(
        path.join(servicePath, 'README.md'),
        `# Generated Service in ${language}\n\n` +
        `## Description\n${description}\n\n` +
        `## Instructions\n${code.instructions}\n\n` +
        `## Dependencies\n${code.dependencies.join('\n')}\n`,
        'utf8'
      );
      
      console.log(`\nService created successfully in ${servicePath}`);
      console.log('See README.md in the service directory for instructions');
    } catch (error) {
      console.error('Error creating service:', error);
    }
  });

// List language profiles command
program
  .command('languages')
  .description('List available language profiles')
  .action(() => {
    console.log('Available language profiles:');
    for (const [name, profile] of Object.entries(languageProfiles.profiles)) {
      console.log(`\n${name.toUpperCase()}:`);
      console.log('  Characteristics:');
      for (const [key, value] of Object.entries(profile.characteristics)) {
        console.log(`    ${key}: ${value}/10`);
      }
      console.log('  Top use cases:');
      profile.useCases
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .forEach(useCase => {
          console.log(`    ${useCase.name}: ${useCase.score}/10`);
        });
    }
  });

program.parse(process.argv);

// Show help if no arguments
if (!process.argv.slice(2).length) {
  program.outputHelp();
}