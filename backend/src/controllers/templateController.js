const { store } = require('../utils/store');

function listTemplates(req, res) {
  return res.json({ success: true, templates: store.templates });
}

function getTemplate(req, res) {
  const template = store.templates.find((item) => item.id === req.params.id);
  if (!template) {
    return res.status(404).json({ success: false, message: 'Template not found.' });
  }

  return res.json({ success: true, template });
}

module.exports = { listTemplates, getTemplate };
