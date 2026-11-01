const mongoose = require('mongoose');

const { Schema } = mongoose;

const userSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true },
}, { versionKey: false });

const portfolioSchema = new Schema({
  id: { type: String, required: true, unique: true },
  ownerId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  slug: { type: String, required: true },
  templateId: { type: String, required: true },
  themeSettings: { type: Schema.Types.Mixed, default: {} },
  personalInformation: { type: Schema.Types.Mixed, default: {} },
  skills: { type: [Schema.Types.Mixed], default: [] },
  projects: { type: [Schema.Types.Mixed], default: [] },
  education: { type: [Schema.Types.Mixed], default: [] },
  experience: { type: [Schema.Types.Mixed], default: [] },
  certifications: { type: [Schema.Types.Mixed], default: [] },
  enabledSections: { type: Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true },
  publishedAt: { type: String, default: null },
}, { versionKey: false });

portfolioSchema.index(
  { slug:  1 },
  { unique: true, partialFilterExpression: { status: 'published' } },
);

module.exports = {
  User: mongoose.models.PortifyUser || mongoose.model('PortifyUser', userSchema, 'users'),
  Portfolio: mongoose.models.PortifyPortfolio || mongoose.model('PortifyPortfolio', portfolioSchema, 'portfolios'),
};