const express = require('express');
const { listTemplates, getTemplate } = require('../controllers/templateController');

const router = express.Router();

router.get('/', listTemplates);
router.get('/:id', getTemplate);

module.exports = router;
