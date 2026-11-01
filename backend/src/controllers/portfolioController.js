const { makeId, slugify } = require('../utils/store');
const {
  insertPortfolio,
  getPortfolioById,
  getPortfolioBySlug,
  getPortfoliosByOwner,
  hasPublishedSlug,
  replacePortfolio,
  removePortfolio: deletePortfolio,
} = require('../utils/storage');
const { escapeHtml } = require('../utils/escape');

function getPortfolioData(portfolio) {
  return {
    id: portfolio.id,
    ownerId: portfolio.ownerId,
    title: portfolio.title,
    slug: portfolio.slug,
    templateId: portfolio.templateId,
    themeSettings: portfolio.themeSettings,
    personalInformation: portfolio.personalInformation,
    skills: portfolio.skills,
    projects: portfolio.projects,
    education: portfolio.education,
    experience: portfolio.experience,
    certifications: portfolio.certifications,
    enabledSections: portfolio.enabledSections,
    status: portfolio.status,
    createdAt: portfolio.createdAt,
    updatedAt: portfolio.updatedAt,
    publishedAt: portfolio.publishedAt,
  };
}

async function createPortfolio(req, res) {
  const { title, templateId, personalInformation = {}, skills = [], projects = [], education = [], experience = [], certifications = [], enabledSections = {} } = req.body;

  if (!title || !templateId) {
    return res.status(400).json({ success: false, message: 'Portfolio title and template are required.' });
  }

  const portfolio = {
    id: makeId('portfolio'),
    ownerId: req.user.id,
    title: escapeHtml(title),
    slug: slugify(title || 'portfolio'),
    templateId,
    themeSettings: {
      accent: '#4f46e5',
      font: 'Inter',
      layout: 'classic',
      theme: 'light',
      backgroundStyle: 'soft-gradient',
    },
    personalInformation,
    skills,
    projects,
    education,
    experience,
    certifications,
    enabledSections,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: null,
  };

  const created = await insertPortfolio(portfolio);
  return res.status(201).json({ success: true, portfolio: getPortfolioData(created) });
}

async function listPortfolios(req, res) {
  const portfolios = await getPortfoliosByOwner(req.user.id);
  return res.json({ success: true, portfolios: portfolios.map(getPortfolioData) });
}

async function getPortfolio(req, res) {
  const portfolio = await getPortfolioById(req.params.id);
  if (!portfolio) return res.status(404).json({ success: false, message: 'Portfolio not found.' });
  if (portfolio.ownerId !== req.user.id) return res.status(403).json({ success: false, message: 'You are not allowed to access this portfolio.' });
  return res.json({ success: true, portfolio: getPortfolioData(portfolio) });
}

async function updatePortfolio(req, res) {
  const portfolio = await getPortfolioById(req.params.id);
  if (!portfolio) return res.status(404).json({ success: false, message: 'Portfolio not found.' });
  if (portfolio.ownerId !== req.user.id) return res.status(403).json({ success: false, message: 'You are not allowed to update this portfolio.' });

  const next = { ...portfolio, ...req.body, id: portfolio.id, ownerId: portfolio.ownerId, updatedAt: new Date().toISOString() };
  if (req.body.title) next.title = escapeHtml(req.body.title);
  if (req.body.slug) next.slug = slugify(req.body.slug);

  const existing = await hasPublishedSlug(next.slug, portfolio.id);
  if (existing) {
    return res.status(409).json({ success: false, message: 'This public slug is already in use.' });
  }

  const updated = await replacePortfolio(next);
  return res.json({ success: true, portfolio: getPortfolioData(updated) });
}

async function removePortfolio(req, res) {
  const portfolio = await getPortfolioById(req.params.id);
  if (!portfolio) return res.status(404).json({ success: false, message: 'Portfolio not found.' });
  if (portfolio.ownerId !== req.user.id) return res.status(403).json({ success: false, message: 'You are not allowed to delete this portfolio.' });

  await deletePortfolio(portfolio.id);
  return res.json({ success: true, message: 'Portfolio deleted successfully.' });
}

async function duplicatePortfolio(req, res) {
  const portfolio = await getPortfolioById(req.params.id);
  if (!portfolio) return res.status(404).json({ success: false, message: 'Portfolio not found.' });
  if (portfolio.ownerId !== req.user.id) return res.status(403).json({ success: false, message: 'You are not allowed to duplicate this portfolio.' });

  const copy = {
    ...portfolio,
    id: makeId('portfolio'),
    title: `${portfolio.title} Copy`,
    slug: `${slugify(portfolio.slug || portfolio.title)}-copy`,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: null,
  };

  const created = await insertPortfolio(copy);
  return res.status(201).json({ success: true, portfolio: getPortfolioData(created) });
}

async function publishPortfolio(req, res) {
  const portfolio = await getPortfolioById(req.params.id);
  if (!portfolio) return res.status(404).json({ success: false, message: 'Portfolio not found.' });
  if (portfolio.ownerId !== req.user.id) return res.status(403).json({ success: false, message: 'You are not allowed to publish this portfolio.' });
  if (!portfolio.slug) return res.status(400).json({ success: false, message: 'Slug is required before publishing.' });

  const duplicate = await hasPublishedSlug(portfolio.slug, portfolio.id);
  if (duplicate) return res.status(409).json({ success: false, message: 'This public slug is already in use.' });

  const updated = await replacePortfolio({ ...portfolio, status: 'published', publishedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  return res.json({ success: true, portfolio: getPortfolioData(updated) });
}

async function unpublishPortfolio(req, res) {
  const portfolio = await getPortfolioById(req.params.id);
  if (!portfolio) return res.status(404).json({ success: false, message: 'Portfolio not found.' });
  if (portfolio.ownerId !== req.user.id) return res.status(403).json({ success: false, message: 'You are not allowed to unpublish this portfolio.' });

  const updated = await replacePortfolio({ ...portfolio, status: 'draft', publishedAt: null, updatedAt: new Date().toISOString() });
  return res.json({ success: true, portfolio: getPortfolioData(updated) });
}

async function publicPortfolio(req, res) {
  const portfolio = await getPortfolioBySlug(req.params.slug);
  if (!portfolio) return res.status(404).json({ success: false, message: 'Portfolio not found.' });
  return res.json({ success: true, portfolio: getPortfolioData(portfolio) });
}

module.exports = {
  createPortfolio,
  listPortfolios,
  getPortfolio,
  updatePortfolio,
  removePortfolio,
  duplicatePortfolio,
  publishPortfolio,
  unpublishPortfolio,
  publicPortfolio,
};
