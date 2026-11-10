const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  chat,
  portfolioAssistantTurn,
  generatePortfolioContent,
  transformPortfolioContent,
  improveProject,
  generateSummary,
} = require('../controllers/aiController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many AI requests. Please try again later.' },
}));

router.use((req, res, next) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ success: false, message: 'Provide a JSON request body.' });
  }
  return next();
});

router.post('/chat', chat);
router.post('/portfolio-assistant/turn', portfolioAssistantTurn);
router.post('/portfolio-assistant/generate', generatePortfolioContent);
router.post('/portfolio-assistant/transform', transformPortfolioContent);
router.post('/improve-project', authenticate, improveProject);
router.post('/generate-summary', authenticate, generateSummary);

module.exports = router;
