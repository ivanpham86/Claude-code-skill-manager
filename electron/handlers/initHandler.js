const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.claude-skill-manager');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const CLAUDE_PATH = path.join(os.homedir(), '.claude');
const RULES_PATH = path.join(CLAUDE_PATH, 'skills');

const DEFAULT_CONFIG = {
  claudePath: CLAUDE_PATH,
  rulesPath: RULES_PATH,
  createdAt: new Date().toISOString(),
  version: '1.0.0',
  autoUpdate: true,
  githubToken: ''
};

/**
 * Initialize app directories and config on first launch
 */
async function initializeApp() {
  try {
    // Create ~/.claude/
    await fs.mkdir(CLAUDE_PATH, { recursive: true });
    console.log('✓ Created ~/.claude/');

    // Create ~/.claude/skills/
    await fs.mkdir(RULES_PATH, { recursive: true });
    console.log('✓ Created ~/.claude/skills/');

    // Create ~/.claude-skill-manager/
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    console.log('✓ Created ~/.claude-skill-manager/');

    // Create config.json if not exists
    try {
      await fs.access(CONFIG_FILE);
    } catch {
      await fs.writeFile(
        CONFIG_FILE,
        JSON.stringify(DEFAULT_CONFIG, null, 2)
      );
      console.log('✓ Created config.json');
    }

    // Create cache directory
    const cacheDir = path.join(CONFIG_DIR, 'cache');
    await fs.mkdir(cacheDir, { recursive: true });

    // Create logs directory
    const logsDir = path.join(CONFIG_DIR, 'logs');
    await fs.mkdir(logsDir, { recursive: true });

    return {
      success: true,
      paths: {
        claudePath: CLAUDE_PATH,
        rulesPath: RULES_PATH,
        configDir: CONFIG_DIR
      }
    };
  } catch (error) {
    console.error('Initialization error:', error);
    throw error;
  }
}

/**
 * Get config value
 */
async function getConfig(event, key) {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8');
    const config = JSON.parse(data);
    return key ? config[key] : config;
  } catch (error) {
    console.error('Error reading config:', error);
    return key ? null : DEFAULT_CONFIG;
  }
}

/**
 * Set config value
 */
async function setConfig(event, updates) {
  try {
    let config = DEFAULT_CONFIG;
    try {
      const data = await fs.readFile(CONFIG_FILE, 'utf-8');
      config = JSON.parse(data);
    } catch (e) {
      // Use default if file doesn't exist
    }

    const updatedConfig = { ...config, ...updates };
    await fs.writeFile(
      CONFIG_FILE,
      JSON.stringify(updatedConfig, null, 2)
    );

    return { success: true, config: updatedConfig };
  } catch (error) {
    console.error('Error writing config:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  initializeApp,
  getConfig,
  setConfig,
  CONFIG_DIR,
  CONFIG_FILE,
  CLAUDE_PATH,
  RULES_PATH
};