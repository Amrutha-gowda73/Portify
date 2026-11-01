const express = require('express');
const { generateBio, improveProject, generateSummary } = require('../controllers/aiController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.post('/generate-bio', generateBio);
router.post('/improve-project', improveProject);
router.post('/generate-summary', generateSummary);

module.exports = router;
