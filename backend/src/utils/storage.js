const mongoose = require('mongoose');
const { mongoUri } = require('../config/env');
const { User, Portfolio } = require('../models');
const { store, persistStore, loadStore, findUserByEmail, findPortfolioById, findPortfolioBySlug } = require('./store');

let useMongo = Boolean(mongoUri && !process.env.PORTIFY_DATA_FILE);

async function connectDatabase() {
  if (useMongo) {
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
      console.log('Connected to MongoDB.');
    } catch (error) {
      if (process.env.NODE_ENV === 'production') throw error;
      useMongo = false;
      loadStore();
      console.warn('MongoDB is unavailable; using persistent JSON-file storage for development.');
    }
  } else {
    loadStore();
    console.log('Using JSON-file storage.');
  }
}

async function getUserByEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (useMongo) return User.findOne({ email: normalizedEmail }).lean().exec();
  return findUserByEmail(normalizedEmail) || null;
}

async function getUserById(id) {
  if (useMongo) return User.findOne({ id }).lean().exec();
  return store.users.find((user) => user.id === id) || null;
}

async function insertUser(user) {
  if (useMongo) return User.create(user).then((document) => document.toObject());
  store.users.push(user);
  persistStore();
  return user;
}

async function insertPortfolio(portfolio) {
  if (useMongo) return Portfolio.create(portfolio).then((document) => document.toObject());
  store.portfolios.push(portfolio);
  persistStore();
  return portfolio;
}

async function getPortfolioById(id) {
  if (useMongo) return Portfolio.findOne({ id }).lean().exec();
  return findPortfolioById(id) || null;
}

async function getPortfolioBySlug(slug) {
  if (useMongo) return Portfolio.findOne({ slug, status: 'published' }).lean().exec();
  return findPortfolioBySlug(slug) || null;
}

async function getPortfoliosByOwner(ownerId) {
  if (useMongo) return Portfolio.find({ ownerId }).sort({ updatedAt: -1 }).lean().exec();
  return store.portfolios.filter((portfolio) => portfolio.ownerId === ownerId);
}

async function hasPublishedSlug(slug, exceptId) {
  if (useMongo) return Boolean(await Portfolio.exists({ slug, status: 'published', ...(exceptId ? { id: { $ne: exceptId } } : {}) }));
  return store.portfolios.some((portfolio) => portfolio.slug === slug && portfolio.id !== exceptId && portfolio.status === 'published');
}

async function replacePortfolio(portfolio) {
  if (useMongo) {
    return Portfolio.findOneAndReplace({ id: portfolio.id }, portfolio, { new: true, runValidators: true }).lean().exec();
  }
  const index = store.portfolios.findIndex((item) => item.id === portfolio.id);
  if (index === -1) return null;
  store.portfolios[index] = portfolio;
  persistStore();
  return portfolio;
}

async function removePortfolio(id) {
  if (useMongo) return Portfolio.findOneAndDelete({ id }).lean().exec();
  const portfolio = findPortfolioById(id);
  if (!portfolio) return null;
  store.portfolios = store.portfolios.filter((item) => item.id !== id);
  persistStore();
  return portfolio;
}

module.exports = {
  connectDatabase,
  getUserByEmail,
  getUserById,
  insertUser,
  insertPortfolio,
  getPortfolioById,
  getPortfolioBySlug,
  getPortfoliosByOwner,
  hasPublishedSlug,
  replacePortfolio,
  removePortfolio,
};