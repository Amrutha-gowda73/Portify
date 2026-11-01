require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  mongoUri: process.env.MONGO_URI || '',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  githubToken: process.env.GITHUB_TOKEN || '',
  nodeEnv: process.env.NODE_ENV || 'development',
};
