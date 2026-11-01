const axios = require('axios');
const { openAiApiKey } = require('../config/env');

async function generateContent(systemMessage, userMessage, localDraft) {
  if (!openAiApiKey) {
    return {
      success: true,
      content: localDraft,
      source: 'local',
      notice: 'AI provider is not configured. This factual writing draft was generated locally.',
    };
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${openAiApiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 20000,
      },
    );

    const content = response?.data?.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error('The AI provider returned an empty response.');
    return { success: true, content, source: 'openai' };
  } catch {
    return {
      success: true,
      content: localDraft,
      source: 'local',
      notice: 'The AI provider could not be reached. This factual writing draft was generated locally.',
    };
  }
}

async function generateBio(req, res) {
  const {
    name = '',
    role = '',
    skills = [],
    experienceLevel = 'developer',
    careerInterests = '',
    experience = [],
    projects = [],
  } = req.body;

  if ((!role && !name) || !Array.isArray(skills) || !Array.isArray(experience) || !Array.isArray(projects)) {
    return res.status(400).json({ success: false, message: 'Provide a name or professional role and valid profile details.' });
  }

  const skillList = skills.join(', ');
  const interest = careerInterests && !careerInterests.startsWith('Use this as context only:')
    ? ` Career interests include ${careerInterests}.`
    : '';
  const introduction = name
    ? `${name} is a ${role || 'developer'}`
    : `A ${role} professional`;
  const skillClause = skillList ? ` with a focus on ${skillList}` : '';
  const facts = [
    `${introduction}${skillClause}.`,
    experience.length ? `Experience includes ${experience.filter(Boolean).join('; ')}.` : '',
    projects.length ? `Selected work includes ${projects.filter(Boolean).join(', ')}.` : '',
    interest,
  ].filter(Boolean);
  const localDraft = facts.join(' ');
  return res.json(await generateContent(
    'Write concise, professional bios. Do not invent degrees, awards, or roles.',
    `Create a concise professional biography. Name: ${name || 'not provided'}. Role: ${role || 'not provided'}. Experience level: ${experienceLevel}. Skills: ${skillList || 'not provided'}. Experience facts: ${experience.join('; ') || 'not provided'}. Project facts: ${projects.join('; ') || 'not provided'}. Career interests: ${careerInterests || 'not provided'}. Do not invent qualifications.`,
    localDraft,
  ));
}

async function improveProject(req, res) {
  const { title, technologies = [], details = '' } = req.body;

  if (!title || !Array.isArray(technologies) || !technologies.length || !details) {
    return res.status(400).json({ success: false, message: 'Project title, technologies, and details are required.' });
  }

  const technologyList = technologies.join(', ');
  const localDraft = `${title} is built with ${technologyList}. ${String(details).trim()}`;
  return res.json(await generateContent(
    'Rewrite project descriptions professionally and clearly. Keep factual information only.',
    `Improve this project description for ${title} using ${technologyList}. Details: ${details}`,
    localDraft,
  ));
}

async function generateSummary(req, res) {
  const { skills = [], education = [], experience = [], objective = '' } = req.body;

  if (!Array.isArray(skills) || !Array.isArray(education) || !Array.isArray(experience)) {
    return res.status(400).json({ success: false, message: 'Skills, education, and experience must be lists.' });
  }

  if (!skills.length && !education.length && !experience.length) {
    return res.status(400).json({ success: false, message: 'Provide skills, education, or experience details.' });
  }

  const profileFacts = [
    skills.length ? `Skills include ${skills.join(', ')}` : '',
    education.length ? `Education includes ${education.join(', ')}` : '',
    experience.length ? `Experience includes ${experience.join(', ')}` : '',
    objective ? `Career focus: ${objective}` : '',
  ].filter(Boolean).join('. ');
  const localDraft = `${profileFacts}.`;
  return res.json(await generateContent(
    'Generate a concise professional summary without inventing qualifications.',
    `Create a concise professional summary using these skills: ${skills.join(', ') || 'not provided'}, education: ${education.join(', ') || 'not provided'}, experience: ${experience.join(', ') || 'not provided'}, objective: ${objective || 'build meaningful developer experiences'}.`,
    localDraft,
  ));
}

module.exports = { generateBio, improveProject, generateSummary };
