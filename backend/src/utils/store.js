const { randomUUID } = require('crypto');

const store = {
  templates: [
    {
      id: 'minimal',
      name: 'Minimal',
      description: 'Clean and focused layout for highlighting projects and skills.',
      category: 'Light',
      previewImage: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80',
      configuration: { theme: 'light', accent: '#4f46e5' },
    },
    {
      id: 'developer-dark',
      name: 'Developer Dark',
      description: 'Bold dark theme with technical energy and polished project cards.',
      category: 'Dark',
      previewImage: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=900&q=80',
      configuration: { theme: 'dark', accent: '#46c4ff' },
    },
    {
      id: 'professional',
      name: 'Professional',
      description: 'Structured, formal portfolio for internships and professional profiles.',
      category: 'Corporate',
      previewImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80',
      configuration: { theme: 'professional', accent: '#0f172a' },
    },
    {
      id: 'creative',
      name: 'Creative',
      description: 'Modern and expressive layout designed for a distinctive visual identity.',
      category: 'Creative',
      previewImage: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80',
      configuration: { theme: 'creative', accent: '#ec4899' },
    },
    {
      id: 'editorial',
      name: 'Editorial',
      description: 'A warm, typography-led layout for personal storytelling.',
      category: 'Editorial',
      previewImage: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=80',
      configuration: { theme: 'light', accent: '#9a5d32' },
    },
    {
      id: 'terminal',
      name: 'Terminal',
      description: 'A crisp developer-inspired interface with monospace details.',
      category: 'Developer',
      previewImage: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=900&q=80',
      configuration: { theme: 'dark', accent: '#77d69a' },
    },
    {
      id: 'blueprint',
      name: 'Blueprint',
      description: 'A structured, technical layout with cool architectural tones.',
      category: 'Technical',
      previewImage: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=900&q=80',
      configuration: { theme: 'light', accent: '#147d8b' },
    },
    {
      id: 'monochrome',
      name: 'Monochrome',
      description: 'A sharp black-and-white portfolio built around strong typography.',
      category: 'Editorial',
      previewImage: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=80',
      configuration: { theme: 'light', accent: '#222222' },
    },
    {
      id: 'citrus',
      name: 'Citrus',
      description: 'A fresh, bright layout with lively green and golden accents.',
      category: 'Creative',
      previewImage: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80',
      configuration: { theme: 'light', accent: '#437a32' },
    },
  ],
};

function makeId(prefix = 'id') {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}

function slugify(input = 'portfolio') {
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'portfolio';
}

module.exports = {
  store,
  makeId,
  slugify,
};
