/**
 * Language profiles for PolyFunc
 * This module defines performance characteristics and use cases for each supported language
 */

class LanguageProfile {
  constructor(name, characteristics = {}) {
    this.name = name;
    this.characteristics = {
      performance: 5, // 1-10 scale
      memory: 5, // 1-10 scale
      startupTime: 5, // 1-10 scale
      ecosystem: 5, // 1-10 scale
      concurrency: 5, // 1-10 scale
      ...characteristics
    };
    this.useCases = [];
    this.libraries = {};
  }

  addUseCase(useCase, score) {
    this.useCases.push({ name: useCase, score });
    return this;
  }

  addLibrary(name, purpose, maturity) {
    this.libraries[name] = { purpose, maturity };
    return this;
  }

  matches(requirements) {
    // Calculate a score for how well this language matches the given requirements
    let score = 0;
    let totalWeight = 0;

    if (requirements.performance) {
      score += this.characteristics.performance * requirements.performance.weight;
      totalWeight += requirements.performance.weight;
    }

    if (requirements.memory) {
      score += this.characteristics.memory * requirements.memory.weight;
      totalWeight += requirements.memory.weight;
    }
    
    if (requirements.startupTime) {
      score += this.characteristics.startupTime * requirements.startupTime.weight;
      totalWeight += requirements.startupTime.weight;
    }
    
    if (requirements.ecosystem) {
      score += this.characteristics.ecosystem * requirements.ecosystem.weight;
      totalWeight += requirements.ecosystem.weight;
    }
    
    if (requirements.concurrency) {
      score += this.characteristics.concurrency * requirements.concurrency.weight;
      totalWeight += requirements.concurrency.weight;
    }

    // Check for use case match
    if (requirements.useCase) {
      const useCase = this.useCases.find(uc => uc.name === requirements.useCase);
      if (useCase) {
        score += useCase.score * (requirements.useCaseWeight || 1);
        totalWeight += (requirements.useCaseWeight || 1);
      }
    }

    return totalWeight > 0 ? score / totalWeight : 0;
  }

  toJSON() {
    return {
      name: this.name,
      characteristics: this.characteristics,
      useCases: this.useCases,
      libraries: this.libraries
    };
  }
}

// Create and export language profiles
const javascriptProfile = new LanguageProfile('javascript', {
  performance: 6,
  memory: 5,
  startupTime: 7,
  ecosystem: 9,
  concurrency: 6
})
  .addUseCase('web', 9)
  .addUseCase('api', 8)
  .addUseCase('scripting', 9)
  .addUseCase('data', 6)
  .addLibrary('express', 'web server', 9)
  .addLibrary('node-fetch', 'http client', 8);

const pythonProfile = new LanguageProfile('python', {
  performance: 5,
  memory: 6,
  startupTime: 6,
  ecosystem: 9,
  concurrency: 5
})
  .addUseCase('data', 9)
  .addUseCase('ml', 10)
  .addUseCase('scripting', 9)
  .addUseCase('web', 6)
  .addLibrary('flask', 'web server', 8)
  .addLibrary('pandas', 'data processing', 9);

const goProfile = new LanguageProfile('go', {
  performance: 8,
  memory: 8,
  startupTime: 9,
  ecosystem: 7,
  concurrency: 10
})
  .addUseCase('performance', 9)
  .addUseCase('concurrency', 10)
  .addUseCase('api', 8)
  .addUseCase('system', 8)
  .addLibrary('gin', 'web framework', 8)
  .addLibrary('gorm', 'orm', 7);

const rustProfile = new LanguageProfile('rust', {
  performance: 10,
  memory: 9,
  startupTime: 7,
  ecosystem: 6,
  concurrency: 9
})
  .addUseCase('system', 10)
  .addUseCase('performance', 10)
  .addUseCase('concurrency', 9)
  .addUseCase('embedded', 9)
  .addLibrary('actix-web', 'web server', 8)
  .addLibrary('serde', 'serialization', 9);

// Export profiles
module.exports = {
  LanguageProfile,
  profiles: {
    javascript: javascriptProfile,
    python: pythonProfile,
    go: goProfile,
    rust: rustProfile
  },
  findBestLanguageForRequirements(requirements) {
    let bestScore = -1;
    let bestLanguage = null;
    
    for (const [name, profile] of Object.entries(this.profiles)) {
      const score = profile.matches(requirements);
      if (score > bestScore) {
        bestScore = score;
        bestLanguage = name;
      }
    }
    
    return {
      language: bestLanguage,
      score: bestScore,
      profile: bestLanguage ? this.profiles[bestLanguage] : null
    };
  }
};