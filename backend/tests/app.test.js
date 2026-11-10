const test = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const mongoose = require('mongoose');

const { User } = require('../src/models');
const { connectDatabase } = require('../src/utils/storage');
const { emptyProfile, isProfileComplete, profileProgress } = require('../src/controllers/aiController');
const aiConfig = require('../src/config/env');
const app = require('../src/server');
const testMongoUri = new URL(aiConfig.mongoUri || 'mongodb://127.0.0.1:27017/portify');
testMongoUri.pathname = '/portify-test';
aiConfig.aiProvider = 'openai';

let server;

function completeProfile() {
  const profile = emptyProfile();
  Object.assign(profile.personalDetails, {
    fullName: 'Taylor Example',
    professionalTitle: 'Junior developer',
    educationalBackground: 'Computer science studies',
    currentStatus: 'Student',
  });
  Object.assign(profile.technicalDetails, {
    technicalSkills: 'JavaScript',
    areasOfInterest: 'Accessible web applications',
  });
  Object.assign(profile.experience, {
    internshipExperience: 'No internship experience reported',
    workExperience: 'No work experience reported',
    academicExperience: 'Coursework in web development',
    freelanceExperience: 'No freelance experience reported',
  });
  profile.noProjects = true;
  Object.assign(profile.achievements, {
    certifications: 'None reported',
    awards: 'None reported',
    hackathons: 'None reported',
    workshops: 'None reported',
    competitions: 'None reported',
  });
  Object.assign(profile.personal, { strengths: 'Curiosity', interests: 'Frontend development' });
  Object.assign(profile.careerGoals, {
    shortTermGoals: 'Build practical applications',
    longTermGoals: 'Grow as a software developer',
    desiredJobRole: 'Frontend developer',
    professionalAmbitions: 'Contribute to accessible products',
  });
  return profile;
}

test.before(async () => {
  await connectDatabase({ uri: testMongoUri.href, migrateLegacy: false });
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
});

test.after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

test('health endpoint responds successfully', async () => {
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.match(body.message, /MongoDB/);
});

test('registered users remain authenticated after reloading persisted data', async () => {
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const registration = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test User',
      email: 'test@example.com',
      password: 'correct-horse-123',
      confirmPassword: 'correct-horse-123',
    }),
  });

  assert.equal(registration.status, 201);
  const { token } = await registration.json();

  const persistedUser = await User.findOne({ email: 'test@example.com' }).lean();
  assert.equal(persistedUser.name, 'Test User');

  const response = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.user.email, 'test@example.com');

  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'TEST@example.com', password: 'correct-horse-123' }),
  });
  assert.equal(login.status, 200);
  assert.equal((await login.json()).user.name, 'Test User');

  const removedBioRoute = await fetch(`${baseUrl}/api/ai/generate-bio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: 'Test User', role: 'Frontend Developer' }),
  });
  assert.equal(removedBioRoute.status, 404);
});

test('AI routes validate empty chatbot and interview requests', async () => {
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}/api/ai`;
  const chatResponse = await fetch(`${baseUrl}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: '   ' }] }),
  });
  assert.equal(chatResponse.status, 400);

  const interviewResponse = await fetch(`${baseUrl}/portfolio-assistant/turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answer: '', profile: emptyProfile(), messages: [] }),
  });
  assert.equal(interviewResponse.status, 400);

  const generationResponse = await fetch(`${baseUrl}/portfolio-assistant/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile: emptyProfile() }),
  });
  assert.equal(generationResponse.status, 422);
});

test('AI endpoints report missing credentials instead of returning a local draft', { skip: Boolean(aiConfig.openAiApiKey) }, async () => {
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'What is JavaScript?' }] }),
  });
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.match(body.message, /OPENAI_API_KEY/);
});

test('portfolio interview requires sufficient facts before generation', () => {
  const profile = emptyProfile();
  assert.equal(isProfileComplete(profile), false);
  assert.equal(profileProgress(profile), 0);

  assert.equal(isProfileComplete(completeProfile()), true);
  assert.equal(profileProgress(completeProfile()), 100);
});

test('chat API sends conversation history to the configured OpenAI model', async (context) => {
  const priorKey = aiConfig.openAiApiKey;
  aiConfig.openAiApiKey = 'test-key';
  context.mock.method(axios, 'post', async (url, payload, options) => {
    assert.equal(url, 'https://api.openai.com/v1/chat/completions');
    assert.equal(options.headers.Authorization, 'Bearer test-key');
    assert.equal(payload.model, aiConfig.openAiModel);
    assert.deepEqual(payload.messages.slice(-2), [
      { role: 'assistant', content: 'JavaScript is used to make websites interactive.' },
      { role: 'user', content: 'Where is it used?' },
    ]);
    return { data: { choices: [{ message: { content: 'It is used in browsers and on servers.' } }] } };
  });

  try {
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'assistant', content: 'JavaScript is used to make websites interactive.' },
          { role: 'user', content: 'Where is it used?' },
        ],
      }),
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).content, 'It is used in browsers and on servers.');
  } finally {
    aiConfig.openAiApiKey = priorKey;
  }
});

test('chat API sends system instructions and history to Gemini', async (context) => {
  const priorKey = aiConfig.geminiApiKey;
  const priorProvider = aiConfig.aiProvider;
  aiConfig.geminiApiKey = 'test-gemini-key';
  aiConfig.aiProvider = 'gemini';
  context.mock.method(axios, 'post', async (url, payload, options) => {
    assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/interactions');
    assert.equal(options.headers['x-goog-api-key'], 'test-gemini-key');
    assert.equal(options.headers['Api-Revision'], '2026-05-20');
    assert.equal(payload.system_instruction.includes('Portify AI Assistant'), true);
    assert.equal(payload.store, false);
    assert.deepEqual(payload.generation_config, { thinking_level: 'low', max_output_tokens: 2048 });
    assert.deepEqual(payload.input.slice(-2), [
      { type: 'model_output', content: [{ type: 'text', text: 'JavaScript is used to make websites interactive.' }] },
      { type: 'user_input', content: [{ type: 'text', text: 'Where is it used?' }] },
    ]);
    return { data: { steps: [{ type: 'model_output', content: [{ type: 'text', text: 'It is used in browsers and on servers.' }] }] } };
  });

  try {
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'assistant', content: 'JavaScript is used to make websites interactive.' },
          { role: 'user', content: 'Where is it used?' },
        ],
      }),
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).content, 'It is used in browsers and on servers.');
  } finally {
    aiConfig.geminiApiKey = priorKey;
    aiConfig.aiProvider = priorProvider;
  }
});

test('chat API explains exhausted OpenAI credits', async (context) => {
  const priorKey = aiConfig.openAiApiKey;
  aiConfig.openAiApiKey = 'test-key';
  context.mock.method(axios, 'post', async () => {
    throw Object.assign(new Error('Request failed'), {
      response: { status: 429, data: { error: { code: 'credit_balance_exhausted' } } },
    });
  });

  try {
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'Write a short bio.' }] }),
    });
    assert.equal(response.status, 503);
    assert.match((await response.json()).message, /credit balance is exhausted/i);
  } finally {
    aiConfig.openAiApiKey = priorKey;
  }
});

test('chat API preserves earlier context across a longer conversation', async (context) => {
  const priorKey = aiConfig.openAiApiKey;
  aiConfig.openAiApiKey = 'test-key';
  const messages = [];
  for (let index = 0; index < 44; index += 1) {
    messages.push({
      role: index % 2 === 0 ? 'user' : 'assistant',
      content: index === 0 ? 'I am building a portfolio for a frontend developer role.' : `Conversation detail ${index}.`,
    });
  }
  messages.push({ role: 'user', content: 'How do I make it better?' });

  context.mock.method(axios, 'post', async (_url, payload) => {
    assert.match(payload.messages[0].content, /resolve pronouns and short follow-ups/);
    assert.equal(payload.messages.length, messages.length + 1);
    assert.deepEqual(payload.messages[1], messages[0]);
    assert.deepEqual(payload.messages.at(-1), messages.at(-1));
    return { data: { choices: [{ message: { content: 'For your frontend portfolio, highlight projects and the decisions behind them.' } }] } };
  });

  try {
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
    assert.equal(response.status, 200);
    assert.match((await response.json()).content, /frontend portfolio/);
  } finally {
    aiConfig.openAiApiKey = priorKey;
  }
});

test('portfolio assistant returns model-collected facts and generated sections', async (context) => {
  const priorKey = aiConfig.openAiApiKey;
  aiConfig.openAiApiKey = 'test-key';
  const generated = {
    professionalBiography: 'Taylor Example is a student focused on accessible web applications.',
    aboutMe: 'I am studying computer science and learning JavaScript.',
    shortIntroduction: 'I am a student interested in frontend development.',
    careerObjective: 'I aim to grow as a frontend developer.',
    technicalSkillsDescription: 'I use JavaScript and am interested in accessible web applications.',
    projectDescriptions: '',
    experienceSummary: 'My experience includes coursework in web development.',
    achievementSummary: 'No certifications or awards were reported.',
    linkedInAbout: 'Computer science student focused on frontend development.',
  };
  context.mock.method(axios, 'post', async (_url, payload) => {
    if (payload.messages[0].content.includes('interview engine')) {
      const profile = emptyProfile();
      profile.personalDetails.fullName = 'Taylor Example';
      return {
        data: {
          choices: [{
            message: {
              content: JSON.stringify({ profile, nextQuestion: 'What professional title best describes you?', optionalQuestion: false }),
            },
          }],
        },
      };
    }
    assert.match(payload.messages[0].content, /about 90-140 words/);
    assert.match(payload.messages[0].content, /Never invent or imply a qualification/);
    assert.match(payload.messages[0].content, /LinkedIn/);
    return { data: { choices: [{ message: { content: JSON.stringify(generated) } }] } };
  });

  try {
    const address = server.address();
    const turnResponse = await fetch(`http://127.0.0.1:${address.port}/api/ai/portfolio-assistant/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answer: 'My name is Taylor Example.',
        stage: 'personalDetails',
        profile: emptyProfile(),
        messages: [{ role: 'user', content: 'My name is Taylor Example.' }],
      }),
    });
    assert.equal(turnResponse.status, 200);
    const turn = await turnResponse.json();
    assert.equal(turn.profile.personalDetails.fullName, 'Taylor Example');
    assert.equal(turn.nextQuestion, 'What professional title best describes you?');
    assert.equal(turn.complete, false);

    const generationResponse = await fetch(`http://127.0.0.1:${address.port}/api/ai/portfolio-assistant/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: completeProfile(), style: 'Professional' }),
    });
    assert.equal(generationResponse.status, 200);
    const result = await generationResponse.json();
    assert.deepEqual(result.content, generated);
    assert.equal(result.style, 'Professional');
  } finally {
    aiConfig.openAiApiKey = priorKey;
  }
});

test('template catalog includes all editor templates', async () => {
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/templates`);
  assert.equal(response.status, 200);
  const { templates } = await response.json();
  for (const id of ['blueprint', 'monochrome', 'citrus']) {
    assert.ok(templates.some((template) => template.id === id));
  }
});

test('portfolios can be published and read from their public website route', async () => {
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const registration = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Portfolio Owner',
      email: 'portfolio@example.com',
      password: 'correct-horse-123',
      confirmPassword: 'correct-horse-123',
    }),
  });
  const { token } = await registration.json();
  const uploadedResume = `data:application/pdf;base64,${'A'.repeat(1_600_000)}`;
  const uploadedPhoto = 'data:image/png;base64,iVBORw0KGgo=';

  const creation = await fetch(`${baseUrl}/api/portfolios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      title: 'Editorial Portfolio',
      templateId: 'editorial',
      personalInformation: {
        fullName: 'Portfolio Owner',
        title: 'Developer',
        resumeUrl: 'https://example.com/resume.pdf',
        resumeDataUrl: uploadedResume,
        photoDataUrl: uploadedPhoto,
        aiGeneratedContent: { professionalBiography: 'Portfolio Owner builds web applications.' },
        aiGeneratedStyle: 'Professional',
      },
      projects: [{ title: 'Sample project', imageDataUrl: uploadedPhoto }],
    }),
  });
  assert.equal(creation.status, 201);
  const { portfolio } = await creation.json();

  const publishing = await fetch(`${baseUrl}/api/portfolios/${portfolio.id}/publish`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(publishing.status, 200);

  const publicResponse = await fetch(`${baseUrl}/api/public/${portfolio.slug}`);
  assert.equal(publicResponse.status, 200);
  const publicBody = await publicResponse.json();
  assert.equal(publicBody.portfolio.status, 'published');
  assert.equal(publicBody.portfolio.personalInformation.resumeUrl, 'https://example.com/resume.pdf');
  assert.equal(publicBody.portfolio.personalInformation.resumeDataUrl, uploadedResume);
  assert.equal(publicBody.portfolio.personalInformation.photoDataUrl, uploadedPhoto);
  assert.equal(publicBody.portfolio.personalInformation.aiGeneratedContent.professionalBiography, 'Portfolio Owner builds web applications.');
  assert.equal(publicBody.portfolio.personalInformation.aiGeneratedStyle, 'Professional');
  assert.equal(publicBody.portfolio.projects[0].imageDataUrl, uploadedPhoto);
});
