const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const testDataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'portify-app-test-'));
process.env.PORTIFY_DATA_FILE = path.join(testDataDirectory, 'store.json');

const { store, loadStore } = require('../src/utils/store');
const app = require('../src/server');

let server;

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
});

test.after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  fs.rmSync(testDataDirectory, { recursive: true, force: true });
});

test('health endpoint responds successfully', async () => {
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
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

  store.users = [];
  loadStore();

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

  const aiResponse = await fetch(`${baseUrl}/api/ai/generate-bio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: 'Test User', role: 'Frontend Developer' }),
  });
  assert.equal(aiResponse.status, 200);
  const aiBody = await aiResponse.json();
  assert.equal(aiBody.success, true);
  assert.match(aiBody.content, /Test User/);
  assert.match(aiBody.content, /Frontend Developer/);
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
  assert.equal(publicBody.portfolio.projects[0].imageDataUrl, uploadedPhoto);
});
