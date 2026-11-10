import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Expand, MessageCircle, Pencil, RefreshCw, Save, Send, Sparkles, X } from 'lucide-react';
import './ai.css';

const welcomeMessage = "Hello! I'm your AI Portfolio Assistant. I'll help you build a professional portfolio that truly represents you. Let's get to know you!";
const contentSections = [
  ['professionalBiography', 'Professional Biography'],
  ['aboutMe', 'About Me'],
  ['shortIntroduction', 'Short Introduction'],
  ['careerObjective', 'Career Objective'],
  ['technicalSkillsDescription', 'Technical Skills Description'],
  ['projectDescriptions', 'Project Descriptions'],
  ['experienceSummary', 'Experience Summary'],
  ['achievementSummary', 'Achievement Summary'],
  ['linkedInAbout', 'LinkedIn About Section'],
];
const styles = ['Professional', 'Simple', 'Creative', 'Technical'];
const interviewStages = [
  ['personalDetails', 'About you'],
  ['technicalDetails', 'Skills'],
  ['experience', 'Experience'],
  ['projects', 'Projects'],
  ['achievements', 'Achievements'],
  ['personal', 'Strengths'],
  ['careerGoals', 'Goals'],
];

const emptyProfile = () => ({
  personalDetails: {
    fullName: '',
    professionalTitle: '',
    educationalBackground: '',
    currentStatus: '',
    location: '',
  },
  technicalDetails: {
    programmingLanguages: '',
    technicalSkills: '',
    frameworks: '',
    technologies: '',
    toolsAndPlatforms: '',
    areasOfInterest: '',
  },
  experience: {
    internshipExperience: '',
    workExperience: '',
    academicExperience: '',
    freelanceExperience: '',
  },
  projects: [],
  noProjects: false,
  achievements: {
    certifications: '',
    awards: '',
    hackathons: '',
    workshops: '',
    competitions: '',
  },
  personal: {
    strengths: '',
    interests: '',
    hobbies: '',
    personalQualities: '',
  },
  careerGoals: {
    shortTermGoals: '',
    longTermGoals: '',
    desiredJobRole: '',
    professionalAmbitions: '',
  },
});

function seedProfile(portfolio) {
  const profile = emptyProfile();
  const information = portfolio?.personalInformation || {};
  profile.personalDetails.fullName = information.fullName || '';
  profile.personalDetails.professionalTitle = information.title || '';
  profile.personalDetails.location = information.location || '';
  profile.personalDetails.educationalBackground = (portfolio?.education || [])
    .map((item) => [item.degree, item.institution, item.description].filter(Boolean).join(' — '))
    .filter(Boolean)
    .join('; ');
  profile.technicalDetails.technicalSkills = (portfolio?.skills || []).join(', ');
  profile.projects = (portfolio?.projects || []).slice(0, 8).map((project) => ({
    name: project.title || '',
    description: project.description || '',
    technologiesUsed: (project.technologies || []).join(', '),
    individualContribution: '',
    problemsSolved: '',
    achievements: '',
  }));
  profile.experience.workExperience = (portfolio?.experience || [])
    .map((item) => [item.role, item.institution, item.description].filter(Boolean).join(' — '))
    .filter(Boolean)
    .join('; ');
  profile.achievements.certifications = (portfolio?.certifications || [])
    .map((item) => [item.name, item.issuer].filter(Boolean).join(' — '))
    .filter(Boolean)
    .join('; ');
  return profile;
}

function firstStage(profile) {
  const personal = profile.personalDetails;
  if (!personal.fullName || !personal.professionalTitle || !personal.educationalBackground || !personal.currentStatus) return 'personalDetails';
  const technical = profile.technicalDetails;
  if (!technical.technicalSkills || !technical.areasOfInterest) return 'technicalDetails';
  const experience = profile.experience;
  if (!experience.internshipExperience || !experience.workExperience || !experience.academicExperience || !experience.freelanceExperience) return 'experience';
  if (!profile.noProjects && !profile.projects.some((project) => project.name && project.description && project.technologiesUsed && project.individualContribution)) return 'projects';
  if (!Object.values(profile.achievements).every(Boolean)) return 'achievements';
  if (!profile.personal.strengths || !profile.personal.interests) return 'personal';
  if (!Object.values(profile.careerGoals).every(Boolean)) return 'careerGoals';
  return 'careerGoals';
}

function firstQuestion(profile, stage) {
  const questions = {
    personalDetails: [
      ['fullName', 'What is your full name?'],
      ['professionalTitle', 'What professional title best describes you?'],
      ['educationalBackground', 'What is your educational background?'],
      ['currentStatus', 'What is your current academic or professional status?'],
    ],
    technicalDetails: [
      ['technicalSkills', 'What technical skills do you use?'],
      ['areasOfInterest', 'Which areas of technology interest you most?'],
    ],
    experience: [
      ['internshipExperience', 'Tell me about your internship experience, or say if you have not had an internship.'],
      ['workExperience', 'Tell me about your work experience, or say if you have not had a job yet.'],
      ['academicExperience', 'What academic experience would you like to highlight, or should I note none?'],
      ['freelanceExperience', 'Tell me about your freelance experience, or say if you have not freelanced.'],
    ],
    achievements: [
      ['certifications', 'What certifications have you earned, or should I note none?'],
      ['awards', 'What awards have you received, or should I note none?'],
      ['hackathons', 'What hackathons have you joined, or should I note none?'],
      ['workshops', 'What workshops have you attended, or should I note none?'],
      ['competitions', 'What competitions have you entered, or should I note none?'],
    ],
    personal: [
      ['strengths', 'What are your personal or professional strengths?'],
      ['interests', 'What interests would you like your portfolio to reflect?'],
    ],
    careerGoals: [
      ['shortTermGoals', 'What are your short-term career goals?'],
      ['longTermGoals', 'What are your long-term career goals?'],
      ['desiredJobRole', 'What job role are you aiming for?'],
      ['professionalAmbitions', 'What professional ambition matters most to you?'],
    ],
  };
  if (stage === 'projects') {
    const project = profile.projects[0];
    if (!project) return 'Tell me about a project you have worked on, including its name, what it does, and the technologies you used. If you have not built a project yet, say so.';
    if (!project.name) return 'What is the name of this project?';
    if (!project.description) return `What does ${project.name} do, and what problem does it solve?`;
    if (!project.technologiesUsed) return `Which technologies did you use for ${project.name}?`;
    return `What was your individual contribution to ${project.name}?`;
  }
  const fields = questions[stage] || [];
  const answer = fields.find(([field]) => !profile[stage]?.[field]);
  if (answer) return answer[1];
  if (stage === 'technicalDetails') {
    return ['programmingLanguages', 'frameworks', 'technologies', 'toolsAndPlatforms']
      .find((field) => !profile.technicalDetails[field])
      ? 'Which programming languages, frameworks, technologies, or tools do you use? You can say "none yet" for any you have not used.'
      : 'Tell me more about your experience.';
  }
  if (stage === 'personal' && !profile.personal.hobbies) return 'What hobbies do you enjoy? You can skip this if you prefer.';
  if (stage === 'personal' && !profile.personal.personalQualities) return 'Which personal qualities describe you? You can skip this if you prefer.';
  if (stage === 'personalDetails' && !profile.personalDetails.location) return 'What location should I include? You can skip this if you prefer.';
  return 'Share any additional details that would help your portfolio feel true to you.';
}

function initialProgress(profile) {
  const checks = Object.values(stageCompletion(profile));
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function stageCompletion(profile) {
  return {
    personalDetails: Boolean(profile.personalDetails.fullName && profile.personalDetails.professionalTitle && profile.personalDetails.educationalBackground && profile.personalDetails.currentStatus),
    technicalDetails: Boolean(profile.technicalDetails.technicalSkills && profile.technicalDetails.areasOfInterest),
    experience: Boolean(profile.experience.internshipExperience && profile.experience.workExperience && profile.experience.academicExperience && profile.experience.freelanceExperience),
    projects: Boolean(profile.noProjects || profile.projects.some((project) => project.name && project.description && project.technologiesUsed && project.individualContribution)),
    achievements: Object.values(profile.achievements).every(Boolean),
    personal: Boolean(profile.personal.strengths && profile.personal.interests),
    careerGoals: Object.values(profile.careerGoals).every(Boolean),
  };
}

function AssistantMessage({ message, onEdit }) {
  return (
    <div className={`ai-message-row ${message.role}`}>
      <div className={`ai-message ${message.role}`}>{message.content}</div>
      {message.role === 'user' && message.stage && (
        <button type="button" className="ai-text-action" onClick={onEdit} aria-label="Edit this answer">
          <Pencil size={13} /> Edit
        </button>
      )}
    </div>
  );
}

export function PortfolioAssistant({ apiRequest, portfolio, onSaveContent }) {
  const [profile, setProfile] = useState(() => seedProfile(portfolio));
  const [stage, setStage] = useState(() => firstStage(seedProfile(portfolio)));
  const [messages, setMessages] = useState(() => [
    { role: 'assistant', content: welcomeMessage },
    { role: 'assistant', content: firstQuestion(seedProfile(portfolio), firstStage(seedProfile(portfolio))), stage: firstStage(seedProfile(portfolio)) },
  ]);
  const [answers, setAnswers] = useState({});
  const [input, setInput] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [progress, setProgress] = useState(() => initialProgress(seedProfile(portfolio)));
  const [complete, setComplete] = useState(() => initialProgress(seedProfile(portfolio)) === 100);
  const [optionalQuestion, setOptionalQuestion] = useState(false);
  const savedContent = portfolio?.personalInformation?.aiGeneratedContent;
  const [style, setStyle] = useState(() => styles.includes(portfolio?.personalInformation?.aiGeneratedStyle) ? portfolio.personalInformation.aiGeneratedStyle : 'Professional');
  const [content, setContent] = useState(() => (
    savedContent && typeof savedContent === 'object' && !Array.isArray(savedContent) ? savedContent : null
  ));
  const [editingContent, setEditingContent] = useState({});
  const [activeContent, setActiveContent] = useState('professionalBiography');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const busyRef = useRef(false);
  const saveRef = useRef(false);

  useEffect(() => {
    const messagesElement = document.querySelector('.ai-interview');
    if (messagesElement) messagesElement.scrollTop = messagesElement.scrollHeight;
  }, [messages, isLoading]);

  const requestTurn = async (answer, mode, nextMessages, targetStage = stage) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setIsLoading(true);
    setError('');
    setNotice('');
    try {
      const result = await apiRequest('/ai/portfolio-assistant/turn', {
        method: 'POST',
        body: JSON.stringify({
          answer,
          mode,
          stage: targetStage,
          profile,
          messages: nextMessages.slice(-24).map(({ role, content: messageContent }) => ({ role, content: messageContent })),
        }),
      });
      setProfile(result.profile);
      setStage(result.stage);
      setProgress(result.progress);
      setComplete(result.complete);
      setOptionalQuestion(result.optionalQuestion);
      if (result.complete) {
        setNotice('Your profile has enough detail. Choose a writing style and generate your portfolio content.');
      }
      if (result.nextQuestion) {
        setMessages([...nextMessages, { role: 'assistant', content: result.nextQuestion, stage: result.stage }]);
      } else {
        setMessages(nextMessages);
      }
      setAnswers((current) => mode === 'skip_optional' ? current : { ...current, [targetStage]: answer });
      setInput('');
      setEditingIndex(null);
    } catch (requestError) {
      setMessages(nextMessages);
      setError(requestError.message);
    } finally {
      busyRef.current = false;
      setIsLoading(false);
    }
  };

  const submitAnswer = (event) => {
    event.preventDefault();
    const answer = input.trim();
    if (!answer || isLoading) return;
    const targetStage = editingIndex === null ? stage : messages[editingIndex].stage || stage;
    let nextMessages;
    if (editingIndex === null) {
      nextMessages = [...messages, { role: 'user', content: answer, stage: targetStage }];
    } else {
      nextMessages = messages.map((message, index) => index === editingIndex ? { ...message, content: answer } : message);
    }
    requestTurn(answer, editingIndex === null ? 'answer' : 'edit', nextMessages, targetStage);
  };

  const skipOptional = () => {
    if (isLoading || !optionalQuestion) return;
    const nextMessages = [...messages, { role: 'user', content: 'I would like to skip this optional detail.', stage }];
    requestTurn('', 'skip_optional', nextMessages, stage);
  };

  const generate = async () => {
    if (isLoading || busyRef.current || !complete) return;
    busyRef.current = true;
    setIsLoading(true);
    setError('');
    setNotice('');
    try {
      const result = await apiRequest('/ai/portfolio-assistant/generate', {
        method: 'POST',
        body: JSON.stringify({ profile, style }),
      });
      setContent(result.content);
      setEditingContent({});
      setActiveContent('professionalBiography');
      setNotice('Your content is ready. Review and edit each section before saving.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      busyRef.current = false;
      setIsLoading(false);
    }
  };

  const transform = async (section, action) => {
    const value = editingContent[section] ?? content?.[section] ?? '';
    if (!value.trim() || isLoading || busyRef.current) return;
    busyRef.current = true;
    setIsLoading(true);
    setError('');
    setNotice('');
    try {
      const result = await apiRequest('/ai/portfolio-assistant/transform', {
        method: 'POST',
        body: JSON.stringify({ profile, style, section, action, content: value }),
      });
      setContent((current) => ({ ...current, [section]: result.content }));
      setEditingContent((current) => ({ ...current, [section]: result.content }));
      const actionLabel = { improve: 'Improved', shorten: 'Shortened', expand: 'Expanded' }[action];
      setNotice(`${actionLabel} ${contentSections.find(([key]) => key === section)?.[1]}.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      busyRef.current = false;
      setIsLoading(false);
    }
  };

  const copySection = async (section) => {
    try {
      await navigator.clipboard.writeText(editingContent[section] ?? content?.[section] ?? '');
      setNotice('Copied to clipboard.');
      setError('');
    } catch {
      setError('Could not access the clipboard. Select and copy the text instead.');
    }
  };

  const saveContent = async () => {
    if (!content || isSaving || saveRef.current) return;
    saveRef.current = true;
    setIsSaving(true);
    setError('');
    try {
      await onSaveContent({ ...content, ...editingContent }, style);
      setNotice('Generated sections saved to your portfolio. Your biography is now in the About section.');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      saveRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <div className="ai-assistant">
      <div className="ai-assistant-heading">
        <div className="ai-assistant-icon"><Sparkles size={19} /></div>
        <div>
          <h4>AI Portfolio Assistant</h4>
          <p>Share your real experience one step at a time. Your answers are never used to invent qualifications.</p>
        </div>
      </div>

      <div className="ai-progress">
        <div className="ai-progress-label"><span>Profile progress</span><strong>{progress}%</strong></div>
        <div className="ai-progress-track" role="progressbar" aria-label="Portfolio information collected" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="ai-stage-list" aria-label="Information collection steps">
          {interviewStages.map(([key, title]) => {
            const done = stageCompletion(profile)[key];
            return <span key={key} className={`ai-stage-chip ${done ? 'complete' : ''} ${!complete && key === stage ? 'current' : ''}`}>
              {done && <Check size={12} aria-hidden="true" />} {title}
            </span>;
          })}
        </div>
      </div>

      <div className="ai-interview" aria-live="polite">
        {messages.map((message, index) => (
          <AssistantMessage
            key={`${message.role}-${index}`}
            message={message}
            onEdit={() => {
              setEditingIndex(index);
              setInput(message.content);
            }}
          />
        ))}
        {isLoading && <div className="ai-typing" role="status"><span /><span /><span /> AI is thinking</div>}
      </div>

      {!complete && (
        <form className="ai-interview-form" onSubmit={submitAnswer}>
          {editingIndex !== null && <span className="ai-editing-note">Editing an earlier answer <button type="button" onClick={() => { setEditingIndex(null); setInput(''); }}>Cancel</button></span>}
          {answers[stage] && editingIndex === null && <span className="ai-collected-note">Your answers are remembered during this session.</span>}
          <textarea
            aria-label="Your answer"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Type your answer… (Enter to send, Shift+Enter for a new line)"
            maxLength={4000}
            rows={3}
            disabled={isLoading}
          />
          <div className="ai-interview-actions">
            {optionalQuestion && <button className="ai-button subtle" type="button" onClick={skipOptional} disabled={isLoading}>Skip optional detail</button>}
            <button className="ai-button primary" type="submit" disabled={!input.trim() || isLoading}><Send size={15} /> Send answer</button>
          </div>
        </form>
      )}

      {error && <div className="ai-notice error" role="alert">{error}</div>}
      {notice && <div className="ai-notice success" role="status">{notice}</div>}

      {(complete || content) && (
        <section className="ai-generation">
          <div className="ai-generation-heading">
            <div><h4>{content ? 'Your saved portfolio content' : 'Your portfolio content'}</h4><p>{complete ? 'Choose a style, then generate or regenerate every section from your answers.' : 'Review your saved sections here. Complete your profile before generating a new version.'}</p></div>
            <label className="ai-style-select">Writing style
              <select value={style} onChange={(event) => setStyle(event.target.value)}>
                {styles.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <div className="ai-generation-actions">
            <button className="ai-button primary" type="button" onClick={generate} disabled={isLoading || !complete}>
              <Sparkles size={15} /> {content ? 'Regenerate all' : 'Generate content'}
            </button>
            {content && <button className="ai-button subtle" type="button" onClick={saveContent} disabled={isSaving || isLoading}>
              <Save size={15} /> {isSaving ? 'Saving…' : 'Save edits to Portfolio'}
            </button>}
          </div>
          {content && (
            <div className="ai-content-layout">
              <nav className="ai-content-tabs" aria-label="Generated content sections">
                {contentSections.map(([key, title]) => (
                  <button type="button" key={key} className={activeContent === key ? 'active' : ''} onClick={() => setActiveContent(key)}>
                    {title}
                  </button>
                ))}
              </nav>
              <article className="ai-content-card">
                <div className="ai-content-card-heading">
                  <h5>{contentSections.find(([key]) => key === activeContent)?.[1]}</h5>
                  <button className="ai-icon-button" type="button" onClick={() => copySection(activeContent)} aria-label="Copy this section" title="Copy"><Copy size={15} /></button>
                </div>
                <textarea
                  aria-label={`Edit ${contentSections.find(([key]) => key === activeContent)?.[1]}`}
                  value={editingContent[activeContent] ?? content[activeContent] ?? ''}
                  onChange={(event) => setEditingContent((current) => ({ ...current, [activeContent]: event.target.value }))}
                  rows={9}
                />
                <div className="ai-content-actions">
                  <button type="button" className="ai-button subtle" onClick={() => transform(activeContent, 'improve')} disabled={isLoading}><Sparkles size={14} /> Improve</button>
                  <button type="button" className="ai-button subtle" onClick={() => transform(activeContent, 'shorten')} disabled={isLoading}>Shorten</button>
                  <button type="button" className="ai-button subtle" onClick={() => transform(activeContent, 'expand')} disabled={isLoading}><Expand size={14} /> Expand</button>
                  <button type="button" className="ai-button subtle" onClick={() => setEditingContent((current) => ({ ...current, [activeContent]: content[activeContent] || '' }))}>Reset edit</button>
                </div>
              </article>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

const chatbotWelcome = "Hi! Welcome to Portify. I'm your AI Assistant. I can help you with portfolio creation, programming, career guidance, and technical questions. How can I help you today?";
const suggestedQuestions = [
  'How can I improve my portfolio?',
  'Explain JavaScript closures simply',
  'What should I learn for a frontend role?',
];

export function PortifyChatbot({ apiRequest }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([{ role: 'assistant', content: chatbotWelcome }]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);
  const busyRef = useRef(false);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, isLoading, error]);

  const getReply = async (conversation) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setIsLoading(true);
    setError('');
    try {
      const result = await apiRequest('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: conversation.slice(-60) }),
      });
      setMessages((current) => [...current, { role: 'assistant', content: result.content }]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      busyRef.current = false;
      setIsLoading(false);
    }
  };

  const sendMessage = (text) => {
    const question = text.trim();
    if (!question || isLoading || busyRef.current || question.length > 4000) return;
    const nextMessages = [...messages, { role: 'user', content: question }];
    setMessages(nextMessages);
    setInput('');
    getReply(nextMessages);
  };

  const submit = (event) => {
    event.preventDefault();
    sendMessage(input);
  };

  const retry = () => {
    if (messages[messages.length - 1]?.role === 'user') getReply(messages);
  };

  const clearChat = () => {
    if (isLoading) return;
    setMessages([{ role: 'assistant', content: chatbotWelcome }]);
    setError('');
    setInput('');
  };

  const closeChat = () => setIsOpen(false);

  return (
    <div className="portify-chat-widget">
      {isOpen && (
        <section className="portify-chat-panel" role="dialog" aria-label="Portify AI Assistant" aria-modal="false">
          <header className="portify-chat-header">
            <div className="portify-chat-brand"><span className="portify-chat-avatar"><Sparkles size={17} /></span><span><strong>Portify AI</strong><small>Portfolio, career & programming help</small></span></div>
            <div className="portify-chat-header-actions">
              <button type="button" className="ai-icon-button" onClick={clearChat} disabled={isLoading} aria-label="Clear conversation" title="Clear chat"><RefreshCw size={15} /></button>
              <button type="button" className="ai-icon-button" onClick={closeChat} aria-label="Close chat"><X size={18} /></button>
            </div>
          </header>
          <div className="portify-chat-messages" ref={listRef} aria-live="polite">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`portify-chat-row ${message.role}`}>
                <p className={`portify-chat-bubble ${message.role}`}>{message.content}</p>
              </div>
            ))}
            {isLoading && <div className="portify-chat-row assistant"><div className="portify-chat-typing" role="status"><span /><span /><span /> Thinking…</div></div>}
            {error && <div className="portify-chat-error" role="alert">{error}<button type="button" onClick={retry} disabled={isLoading}>Try again</button></div>}
          </div>
          {messages.length === 1 && <div className="portify-chat-suggestions">
            <span>Try asking</span>
            {suggestedQuestions.map((question) => <button type="button" key={question} onClick={() => sendMessage(question)} disabled={isLoading}>{question}</button>)}
          </div>}
          <form className="portify-chat-form" onSubmit={submit}>
            <textarea
              aria-label="Ask Portify AI a question"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Ask a question…"
              maxLength={4000}
              rows={1}
              disabled={isLoading}
            />
            <button type="submit" aria-label="Send message" disabled={!input.trim() || isLoading}><Send size={17} /></button>
          </form>
          <p className="portify-chat-hint">AI responses can be inaccurate. Verify important information.</p>
        </section>
      )}
      <button type="button" className="portify-chat-toggle" aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)}>
        {isOpen ? <X size={18} /> : <MessageCircle size={18} />}
        <span>{isOpen ? 'Close assistant' : 'Ask Portify AI'}</span>
      </button>
    </div>
  );
}
