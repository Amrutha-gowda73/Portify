const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const { port, frontendUrl, nodeEnv } = require('./config/env');
const { connectDatabase } = require('./utils/storage');
const authRoutes = require('./routes/authRoutes');
const portfolioRoutes = require('./routes/portfolioRoutes');
const templateRoutes = require('./routes/templateRoutes');
const aiRoutes = require('./routes/aiRoutes');
const githubRoutes = require('./routes/githubRoutes');

const app = express();

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: frontendUrl,
  credentials: true,
}));
app.use(express.json({ limit: '8mb' }));
app.use(morgan(nodeEnv === 'production' ? 'combined' : 'dev'));
app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Portify API is running.' });
});

app.get('/', (req, res) => {
  res.json({ success: true, message: 'Portify backend ready.' });
});

app.use('/api/auth', authRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/portfolios', portfolioRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/github', githubRoutes);
app.get('/api/public/:slug', (req, res) => {
  const { publicPortfolio } = require('./controllers/portfolioController');
  return publicPortfolio(req, res);
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Unexpected server error.', error: nodeEnv === 'development' ? err.message : undefined });
});

if (require.main === module) {
  connectDatabase()
    .then(() => {
      app.listen(port, () => {
        console.log(`Portify backend running on http://localhost:${port}`);
      });
    })
    .catch((error) => {
      console.error('Unable to connect to the configured database.', error.message);
      process.exitCode = 1;
    });
}

module.exports = app;
