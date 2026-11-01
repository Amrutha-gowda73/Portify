const express = require('express');
const { authenticate } = require('../middleware/auth');
const {
  createPortfolio,
  listPortfolios,
  getPortfolio,
  updatePortfolio,
  removePortfolio,
  duplicatePortfolio,
  publishPortfolio,
  unpublishPortfolio,
} = require('../controllers/portfolioController');

const router = express.Router();

router.post('/', authenticate, createPortfolio);
router.get('/', authenticate, listPortfolios);
router.get('/:id', authenticate, getPortfolio);
router.put('/:id', authenticate, updatePortfolio);
router.delete('/:id', authenticate, removePortfolio);
router.post('/:id/duplicate', authenticate, duplicatePortfolio);
router.post('/:id/publish', authenticate, publishPortfolio);
router.post('/:id/unpublish', authenticate, unpublishPortfolio);

module.exports = router;
