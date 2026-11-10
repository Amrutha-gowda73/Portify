import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Briefcase, Check, Code2, Download, ExternalLink, FileText, ImagePlus, LayoutTemplate, Plus, Sparkles, Trash2, Users, Wand2 } from 'lucide-react';
import { PortfolioAssistant, PortifyChatbot } from './PortfolioAssistant.jsx';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AuthContext = createContext(null);

const templateOptions = [
  { id: 'minimal', name: 'Minimal', description: 'Clean and focused layout for personal projects.' },
  { id: 'developer-dark', name: 'Developer Dark', description: 'Dark-mode aesthetic with high contrast cards.' },
  { id: 'professional', name: 'Professional', description: 'Formal structure for career-focused portfolios.' },
  { id: 'creative', name: 'Creative', description: 'A more expressive and vibrant visual identity.' },
  { id: 'editorial', name: 'Editorial', description: 'A warm, typography-led layout for personal storytelling.' },
  { id: 'terminal', name: 'Terminal', description: 'A crisp developer-inspired interface with monospace details.' },
  { id: 'blueprint', name: 'Blueprint', description: 'A structured, technical layout with cool architectural tones.' },
  { id: 'monochrome', name: 'Monochrome', description: 'A sharp black-and-white portfolio built around strong typography.' },
  { id: 'citrus', name: 'Citrus', description: 'A fresh, bright layout with lively green and golden accents.' },
];

const emptyPortfolio = {
  title: 'Untitled portfolio',
  templateId: 'minimal',
  slug: 'my-portfolio',
  personalInformation: {
    fullName: '',
    title: '',
    bio: '',
    location: '',
    email: '',
    linkedin: '',
    github: '',
    website: '',
    resumeUrl: '',
  },
  skills: [],
  projects: [],
  experience: [],
  education: [],
  certifications: [],
  enabledSections: { about: true, skills: true, projects: true, experience: true, education: true, certifications: true },
  themeSettings: { theme: 'light', accent: '#6d5efc', font: 'Inter', layout: 'classic' },
  status: 'draft',
};

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('portifyToken');
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      ...options,
    });
  } catch {
    throw new Error(`Cannot reach the Portify API at ${API_BASE_URL}. Start the backend and check its database connection.`);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && token && !path.startsWith('/auth/')) {
      window.dispatchEvent(new Event('portify:session-expired'));
    }
    throw new Error(data.message || 'Something went wrong.');
  }

  return data;
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character]);
}

function safeExternalUrl(value = '') {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function safeResumeHref(information = {}) {
  const uploadedPdf = information.resumeDataUrl || '';
  if (/^data:application\/pdf;base64,[A-Za-z0-9+/]+={0,2}$/.test(uploadedPdf)) return uploadedPdf;
  return safeExternalUrl(information.resumeUrl || '');
}

function safeImageDataUrl(value = '') {
  return /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value) ? value : '';
}

function exportPortfolioHtml(portfolio) {
  const safeUrl = (value) => {
    try {
      const url = new URL(value);
      return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? escapeHtml(url.href) : '';
    } catch {
      return '';
    }
  };
  const info = portfolio.personalInformation || {};
  const accent = /^#[0-9a-f]{6}$/i.test(portfolio.themeSettings?.accent || '') ? portfolio.themeSettings.accent : '#6d5efc';
  const skills = (portfolio.skills || []).map((skill) => `<span>${escapeHtml(skill)}</span>`).join('');
  const projects = (portfolio.projects || []).map((project) => `
    <article class="project">
      ${safeImageDataUrl(project.imageDataUrl) ? `<img class="project-photo" src="${escapeHtml(safeImageDataUrl(project.imageDataUrl))}" alt="${escapeHtml(project.title || 'Project')} screenshot">` : ''}
      <h3>${escapeHtml(project.title || 'Project')}</h3>
      <p>${escapeHtml(project.description || '')}</p>
      <p class="tags">${(project.technologies || []).map((technology) => `<span>${escapeHtml(technology)}</span>`).join('')}</p>
      ${safeUrl(project.githubUrl) ? `<a href="${safeUrl(project.githubUrl)}">Source code</a>` : ''}
      ${safeUrl(project.demoUrl) ? `<a href="${safeUrl(project.demoUrl)}">Live demo</a>` : ''}
    </article>`).join('');
  const links = [
    ['GitHub', info.github],
    ['LinkedIn', info.linkedin],
    ['Website', info.website],
    ['Resume', safeResumeHref(info)],
  ].filter(([label, url]) => label === 'Resume' ? Boolean(url) : Boolean(safeUrl(url)))
    .map(([label, url]) => `<a href="${escapeHtml(label === 'Resume' ? url : safeUrl(url))}">${escapeHtml(label)}</a>`)
    .join('');
  const profilePhoto = safeImageDataUrl(info.photoDataUrl);
  const section = (title, content) => content ? `<section><h2>${title}</h2>${content}</section>` : '';
  const aboutContent = `${info.bio ? `<p>${escapeHtml(info.bio)}</p>` : ''}${info.email ? `<a href="mailto:${escapeHtml(info.email)}">${escapeHtml(info.email)}</a>` : ''}`;
  const sections = portfolio.enabledSections || {};
  const portfolioSections = [
    sections.about !== false ? section('About', aboutContent) : '',
    sections.skills !== false ? section('Skills', `<div class="tags">${skills}</div>`) : '',
    sections.projects !== false ? section('Projects', projects) : '',
    sections.experience !== false ? section('Experience', (portfolio.experience || []).map((item) => `<article><h3>${escapeHtml(item.role || item.institution || '')}</h3><p>${escapeHtml(item.institution || '')}</p><p>${escapeHtml(item.description || '')}</p></article>`).join('')) : '',
    sections.education !== false ? section('Education', (portfolio.education || []).map((item) => `<article><h3>${escapeHtml(item.degree || 'Education')}</h3><p>${escapeHtml(item.institution || '')}</p><p>${escapeHtml(item.description || '')}</p></article>`).join('')) : '',
    sections.certifications !== false ? section('Certifications', (portfolio.certifications || []).map((item) => `<article><h3>${escapeHtml(item.name || 'Certification')}</h3><p>${escapeHtml(item.issuer || '')}</p></article>`).join('')) : '',
  ].join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(info.title || portfolio.title || 'Developer portfolio')}">
  <title>${escapeHtml(info.fullName || portfolio.title || 'Portfolio')}</title>
  <style>
    :root{font-family:${portfolio.themeSettings?.font === 'Georgia' ? 'Georgia,serif' : 'Inter,Arial,sans-serif'};color:#172033;background:#f7f8fc;--accent:${accent}}
    *{box-sizing:border-box}body{margin:0}.wrap{width:min(860px,calc(100% - 36px));margin:0 auto;padding:64px 0}
    header{padding:0 0 28px;border-bottom:1px solid #dce2ee}header span{color:var(--accent);text-transform:uppercase;letter-spacing:.12em;font-size:.8rem}
    .identity{display:flex;align-items:center;gap:18px}.profile-photo{width:96px;height:96px;border-radius:50%;object-fit:cover}.project-photo{width:100%;max-height:240px;object-fit:cover;border-radius:8px;margin-bottom:12px}
    h1{font-size:clamp(2.4rem,7vw,4rem);letter-spacing:-.06em;margin:.4em 0 .2em}h2{margin:0 0 16px;color:var(--accent)}
    section{padding:28px 0;border-bottom:1px solid #dce2ee}article{padding:14px;margin:12px 0;border:1px solid #e2e8f0;border-radius:14px;background:#fff}
    .tags{display:flex;flex-wrap:wrap;gap:8px}.tags span{padding:6px 10px;background:#ede9fe;border-radius:999px;font-size:.85rem}
    a{color:var(--accent);margin-right:12px}footer{text-align:center;padding:28px;color:#64748b;font-size:.85rem}
    @media(max-width:600px){.wrap{padding:32px 0}article{padding:12px}}
  </style>
</head>
<body><main class="wrap">
  <header><div class="identity">${profilePhoto ? `<img class="profile-photo" src="${escapeHtml(profilePhoto)}" alt="${escapeHtml(info.fullName || 'Profile')} photo">` : ''}<div><span>${escapeHtml(info.title || 'Developer')}</span><h1>${escapeHtml(info.fullName || portfolio.title || 'Portfolio')}</h1></div></div>
  ${info.location ? `<p>${escapeHtml(info.location)}</p>` : ''}<nav>${links}</nav></header>
  ${portfolioSections}
  <footer>Portfolio exported from Portify.</footer>
</main></body></html>`;
}

function downloadPortfolioHtml(portfolio) {
  const file = new Blob([exportPortfolioHtml(portfolio)], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${(portfolio.slug || portfolio.title || 'portfolio').replace(/[^a-z0-9-]/gi, '-')}.html`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('portifyUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState(() => localStorage.getItem('portifyToken') || '');

  useEffect(() => {
    if (user) {
      localStorage.setItem('portifyUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('portifyUser');
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('portifyToken', token);
    } else {
      localStorage.removeItem('portifyToken');
    }
  }, [token]);

  useEffect(() => {
    const handleExpiredSession = () => {
      setUser(null);
      setToken('');
    };
    window.addEventListener('portify:session-expired', handleExpiredSession);
    return () => window.removeEventListener('portify:session-expired', handleExpiredSession);
  }, []);

  const value = useMemo(() => ({ user, token, setUser, setToken }), [user, token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth() {
  return useContext(AuthContext);
}

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  return user ? children : <Navigate to="/login" replace state={{ from: location }} />;
}

function HomePage() {
  const { user } = useAuth();
  const [previewTemplate, setPreviewTemplate] = useState(null);

  return (
    <div className="page-shell">
      <header className="topbar">
        <Link to="/" className="brand-wrap" aria-label="Portify home">
          <div className="brand-mark">P</div>
          <span>Portify</span>
        </Link>
        <nav className="nav-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#templates">Templates</a>
          <a href="#github-guide">GitHub Pages</a>
          <a href="#about">About</a>
        </nav>
        <div className="nav-actions">
          {!user ? (
            <>
              <Link to="/login" className="btn btn-ghost">Log In</Link>
              <Link to="/login" className="btn btn-primary">Get Started</Link>
            </>
          ) : (
            <>
              <span className="welcome-name">Hello, {user.name}</span>
              <Link to="/dashboard" className="btn btn-primary">Dashboard</Link>
            </>
          )}
        </div>
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <span className="eyebrow">AI-powered portfolio builder</span>
            <h1>Your Skills Deserve a Stunning Portfolio.</h1>
            <p>
              Create a professional developer portfolio in minutes. Showcase your skills,
              highlight your projects, and build your online presence without starting from scratch.
            </p>
            <div className="hero-actions">
              <Link to={user ? '/dashboard' : '/login'} className="btn btn-primary">Create My Portfolio</Link>
              <a href="#templates" className="btn btn-secondary">Explore Templates</a>
            </div>
          </div>
          <div className="hero-preview">
            <div className="preview-window">
              <div className="preview-topbar">
                <span /><span /><span />
              </div>
              <div className="preview-content">
                <div className="preview-card large">
                  <span className="chip">Available for work</span>
                  <h3>Alex Morgan</h3>
                  <p>Full Stack Developer</p>
                </div>
                <div className="preview-row">
                  <div className="preview-card small"><strong>12</strong><span>Projects</span></div>
                  <div className="preview-card small"><strong>5 yrs</strong><span>Experience</span></div>
                </div>
                <div className="preview-tech">
                  <span>React</span>
                  <span>Node</span>
                  <span>MongoDB</span>
                  <span>UI</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="section-block">
          <div className="section-heading">
            <span className="eyebrow">Features</span>
            <h2>Everything you need to build a standout developer brand.</h2>
          </div>
          <div className="feature-grid">
            {[
              { title: 'Professional templates', description: 'Choose a polished layout and make it your own.', Icon: LayoutTemplate },
              { title: 'Live portfolio preview', description: 'See every edit take shape before you publish.', Icon: Sparkles },
              { title: 'AI Portfolio Assistant', description: 'Build a detailed profile through an interview, then generate and refine personalized portfolio content.', Icon: Wand2 },
              { title: 'AI career and coding guide', description: 'Ask contextual questions about programming, career planning, and presenting your work.', Icon: Sparkles },
              { title: 'Project showcase', description: 'Highlight the work, tools, and links that matter.', Icon: Briefcase },
              { title: 'Theme customization', description: 'Set your accent color and typography to fit your style.', Icon: Code2 },
              { title: 'Resume integration', description: 'Add a shareable resume link to your public portfolio.', Icon: Users },
            ].map(({ title, description, Icon }) => (
              <article key={title} className="feature-card">
                <div className="icon-box"><Icon size={18} /></div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="section-block alt-section">
          <div className="section-heading">
            <span className="eyebrow">How it works</span>
            <h2>From your profile to a live portfolio.</h2>
          </div>
          <div className="workflow-track" aria-label="Portfolio publishing flowchart">
            {[
              { title: 'Account', detail: 'Register or log in.' },
              { title: 'Profile', detail: 'Add your details, work, and resume.' },
              { title: 'Create', detail: 'Choose a design and build portfolio content with the AI assistant.' },
              { title: 'Review', detail: 'Check the live preview and save.' },
              { title: 'Publish', detail: 'Choose a Portify site or GitHub Pages.' },
            ].map((step, index) => (
              <div key={step.title} className="workflow-step">
                <span className="workflow-index">0{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.detail}</p>
                {index < 4 && <ArrowRight className="workflow-arrow" size={18} aria-hidden="true" />}
              </div>
            ))}
          </div>
          <div className="workflow-branches">
            <span>Choose where to publish</span>
            <div>
              <Link
                to={user ? '/editor?templateId=minimal' : '/login'}
                state={user ? undefined : { from: { pathname: '/editor', search: '?templateId=minimal' } }}
                className="btn btn-primary"
              >Create a Portify website</Link>
              <a href="#github-guide" className="btn btn-secondary">Use GitHub Pages</a>
            </div>
          </div>
        </section>

        <section id="github-guide" className="section-block">
          <div className="section-heading">
            <span className="eyebrow">GitHub Pages</span>
            <h2>Put your exported portfolio on GitHub.</h2>
            <p>GitHub Pages hosts the static HTML export. The editor and live Portify preview still need the Portify backend.</p>
          </div>
          <ol className="github-publish-list">
            <li><strong>Export</strong><span>Open your editor and choose Export HTML.</span></li>
            <li><strong>Name the page</strong><span>Rename the downloaded file to <code>index.html</code>.</span></li>
            <li><strong>Create a repository</strong><span>At GitHub, create a public repository for your portfolio.</span></li>
            <li><strong>Upload the page</strong><span>Add <code>index.html</code> to the repository root and commit it.</span></li>
            <li><strong>Enable Pages</strong><span>Open Settings, then Pages. Choose deploy from a branch, select <code>main</code> and <code>/(root)</code>, then save.</span></li>
            <li><strong>Open your site</strong><span>After GitHub finishes deployment, use the URL shown in the Pages settings.</span></li>
          </ol>
          <a className="btn btn-secondary github-start-link" href="https://github.com/new" target="_blank" rel="noreferrer"><Code2 size={16} /> Create a GitHub repository</a>
        </section>

        <section id="templates" className="section-block">
          <div className="section-heading">
            <span className="eyebrow">Template gallery</span>
            <h2>Choose a design that matches your work style.</h2>
          </div>
          <div className="template-grid">
            {templateOptions.map((template) => (
              <article key={template.id} className="template-card">
                <div className={`template-preview ${template.id}`}>
                  <div className="template-preview-window">
                    <span className="template-preview-line short" />
                    <span className="template-preview-line" />
                    <span className="template-preview-line medium" />
                    <div className="template-preview-pills"><i /><i /><i /></div>
                  </div>
                </div>
                <h3>{template.name}</h3>
                <p>{template.description}</p>
                <div className="template-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setPreviewTemplate(template)}>Preview</button>
                  <Link to={`/editor?templateId=${template.id}`} className="btn btn-primary">Use Template</Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer id="about" className="footer">
        <div>
          <Link to="/" className="brand-wrap"><div className="brand-mark">P</div><span>Portify</span></Link>
          <p>Build a portfolio that helps people understand the quality of your work.</p>
        </div>
        <div>
          <h4>Navigate</h4>
          <ul>
            <li><a href="#">Home</a></li>
            <li><a href="#templates">Explore Templates</a></li>
            <li><a href="#features">Features</a></li>
            <li><a href="#github-guide">GitHub Pages guide</a></li>
            <li><a href="#about">About</a></li>
          </ul>
        </div>
        <div>
          <h4>Legal</h4>
          <ul>
            <li><a href="mailto:hello@portify.app?subject=Privacy%20Policy">Privacy Policy</a></li>
            <li><a href="mailto:hello@portify.app?subject=Terms%20of%20Service">Terms of Service</a></li>
          </ul>
        </div>
        <div>
          <h4>Contact</h4>
          <ul>
            <li><a href="mailto:hello@portify.app">hello@portify.app</a></li>
          </ul>
        </div>
      </footer>
      {previewTemplate && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setPreviewTemplate(null);
        }}>
          <section className="template-modal" role="dialog" aria-modal="true" aria-labelledby="template-modal-title">
            <div className="template-modal-heading">
              <div><span className="eyebrow">Template preview</span><h2 id="template-modal-title">{previewTemplate.name}</h2></div>
              <button type="button" className="icon-button modal-close" aria-label="Close template preview" onClick={() => setPreviewTemplate(null)}>×</button>
            </div>
            <PortfolioPreview
              portfolio={{
                ...emptyPortfolio,
                title: 'Your portfolio',
                templateId: previewTemplate.id,
                personalInformation: { ...emptyPortfolio.personalInformation, fullName: 'Your name', title: 'Your professional title', bio: 'Your introduction will appear here.' },
                skills: ['Your skills', 'Your expertise'],
                projects: [{ title: 'Your project', description: 'Showcase the work you are proud of.', technologies: ['Technology', 'Tools'] }],
              }}
            />
            <div className="template-modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setPreviewTemplate(null)}>Close</button>
              <Link to={`/editor?templateId=${previewTemplate.id}`} className="btn btn-primary">Use this template</Link>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, setToken } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLogin = mode === 'login';

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      if (!isLogin && form.password !== form.confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      const payload = isLogin ? { email: form.email, password: form.password } : {
        name: form.name,
        email: form.email,
        password: form.password,
        confirmPassword: form.confirmPassword,
      };

      const result = await apiRequest(endpoint, { method: 'POST', body: JSON.stringify(payload) });
      setToken(result.token);
      setUser(result.user);
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="brand-wrap auth-brand"><span className="brand-mark">P</span>Portify</Link>
        <h1>{isLogin ? 'Welcome back' : 'Create your account'}</h1>
        <p>{isLogin ? 'Sign in to manage your portfolios.' : 'Start building your professional portfolio.'}</p>
        <div className="auth-tabs">
          <button className={isLogin ? 'active' : ''} type="button" onClick={() => setMode('login')}>Log In</button>
          <button className={!isLogin ? 'active' : ''} type="button" onClick={() => setMode('register')}>Register</button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {!isLogin && (
            <label>
              Full name
              <input name="name" value={form.name} onChange={handleChange} required />
            </label>
          )}
          <label>
            Email address
            <input type="email" name="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
            <small className="field-hint">Enter the email address you used to register.</small>
          </label>
          <label>
            Password
            <input type="password" name="password" value={form.password} onChange={handleChange} required minLength={8} />
          </label>
          {!isLogin && (
            <label>
              Confirm password
              <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} required minLength={8} />
            </label>
          )}

          {error && <p className="error-message">{error}</p>}

          <button className="btn btn-primary btn-wide" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait...' : isLogin ? 'Log In' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}

function DashboardPage() {
  const navigate = useNavigate();
  const { user, setUser, setToken } = useAuth();
  const [portfolios, setPortfolios] = useState(null);
  const loading = portfolios === null;
  const [error, setError] = useState('');

  async function loadPortfolios() {
    try {
      const result = await apiRequest('/portfolios');
      setPortfolios(result.portfolios || []);
    } catch (error) {
      setError(error.message);
      setPortfolios([]);
    }
  }

  useEffect(() => {
    let isMounted = true;
    apiRequest('/portfolios')
      .then((result) => {
        if (isMounted) setPortfolios(result.portfolios || []);
      })
      .catch((requestError) => {
        if (!isMounted) return;
        setError(requestError.message);
        setPortfolios([]);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreatePortfolio = () => navigate('/editor?templateId=minimal');

  const handleDuplicate = async (portfolioId) => {
    try {
      setError('');
      await apiRequest(`/portfolios/${portfolioId}/duplicate`, { method: 'POST' });
      await loadPortfolios();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleLogout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setToken('');
      setUser(null);
      navigate('/');
    }
  };

  return (
    <div className="dashboard-shell">
      <header className="dash-header">
        <div>
          <p className="eyebrow">Welcome back</p>
          <h2>{user?.name || 'Developer'}</h2>
        </div>
        <div className="dashboard-header-actions">
          <Link to="/" className="btn btn-ghost">Home</Link>
          <button type="button" className="btn btn-ghost" onClick={handleLogout}>Log out</button>
          <button type="button" className="btn btn-primary" onClick={handleCreatePortfolio}>
            Create New Portfolio
          </button>
        </div>
      </header>

      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {loading ? (
        <div className="loading-state" role="status">Loading your portfolios…</div>
      ) : portfolios.length === 0 ? (
        <div className="empty-state">
          <h3>No portfolios yet</h3>
          <p>Start in the editor, then save a draft or publish your first portfolio.</p>
          <button type="button" className="btn btn-primary" onClick={handleCreatePortfolio}>
            Create a portfolio
          </button>
        </div>
      ) : (
        <div className="portfolio-grid">
          {portfolios.map((portfolio) => (
            <article key={portfolio.id} className="portfolio-card">
              <div className="portfolio-meta">
                <span className={`status-badge ${portfolio.status}`}>{portfolio.status}</span>
                <small>Updated {new Date(portfolio.updatedAt).toLocaleDateString()}</small>
              </div>
              <h3>{portfolio.title}</h3>
              <p>{portfolio.slug}</p>
              <div className="portfolio-actions">
                <button type="button" className="btn btn-ghost" onClick={() => navigate(`/editor/${portfolio.id}`)}>Edit</button>
                {portfolio.status === 'published' ? (
                  <Link to={`/public/${portfolio.slug}`} className="btn btn-secondary"><ExternalLink size={15} /> Visit site</Link>
                ) : (
                  <button type="button" className="btn btn-secondary" onClick={() => navigate(`/editor/${portfolio.id}`)}>Preview</button>
                )}
                <button type="button" className="btn btn-ghost" onClick={() => handleDuplicate(portfolio.id)}>Duplicate</button>
                <button type="button" className="btn btn-danger" onClick={async () => {
                  if (window.confirm('Delete this portfolio?')) {
                    try {
                      await apiRequest(`/portfolios/${portfolio.id}`, { method: 'DELETE' });
                      await loadPortfolios();
                    } catch (requestError) {
                      setError(requestError.message);
                    }
                  }
                }}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function EditorPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [portfolio, setPortfolio] = useState(() => ({
    ...emptyPortfolio,
    templateId: searchParams.get('templateId') || emptyPortfolio.templateId,
    personalInformation: { ...emptyPortfolio.personalInformation },
    themeSettings: { ...emptyPortfolio.themeSettings },
    enabledSections: { ...emptyPortfolio.enabledSections },
    skills: [],
    projects: [],
    education: [],
    experience: [],
    certifications: [],
  }));
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [aiProjectIndex, setAiProjectIndex] = useState(null);
  const [generatedProjectDescriptions, setGeneratedProjectDescriptions] = useState({});
  const [aiNotice, setAiNotice] = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  const [githubRepos, setGithubRepos] = useState([]);
  const [githubLoading, setGithubLoading] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [driveResumeUrl, setDriveResumeUrl] = useState('');

  const readPhotoDataUrl = (file) => new Promise((resolve, reject) => {
    if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      reject(new Error('Choose a JPG, PNG, or WebP image.'));
      return;
    }
    if (file.size > 1024 * 1024) {
      reject(new Error('Choose an image smaller than 1 MB.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read this image.'));
    reader.readAsDataURL(file);
  });

  const setProfilePhoto = async (event) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      updateField('personalInformation.photoDataUrl', await readPhotoDataUrl(file));
      setError('');
      setSuccess('Profile photo added. Save the portfolio to keep it.');
    } catch (photoError) {
      setError(photoError.message);
    }
  };

  const setProjectPhoto = async (event, index) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      updateListItem('projects', index, 'imageDataUrl', await readPhotoDataUrl(file));
      setError('');
      setSuccess('Project photo added. Save the portfolio to keep it.');
    } catch (photoError) {
      setError(photoError.message);
    }
  };

  useEffect(() => {
    const fetchPortfolio = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const result = await apiRequest(`/portfolios/${id}`);
        const saved = result.portfolio;
        setPortfolio({
          ...emptyPortfolio,
          ...saved,
          personalInformation: { ...emptyPortfolio.personalInformation, ...saved.personalInformation },
          themeSettings: { ...emptyPortfolio.themeSettings, ...saved.themeSettings },
          enabledSections: { ...emptyPortfolio.enabledSections, ...saved.enabledSections },
          skills: saved.skills || [],
          projects: saved.projects || [],
          education: saved.education || [],
          experience: saved.experience || [],
          certifications: saved.certifications || [],
        });
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, [id]);

  const updateField = (path, value) => {
    const [group, field] = path.split('.');
    setPortfolio((current) => {
      if (field) {
        return { ...current, [group]: { ...current[group], [field]: value } };
      }
      return { ...current, [group]: value };
    });
  };

  const updateListItem = (listName, index, field, value) => {
    setPortfolio((current) => ({
      ...current,
      [listName]: current[listName].map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addListItem = (listName, item) => {
    setPortfolio((current) => ({ ...current, [listName]: [...current[listName], item] }));
  };

  const removeListItem = (listName, index) => {
    setPortfolio((current) => ({
      ...current,
      [listName]: current[listName].filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const addSkill = (event) => {
    event.preventDefault();
    const value = skillInput.trim();
    if (!value || portfolio.skills.some((skill) => skill.toLowerCase() === value.toLowerCase())) return;
    updateField('skills', [...portfolio.skills, value]);
    setSkillInput('');
  };

  const improveProjectDescription = async (index) => {
    const project = portfolio.projects[index];
    if (!project.title || !project.description || !project.technologies?.length) {
      setError('Add a project title, description, and at least one technology before using AI.');
      return;
    }
    setError('');
    setSuccess('');
    setAiProjectIndex(index);
    try {
      const result = await apiRequest('/ai/improve-project', {
        method: 'POST',
        body: JSON.stringify({
          title: project.title,
          technologies: project.technologies,
          details: project.description,
        }),
      });
      setGeneratedProjectDescriptions((current) => ({ ...current, [index]: result.content || '' }));
      setAiNotice(result.notice || '');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setAiProjectIndex(null);
    }
  };

  const loadGitHubRepos = async (event) => {
    event.preventDefault();
    const username = githubUsername.trim();
    if (!username) {
      setError('Enter a GitHub username to find repositories.');
      return;
    }
    setError('');
    setGithubLoading(true);
    try {
      const [profileResult, reposResult] = await Promise.all([
        apiRequest(`/github/${encodeURIComponent(username)}`),
        apiRequest(`/github/${encodeURIComponent(username)}/repos`),
      ]);
      setGithubRepos(reposResult.repos || []);
      if (profileResult.profile?.htmlUrl && !portfolio.personalInformation?.github) {
        updateField('personalInformation.github', profileResult.profile.htmlUrl);
      }
    } catch (requestError) {
      setError(requestError.message);
      setGithubRepos([]);
    } finally {
      setGithubLoading(false);
    }
  };

  const importGitHubRepo = (repo) => {
    if (portfolio.projects.some((project) => project.githubUrl === repo.htmlUrl)) return;
    addListItem('projects', {
      title: repo.name,
      description: repo.description || '',
      technologies: repo.language ? [repo.language] : [],
      githubUrl: repo.htmlUrl,
      demoUrl: '',
    });
  };

  const attachResumePdf = async (event) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf') || file.size > 5 * 1024 * 1024) {
      setError('Choose a PDF resume smaller than 5 MB.');
      return;
    }

    try {
      if (await file.slice(0, 5).text() !== '%PDF-') {
        setError('This file does not appear to be a valid PDF.');
        return;
      }
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Unable to read this PDF.'));
        reader.readAsDataURL(file);
      });
      updateField('personalInformation.resumeDataUrl', dataUrl);
      updateField('personalInformation.resumeFileName', file.name);
      updateField('personalInformation.resumeUrl', '');
      setError('');
      setSuccess('Resume attached. Save the portfolio to keep it.');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const importDriveResume = () => {
    try {
      const shareUrl = new URL(driveResumeUrl.trim());
      if (!['drive.google.com', 'docs.google.com'].includes(shareUrl.hostname)) {
        throw new Error('Paste a Google Drive or Google Docs share link.');
      }
      const fileId = shareUrl.pathname.match(/\/(?:file|document)\/d\/([^/]+)/)?.[1] || shareUrl.searchParams.get('id');
      if (!fileId) throw new Error('That link does not include a Google Drive file ID.');

      const importedUrl = shareUrl.hostname === 'docs.google.com'
        ? `https://docs.google.com/document/d/${encodeURIComponent(fileId)}/export?format=pdf`
        : `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
      updateField('personalInformation.resumeUrl', importedUrl);
      updateField('personalInformation.resumeDataUrl', '');
      updateField('personalInformation.resumeFileName', '');
      setError('');
      setSuccess('Google Drive resume link added. Set its sharing access to anyone with the link.');
    } catch (requestError) {
      setError(requestError.message || 'Enter a valid Google Drive share link.');
    }
  };

  const handleSave = async (status = 'draft', portfolioToSave = portfolio) => {
    if (!portfolioToSave.title.trim()) {
      setError('Add a portfolio title before saving.');
      return null;
    }
    if (status === 'published' && (!portfolioToSave.personalInformation.fullName.trim() || !portfolioToSave.personalInformation.title.trim())) {
      setError('Add your name and professional title before publishing.');
      return null;
    }
    if (status === 'published' && !portfolioToSave.slug.trim()) {
      setError('Add a public URL slug before publishing.');
      return null;
    }
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      let savedPortfolio;
      if (!id) {
        const result = await apiRequest('/portfolios', {
          method: 'POST',
          body: JSON.stringify({ ...portfolioToSave, status: 'draft' }),
        });
        savedPortfolio = result.portfolio;
        if (status === 'published') {
          const publishResult = await apiRequest(`/portfolios/${savedPortfolio.id}/publish`, { method: 'POST' });
          savedPortfolio = publishResult.portfolio;
        }
        navigate(`/editor/${savedPortfolio.id}`, { replace: true });
      } else {
        const result = await apiRequest(`/portfolios/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ ...portfolioToSave, status: 'draft' }),
        });
        savedPortfolio = result.portfolio;
        if (status === 'published') {
          const publishResult = await apiRequest(`/portfolios/${id}/publish`, { method: 'POST' });
          savedPortfolio = publishResult.portfolio;
        } else if (portfolioToSave.status === 'published') {
          const unpublishResult = await apiRequest(`/portfolios/${id}/unpublish`, { method: 'POST' });
          savedPortfolio = unpublishResult.portfolio;
        }
      }

      setPortfolio((current) => ({ ...current, ...savedPortfolio }));
      setSuccess(status === 'published' ? 'Portfolio published successfully.' : 'Draft saved.');
      return savedPortfolio;
    } catch (requestError) {
      setError(requestError.message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const saveAssistantContent = async (generatedContent, style) => {
    const updatedPortfolio = {
      ...portfolio,
      personalInformation: {
        ...portfolio.personalInformation,
        bio: generatedContent.professionalBiography || portfolio.personalInformation.bio,
        aiGeneratedContent: generatedContent,
        aiGeneratedStyle: style,
      },
    };
    setPortfolio(updatedPortfolio);
    const savedPortfolio = await handleSave('draft', updatedPortfolio);
    if (!savedPortfolio) throw new Error('Your generated content could not be saved. Review the portfolio error above and try again.');
  };

  const handleExport = async () => {
    const savedPortfolio = await handleSave(portfolio.status === 'published' ? 'published' : 'draft');
    if (savedPortfolio) downloadPortfolioHtml(savedPortfolio);
  };

  if (loading) return <p className="page-note">Loading your portfolio editor...</p>;

  return (
    <div className="editor-shell">
      <div className="editor-panel">
        <div className="panel-header">
          <div>
            <Link to="/dashboard" className="back-link"><ArrowLeft size={16} /> Dashboard</Link>
            <h2>Portfolio editor</h2>
          </div>
          <div className="editor-actions">
            <button type="button" className="btn btn-ghost" onClick={handleExport} disabled={saving}>
              <Download size={15} /> Export HTML
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => handleSave('draft')} disabled={saving}>
              {saving ? 'Saving…' : 'Save Draft'}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => handleSave('published')} disabled={saving}>
              {saving ? 'Saving…' : 'Publish'}
            </button>
          </div>
        </div>

        {error && <div className="notice notice-error" role="alert">{error}</div>}
        {success && <div className="notice notice-success" role="status">
          <Check size={16} /> {success}
          {portfolio.status === 'published' && <Link to={`/public/${portfolio.slug}`} target="_blank" rel="noreferrer">Visit website <ExternalLink size={14} /></Link>}
        </div>}

        <section className="editor-section">
          <h3>Start with a template</h3>
          <div className="template-picker">
            {templateOptions.map((template) => (
              <button
                key={template.id}
                type="button"
                className={`template-choice ${portfolio.templateId === template.id ? 'selected' : ''}`}
                onClick={() => updateField('templateId', template.id)}
                aria-pressed={portfolio.templateId === template.id}
              >
                <span>{template.name}</span>
                {portfolio.templateId === template.id && <Check size={16} />}
              </button>
            ))}
          </div>
        </section>

        <div className="field-group">
          <label>
            Portfolio title
            <input value={portfolio.title || ''} onChange={(e) => updateField('title', e.target.value)} />
          </label>
          <label>
            Public URL slug
            <div className="slug-input"><span>portify.app/p/</span><input value={portfolio.slug || ''} onChange={(e) => updateField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} /></div>
          </label>
        </div>

        <div className="field-group">
          <label>
            Full name
            <input value={portfolio.personalInformation?.fullName || ''} onChange={(e) => updateField('personalInformation.fullName', e.target.value)} />
          </label>
          <label>
            Professional title
            <input value={portfolio.personalInformation?.title || ''} onChange={(e) => updateField('personalInformation.title', e.target.value)} />
          </label>
          <label>
            Location
            <input value={portfolio.personalInformation?.location || ''} onChange={(e) => updateField('personalInformation.location', e.target.value)} />
          </label>
          <div className="email-profile-field">
            <label htmlFor="portfolio-public-email">Public email</label>
            <div className="email-profile-controls">
              <input id="portfolio-public-email" type="email" autoComplete="email" placeholder={user?.email || 'you@example.com'} value={portfolio.personalInformation?.email || ''} onChange={(e) => updateField('personalInformation.email', e.target.value)} />
              {user?.email && <button type="button" className="btn btn-ghost" onClick={() => updateField('personalInformation.email', user.email)}>Use login email</button>}
            </div>
            <small className="field-hint">Enter a valid email address visitors can use to contact you. It can differ from your login email.</small>
          </div>
          <label>
            GitHub URL
            <input type="url" value={portfolio.personalInformation?.github || ''} onChange={(e) => updateField('personalInformation.github', e.target.value)} />
          </label>
          <label>
            LinkedIn URL
            <input type="url" value={portfolio.personalInformation?.linkedin || ''} onChange={(e) => updateField('personalInformation.linkedin', e.target.value)} />
          </label>
          <label>
            Personal website
            <input type="url" value={portfolio.personalInformation?.website || ''} onChange={(e) => updateField('personalInformation.website', e.target.value)} />
          </label>
        </div>

        <section className="editor-section">
          <h3>Profile photo</h3>
          <label className="photo-upload-control">
            <ImagePlus size={16} /> Choose a photo (JPG, PNG, or WebP, max 1 MB)
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={setProfilePhoto} />
          </label>
          {safeImageDataUrl(portfolio.personalInformation?.photoDataUrl) && (
            <div className="photo-current">
              <img src={safeImageDataUrl(portfolio.personalInformation.photoDataUrl)} alt="Profile preview" />
              <button type="button" className="btn btn-ghost" onClick={() => updateField('personalInformation.photoDataUrl', '')}>Remove photo</button>
            </div>
          )}
        </section>

        <section className="editor-section">
          <h3>Resume</h3>
          <label className="resume-file-picker">
            <FileText size={16} /> Choose a PDF from this device
            <input type="file" accept="application/pdf,.pdf" onChange={attachResumePdf} />
          </label>
          {portfolio.personalInformation?.resumeFileName && (
            <div className="resume-current">
              <span>{portfolio.personalInformation.resumeFileName}</span>
              <button type="button" className="btn btn-ghost" onClick={() => {
                updateField('personalInformation.resumeDataUrl', '');
                updateField('personalInformation.resumeFileName', '');
              }}>Remove PDF</button>
            </div>
          )}
          <div className="drive-resume-import">
            <label htmlFor="drive-resume-url">Or import a Google Drive share link</label>
            <div className="drive-resume-controls">
              <input id="drive-resume-url" type="url" value={driveResumeUrl} onChange={(event) => setDriveResumeUrl(event.target.value)} placeholder="https://drive.google.com/file/d/..." />
              <button type="button" className="btn btn-secondary" onClick={importDriveResume}>Use Drive link</button>
            </div>
            <small className="field-hint">The file must be shared with anyone who has the link.</small>
          </div>
          {portfolio.personalInformation?.resumeUrl && (
            <label>
              Resume URL
              <input type="url" value={portfolio.personalInformation.resumeUrl} onChange={(event) => updateField('personalInformation.resumeUrl', event.target.value)} placeholder="https://example.com/resume.pdf" />
            </label>
          )}
        </section>

        <section className="editor-section">
          <div className="section-title-row">
            <h3>About you</h3>
            <button type="button" className="btn btn-secondary" onClick={() => setAssistantOpen((open) => !open)}>
              <Wand2 size={15} /> {assistantOpen ? 'Close AI Portfolio Assistant' : 'Open AI Portfolio Assistant'}
            </button>
          </div>
          <label>
            Short biography
            <textarea value={portfolio.personalInformation?.bio || ''} rows="4" onChange={(e) => updateField('personalInformation.bio', e.target.value)} maxLength={1200} />
            <small className="field-hint">{(portfolio.personalInformation?.bio || '').length}/1200 characters</small>
          </label>
          {portfolio.personalInformation?.aiGeneratedContent && (
            <div className="saved-ai-content">
              <div>
                <strong>AI portfolio content saved</strong>
                <small>{Object.values(portfolio.personalInformation.aiGeneratedContent).filter((value) => typeof value === 'string' && value.trim()).length} sections · {portfolio.personalInformation.aiGeneratedStyle || 'Professional'} style</small>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => setAssistantOpen(true)}>
                <Wand2 size={14} /> Review or edit saved sections
              </button>
            </div>
          )}
          {assistantOpen && <PortfolioAssistant apiRequest={apiRequest} portfolio={portfolio} onSaveContent={saveAssistantContent} />}
        </section>

        <section className="editor-section">
          <h3>Skills</h3>
          <form className="add-skill-form" onSubmit={addSkill}>
            <input aria-label="Add a skill" placeholder="e.g. React" value={skillInput} onChange={(event) => setSkillInput(event.target.value)} />
            <button type="submit" className="btn btn-secondary"><Plus size={16} /> Add skill</button>
          </form>
          <div className="skill-editor-list">
            {portfolio.skills.map((skill, index) => (
              <span key={`${skill}-${index}`}>{skill}<button type="button" aria-label={`Remove ${skill}`} onClick={() => removeListItem('skills', index)}><Trash2 size={13} /></button></span>
            ))}
          </div>
        </section>

        <section className="editor-section">
          <div className="section-title-row">
            <h3>Projects</h3>
            <button type="button" className="btn btn-secondary" onClick={() => addListItem('projects', { title: '', description: '', technologies: [], githubUrl: '', demoUrl: '' })}>
              <Plus size={16} /> Add project
            </button>
          </div>
          <div className="github-import">
            <form className="github-import-form" onSubmit={loadGitHubRepos}>
              <label htmlFor="github-username">Import public repositories</label>
              <div className="github-import-controls">
                <input id="github-username" value={githubUsername} onChange={(event) => setGithubUsername(event.target.value)} placeholder="GitHub username" autoComplete="off" />
                <button type="submit" className="btn btn-secondary" disabled={githubLoading}>
                  <Code2 size={15} /> {githubLoading ? 'Loading…' : 'Find repos'}
                </button>
              </div>
            </form>
            {githubRepos.length > 0 && (
              <div className="github-repo-list" aria-label="GitHub repositories">
                {githubRepos.map((repo) => {
                  const alreadyAdded = portfolio.projects.some((project) => project.githubUrl === repo.htmlUrl);
                  return (
                    <div className="github-repo-row" key={repo.id}>
                      <div><strong>{repo.name}</strong><span>{repo.language || 'Repository'}{repo.description ? ` · ${repo.description}` : ''}</span></div>
                      <button type="button" className="icon-button" aria-label={`Add ${repo.name} to projects`} title={alreadyAdded ? 'Already added' : 'Add repository'} disabled={alreadyAdded} onClick={() => importGitHubRepo(repo)}>
                        {alreadyAdded ? <Check size={16} /> : <Plus size={16} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {portfolio.projects.map((project, index) => (
            <div className="repeatable-card" key={`project-${index}`}>
              <div className="repeatable-card-heading"><strong>Project {index + 1}</strong><button type="button" className="icon-button" aria-label={`Remove project ${index + 1}`} onClick={() => removeListItem('projects', index)}><Trash2 size={16} /></button></div>
              <label>Project title<input value={project.title || ''} onChange={(e) => updateListItem('projects', index, 'title', e.target.value)} /></label>
              <label>Description<textarea rows="3" value={project.description || ''} onChange={(e) => updateListItem('projects', index, 'description', e.target.value)} /></label>
              <label>Technologies<input value={(project.technologies || []).join(', ')} onChange={(e) => updateListItem('projects', index, 'technologies', e.target.value.split(',').map((value) => value.trim()).filter(Boolean))} /></label>
              <label className="photo-upload-control">
                <ImagePlus size={16} /> Add project photo (max 1 MB)
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setProjectPhoto(event, index)} />
              </label>
              {safeImageDataUrl(project.imageDataUrl) && (
                <div className="photo-current">
                  <img src={safeImageDataUrl(project.imageDataUrl)} alt={`${project.title || 'Project'} preview`} />
                  <button type="button" className="btn btn-ghost" onClick={() => updateListItem('projects', index, 'imageDataUrl', '')}>Remove photo</button>
                </div>
              )}
              <button type="button" className="btn btn-secondary ai-project-button" onClick={() => improveProjectDescription(index)} disabled={aiProjectIndex !== null}>
                <Wand2 size={15} /> {aiProjectIndex === index ? 'Improving…' : 'Improve with AI'}
              </button>
              {generatedProjectDescriptions[index] && (
                <div className="generated-copy">
                  {aiNotice && <small className="field-hint">{aiNotice}</small>}
                  <p>{generatedProjectDescriptions[index]}</p>
                  <button type="button" className="btn btn-primary" onClick={() => {
                    updateListItem('projects', index, 'description', generatedProjectDescriptions[index]);
                    setGeneratedProjectDescriptions((current) => {
                      const next = { ...current };
                      delete next[index];
                      return next;
                    });
                  }}>Apply description</button>
                </div>
              )}
              <label>GitHub repository URL<input type="url" value={project.githubUrl || ''} onChange={(e) => updateListItem('projects', index, 'githubUrl', e.target.value)} /></label>
              <label>Live demo URL<input type="url" value={project.demoUrl || ''} onChange={(e) => updateListItem('projects', index, 'demoUrl', e.target.value)} /></label>
            </div>
          ))}
          {portfolio.projects.length === 0 && <p className="muted-note">Add a project to show your work in the live preview.</p>}
        </section>

        <section className="editor-section">
          <div className="section-title-row">
            <h3>Experience</h3>
            <button type="button" className="btn btn-secondary" onClick={() => addListItem('experience', { institution: '', role: '', startDate: '', endDate: '', current: false, description: '' })}>
              <Plus size={16} /> Add experience
            </button>
          </div>
          {portfolio.experience.map((item, index) => (
            <div className="repeatable-card" key={`experience-${index}`}>
              <div className="repeatable-card-heading"><strong>Experience {index + 1}</strong><button type="button" className="icon-button" aria-label={`Remove experience ${index + 1}`} onClick={() => removeListItem('experience', index)}><Trash2 size={16} /></button></div>
              <label>Role<input value={item.role || ''} onChange={(e) => updateListItem('experience', index, 'role', e.target.value)} /></label>
              <label>Company or organization<input value={item.institution || ''} onChange={(e) => updateListItem('experience', index, 'institution', e.target.value)} /></label>
              <div className="field-group date-fields">
                <label>Start date<input type="month" value={item.startDate || ''} onChange={(e) => updateListItem('experience', index, 'startDate', e.target.value)} /></label>
                <label>End date<input type="month" value={item.endDate || ''} disabled={item.current} onChange={(e) => updateListItem('experience', index, 'endDate', e.target.value)} /></label>
              </div>
              <label className="inline-checkbox"><input type="checkbox" checked={Boolean(item.current)} onChange={(e) => updateListItem('experience', index, 'current', e.target.checked)} /> I currently work here</label>
              <label>Description<textarea rows="3" value={item.description || ''} onChange={(e) => updateListItem('experience', index, 'description', e.target.value)} /></label>
            </div>
          ))}
        </section>

        <section className="editor-section">
          <div className="section-title-row">
            <h3>Education</h3>
            <button type="button" className="btn btn-secondary" onClick={() => addListItem('education', { institution: '', degree: '', fieldOfStudy: '', startDate: '', endDate: '', current: false, description: '' })}>
              <Plus size={16} /> Add education
            </button>
          </div>
          {portfolio.education.map((item, index) => (
            <div className="repeatable-card" key={`education-${index}`}>
              <div className="repeatable-card-heading"><strong>Education {index + 1}</strong><button type="button" className="icon-button" aria-label={`Remove education ${index + 1}`} onClick={() => removeListItem('education', index)}><Trash2 size={16} /></button></div>
              <label>Institution<input value={item.institution || ''} onChange={(e) => updateListItem('education', index, 'institution', e.target.value)} /></label>
              <label>Degree<input value={item.degree || ''} onChange={(e) => updateListItem('education', index, 'degree', e.target.value)} /></label>
              <label>Field of study<input value={item.fieldOfStudy || ''} onChange={(e) => updateListItem('education', index, 'fieldOfStudy', e.target.value)} /></label>
              <div className="field-group date-fields">
                <label>Start date<input type="month" value={item.startDate || ''} onChange={(e) => updateListItem('education', index, 'startDate', e.target.value)} /></label>
                <label>End date<input type="month" value={item.endDate || ''} disabled={item.current} onChange={(e) => updateListItem('education', index, 'endDate', e.target.value)} /></label>
              </div>
              <label className="inline-checkbox"><input type="checkbox" checked={Boolean(item.current)} onChange={(e) => updateListItem('education', index, 'current', e.target.checked)} /> Currently studying</label>
              <label>Description<textarea rows="3" value={item.description || ''} onChange={(e) => updateListItem('education', index, 'description', e.target.value)} /></label>
            </div>
          ))}
        </section>

        <section className="editor-section">
          <div className="section-title-row">
            <h3>Certifications</h3>
            <button type="button" className="btn btn-secondary" onClick={() => addListItem('certifications', { name: '', issuer: '', issueDate: '', url: '' })}>
              <Plus size={16} /> Add certification
            </button>
          </div>
          {portfolio.certifications.map((item, index) => (
            <div className="repeatable-card" key={`certification-${index}`}>
              <div className="repeatable-card-heading"><strong>Certification {index + 1}</strong><button type="button" className="icon-button" aria-label={`Remove certification ${index + 1}`} onClick={() => removeListItem('certifications', index)}><Trash2 size={16} /></button></div>
              <label>Certificate name<input value={item.name || ''} onChange={(e) => updateListItem('certifications', index, 'name', e.target.value)} /></label>
              <label>Issuing organization<input value={item.issuer || ''} onChange={(e) => updateListItem('certifications', index, 'issuer', e.target.value)} /></label>
              <label>Issue date<input type="date" value={item.issueDate || ''} onChange={(e) => updateListItem('certifications', index, 'issueDate', e.target.value)} /></label>
              <label>Certificate URL<input type="url" value={item.url || ''} onChange={(e) => updateListItem('certifications', index, 'url', e.target.value)} /></label>
            </div>
          ))}
        </section>

        <section className="editor-section">
          <h3>Design</h3>
          <div className="field-group">
            <label>Accent color<input type="color" value={portfolio.themeSettings?.accent || '#6d5efc'} onChange={(e) => updateField('themeSettings.accent', e.target.value)} /></label>
            <label>Font
              <select value={portfolio.themeSettings?.font || 'Inter'} onChange={(e) => updateField('themeSettings.font', e.target.value)}>
                <option>Inter</option><option>Georgia</option><option>Arial</option><option>system-ui</option>
              </select>
            </label>
          </div>
          <div className="section-toggle-list">
            {Object.entries({ about: 'About', skills: 'Skills', projects: 'Projects', experience: 'Experience', education: 'Education', certifications: 'Certifications' }).map(([key, label]) => (
              <label key={key} className="toggle-row">
                <span>{label}</span>
                <input type="checkbox" checked={portfolio.enabledSections?.[key] ?? true} onChange={(e) => updateField(`enabledSections.${key}`, e.target.checked)} />
              </label>
            ))}
          </div>
        </section>
      </div>

      <div className="preview-panel">
        <div className="preview-panel-header"><span><Sparkles size={15} /> Live preview</span><span className="live-indicator">LIVE</span></div>
        <PortfolioPreview portfolio={portfolio} />
      </div>
    </div>
  );
}

function PublicPortfolioPage() {
  const { slug } = useParams();
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/public/${slug}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Portfolio not found.');
        setPortfolio(result.portfolio);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    };

    loadPortfolio();
  }, [slug]);

  if (loading) return <p className="page-note">Loading public portfolio...</p>;
  if (!portfolio) return <main className="public-error"><Link to="/" className="brand-wrap"><span className="brand-mark">P</span>Portify</Link><h1>Portfolio unavailable</h1><p>{error || 'This portfolio could not be found.'}</p><Link to="/" className="btn btn-primary">Back to Portify</Link></main>;

  return <PortfolioPreview portfolio={portfolio} isPublic />;
}

function PortfolioPreview({ portfolio, isPublic = false }) {
  const templateClass = portfolio.templateId || 'minimal';
  const info = portfolio.personalInformation || {};
  const sections = portfolio.enabledSections || {};
  const theme = portfolio.themeSettings || {};

  return (
    <div className={`portfolio-preview ${templateClass} ${isPublic ? 'public' : ''}`} style={{ '--portfolio-accent': theme.accent || '#6d5efc', fontFamily: theme.font || 'Inter' }}>
      <header className="preview-header">
        <div className="preview-identity">
          {safeImageDataUrl(info.photoDataUrl) && <img className="portfolio-profile-photo" src={safeImageDataUrl(info.photoDataUrl)} alt={`${info.fullName || 'Profile'} photo`} />}
          <div>
            <span className="preview-role">{info.title || 'Developer'}</span>
            <h3>{info.fullName || portfolio.title || 'Portfolio'}</h3>
            {info.location && <span className="portfolio-location">{info.location}</span>}
          </div>
        </div>
        <div className="preview-links">
          {info.github && <a href={info.github} target="_blank" rel="noreferrer"><Code2 size={15} /> GitHub</a>}
          {info.linkedin && <a href={info.linkedin} target="_blank" rel="noreferrer"><ExternalLink size={14} /> LinkedIn</a>}
          {info.website && <a href={info.website} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Website</a>}
          {safeResumeHref(info) && <a href={safeResumeHref(info)} target="_blank" rel="noreferrer"><FileText size={14} /> Resume</a>}
        </div>
      </header>

      {sections.about !== false && (info.bio || info.email) && (
        <section className="portfolio-preview-section">
          <h4>About</h4>
          {info.bio && <p>{info.bio}</p>}
          {info.email && <a className="contact-link" href={`mailto:${info.email}`}>{info.email}</a>}
        </section>
      )}

      {sections.skills !== false && portfolio.skills?.length > 0 && (
        <section className="portfolio-preview-section">
          <h4>Skills</h4>
          <div className="skills-wrap">
            {portfolio.skills.map((skill, index) => <span key={`${skill}-${index}`}>{skill}</span>)}
          </div>
        </section>
      )}

      {sections.projects !== false && portfolio.projects?.length > 0 && (
        <section className="portfolio-preview-section">
          <h4>Selected projects</h4>
          <div className="portfolio-project-grid">
            {portfolio.projects.map((project, index) => (
              <article key={`${project.title}-${index}`} className="project-item">
                {safeImageDataUrl(project.imageDataUrl) && <img className="portfolio-project-photo" src={safeImageDataUrl(project.imageDataUrl)} alt={`${project.title || 'Project'} photo`} />}
                <h5>{project.title || 'Untitled project'}</h5>
                {project.description && <p>{project.description}</p>}
                {project.technologies?.length > 0 && <div className="skills-wrap">{project.technologies.map((technology) => <span key={technology}>{technology}</span>)}</div>}
                <div className="project-links">
                  {project.githubUrl && <a href={project.githubUrl} target="_blank" rel="noreferrer"><Code2 size={14} /> Code</a>}
                  {project.demoUrl && <a href={project.demoUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Live demo</a>}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {sections.experience !== false && portfolio.experience?.length > 0 && (
        <section className="portfolio-preview-section">
          <h4>Experience</h4>
          {portfolio.experience.map((item, index) => (
            <div className="timeline-item" key={`${item.institution}-${index}`}>
              <strong>{item.role || item.institution}</strong>
              <p>{item.institution}</p>
              {item.description && <small>{item.description}</small>}
            </div>
          ))}
        </section>
      )}

      {sections.education !== false && portfolio.education?.length > 0 && (
        <section className="portfolio-preview-section">
          <h4>Education</h4>
          {portfolio.education.map((item, index) => (
            <div className="timeline-item" key={`${item.institution}-${index}`}>
              <strong>{item.degree || 'Education'}</strong>
              <p>{item.institution}</p>
              {item.description && <small>{item.description}</small>}
            </div>
          ))}
        </section>
      )}

      {sections.certifications !== false && portfolio.certifications?.length > 0 && (
        <section className="portfolio-preview-section">
          <h4>Certifications</h4>
          {portfolio.certifications.map((item, index) => (
            <div className="timeline-item" key={`${item.name}-${index}`}>
              <strong>{item.name}</strong>
              <p>{item.issuer}</p>
              {item.url && <a className="contact-link" href={item.url} target="_blank" rel="noreferrer">View certificate <ExternalLink size={13} /></a>}
            </div>
          ))}
        </section>
      )}

      {isPublic && <footer className="portfolio-preview-footer">Made with <Link to="/">Portify</Link></footer>}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/editor/:id" element={<ProtectedRoute><EditorPage /></ProtectedRoute>} />
          <Route path="/editor" element={<ProtectedRoute><EditorPage /></ProtectedRoute>} />
          <Route path="/public/:slug" element={<PublicPortfolioPage />} />
        </Routes>
        <PortifyChatbot apiRequest={apiRequest} />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
