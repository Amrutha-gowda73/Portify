const axios = require('axios');
const { githubToken } = require('../config/env');

async function getGitHubProfile(req, res) {
  const username = req.params.username;

  if (!username) {
    return res.status(400).json({ success: false, message: 'GitHub username is required.' });
  }

  try {
    const response = await axios.get(`https://api.github.com/users/${username}`, {
      headers: {
        ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
        'User-Agent': 'Portify-App',
      },
    });

    return res.json({
      success: true,
      profile: {
        login: response.data.login,
        name: response.data.name,
        bio: response.data.bio,
        publicRepos: response.data.public_repos,
        followers: response.data.followers,
        following: response.data.following,
        htmlUrl: response.data.html_url,
        avatarUrl: response.data.avatar_url,
      },
    });
  } catch (error) {
    const status = error.response?.status || 500;
    return res.status(status).json({ success: false, message: 'Unable to fetch GitHub profile.', error: error.message });
  }
}

async function getGitHubRepos(req, res) {
  const username = req.params.username;

  if (!username) {
    return res.status(400).json({ success: false, message: 'GitHub username is required.' });
  }

  try {
    const response = await axios.get(`https://api.github.com/users/${username}/repos?per_page=10`, {
      headers: {
        ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
        'User-Agent': 'Portify-App',
      },
    });

    return res.json({
      success: true,
      repos: response.data.map((repo) => ({
        id: repo.id,
        name: repo.name,
        description: repo.description,
        htmlUrl: repo.html_url,
        language: repo.language,
        stargazersCount: repo.stargazers_count,
        forksCount: repo.forks_count,
        openIssuesCount: repo.open_issues_count,
        updatedAt: repo.updated_at,
      })),
    });
  } catch (error) {
    const status = error.response?.status || 500;
    return res.status(status).json({ success: false, message: 'Unable to fetch GitHub repositories.', error: error.message });
  }
}

module.exports = { getGitHubProfile, getGitHubRepos };
