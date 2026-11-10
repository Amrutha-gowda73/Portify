const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { mongoUri } = require('../config/env');
const { User, Portfolio } = require('../models');

async function migrateLegacyData() {
  const filePath = path.join(__dirname, '..', '..', 'data', 'store.json');
  if (!fs.existsSync(filePath)) return;

  const legacyData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(legacyData.users) || !Array.isArray(legacyData.portfolios)) {
    throw new Error('The legacy store.json file has an invalid format.');
  }

  if (legacyData.users.length) {
    await User.bulkWrite(legacyData.users.map((user) => ({
      updateOne: {
        filter: { id: user.id },
        update: { $setOnInsert: user },
        upsert: true,
      },
    })));
  }
  if (legacyData.portfolios.length) {
    await Portfolio.bulkWrite(legacyData.portfolios.map((portfolio) => ({
      updateOne: {
        filter: { id: portfolio.id },
        update: { $setOnInsert: portfolio },
        upsert: true,
      },
    })));
  }

  if (legacyData.users.length || legacyData.portfolios.length) {
    const backupPath = `${filePath}.migrated`;
    if (!fs.existsSync(backupPath)) fs.renameSync(filePath, backupPath);
    console.log('Migrated legacy JSON data into MongoDB.');
  }
}

async function connectDatabase(options = {}) {
  const { uri = mongoUri, migrateLegacy = true } = options;
  if (!uri) throw new Error('MONGO_URI must be configured before starting Portify.');

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });

  await Promise.all([User.init(), Portfolio.init()]);
  if (migrateLegacy) await migrateLegacyData();
  console.log('Connected to MongoDB.');
}

async function getUserByEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  return User.findOne({ email: normalizedEmail }).lean().exec();
}

async function getUserById(id) {
  return User.findOne({ id }).lean().exec();
}

async function insertUser(user) {
  return User.create(user).then((document) => document.toObject());
}

async function insertPortfolio(portfolio) {
  return Portfolio.create(portfolio).then((document) => document.toObject());
}

async function getPortfolioById(id) {
  return Portfolio.findOne({ id }).lean().exec();
}

async function getPortfolioBySlug(slug) {
  return Portfolio.findOne({ slug, status: 'published' }).lean().exec();
}

async function getPortfoliosByOwner(ownerId) {
  return Portfolio.find({ ownerId }).sort({ updatedAt: -1 }).lean().exec();
}

async function hasPublishedSlug(slug, exceptId) {
  return Boolean(await Portfolio.exists({ slug, status: 'published', ...(exceptId ? { id: { $ne: exceptId } } : {}) }));
}

async function replacePortfolio(portfolio) {
  return Portfolio.findOneAndReplace({ id: portfolio.id }, portfolio, { new: true, runValidators: true }).lean().exec();
}

async function removePortfolio(id) {
  return Portfolio.findOneAndDelete({ id }).lean().exec();
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