require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  mongoUri: process.env.MONGO_URI || '',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  aiProvider: (process.env.AI_PROVIDER || (process.env.GEMINI_API_KEY ? 'gemini' : 'openai')).toLowerCase(),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  openAiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  githubToken: process.env.GITHUB_TOKEN || '',
  nodeEnv: process.env.NODE_ENV || 'development',
};
