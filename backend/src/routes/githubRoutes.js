const express = require('express');
const { getGitHubProfile, getGitHubRepos } = require('../controllers/githubController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.get('/:username', getGitHubProfile);
router.get('/:username/repos', getGitHubRepos);

module.exports = router;
