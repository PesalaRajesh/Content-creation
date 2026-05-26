import React, { useEffect, useState } from 'react';
import './App.css';

const templates = [
  { value: 'standard', label: 'Standard LinkedIn Post' },
  { value: 'founder_story', label: 'Founder Story' },
  { value: 'product_launch', label: 'Product Launch' },
  { value: 'learning_summary', label: 'Learning Summary' },
];

const tones = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'bold', label: 'Bold' },
];

function App() {
  const [transcript, setTranscript] = useState('');
  const [template, setTemplate] = useState('standard');
  const [tone, setTone] = useState('professional');
  const [generatedPost, setGeneratedPost] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [history, setHistory] = useState([]);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authMode, setAuthMode] = useState('register');
  const [accountEmail, setAccountEmail] = useState('');
  const [trialInfo, setTrialInfo] = useState({ trial_limit: 5, trial_uses: 0, remaining_trial: 5 });
  const [token, setToken] = useState(window.localStorage.getItem('contentRepurposerToken') || '');

  useEffect(() => {
    const savedToken = window.localStorage.getItem('contentRepurposerToken');
    if (savedToken) {
      setToken(savedToken);
      loadAuthenticatedAccount(savedToken);
      return;
    }

    const savedEmail = window.localStorage.getItem('contentRepurposerEmail');
    if (savedEmail) {
      setAccountEmail(savedEmail);
      loadAccount(savedEmail);
      return;
    }

    const saved = window.localStorage.getItem('contentRepurposerHistory');
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (!accountEmail && !token) {
      window.localStorage.setItem('contentRepurposerHistory', JSON.stringify(history));
    }
  }, [history, accountEmail, token]);

  const getTemplateLabel = (value) => templates.find((item) => item.value === value)?.label || 'Standard LinkedIn Post';
  const getToneLabel = (value) => tones.find((item) => item.value === value)?.label || 'Professional';

  const parseResponse = async (response) => {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return response.json();
    }
    const text = await response.text();
    throw new Error(`Non-JSON response (${response.status}): ${text}`);
  };

  const authHeaders = () => {
    return token ? { Authorization: `Token ${token}` } : {};
  };

  const loadAuthenticatedAccount = async (authToken) => {
    try {
      const response = await fetch('/api/me/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${authToken}`,
        },
      });
      const data = await parseResponse(response);

      if (response.ok) {
        setAccountEmail(data.email);
        setTrialInfo(data.customer || { trial_limit: 5, trial_uses: 0, remaining_trial: 5 });
        setStatusMessage(`Signed in as ${data.email}. Free trial uses left: ${data.customer.remaining_trial}.`);
        await loadHistoryForAuthenticatedUser(authToken);
      } else {
        setToken('');
        window.localStorage.removeItem('contentRepurposerToken');
      }
    } catch (error) {
      console.error('Authenticated load error:', error);
      setToken('');
      window.localStorage.removeItem('contentRepurposerToken');
    }
  };

  const loadHistoryForAuthenticatedUser = async (authToken) => {
    try {
      const response = await fetch('/api/history/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${authToken}`,
        },
      });
      const data = await parseResponse(response);
      if (response.ok) {
        setHistory(data.history);
      }
    } catch (error) {
      console.error('History load error:', error);
    }
  };

  const loadAccount = async (email) => {
    try {
      const response = await fetch(`/api/history/?email=${encodeURIComponent(email)}`);
      const data = await parseResponse(response);

      if (response.ok) {
        setHistory(data.history);
        setTrialInfo(data.customer || { trial_limit: 5, trial_uses: 0, remaining_trial: 5 });
        setStatusMessage(`Signed in as ${email}. Free trial uses left: ${data.customer.remaining_trial}.`);
      } else {
        setErrorMessage(data.error || 'Unable to load account history.');
      }
    } catch (error) {
      setErrorMessage('Error loading account history: ' + error.message);
    }
  };

  const handleAuth = async () => {
    if (!emailInput.trim() || !passwordInput.trim()) {
      setErrorMessage('Enter email and password to continue.');
      return;
    }

    setErrorMessage('');
    setLoading(true);

    try {
      const response = await fetch(`/api/${authMode === 'login' ? 'login' : 'register'}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailInput.trim(),
          password: passwordInput,
        }),
      });
      const data = await parseResponse(response);

      if (response.ok) {
        setToken(data.token || '');
        if (data.token) {
          window.localStorage.setItem('contentRepurposerToken', data.token);
        }
        setAccountEmail(emailInput.trim().toLowerCase());
        window.localStorage.setItem('contentRepurposerEmail', emailInput.trim().toLowerCase());
        setTrialInfo(data.customer || trialInfo);
        setStatusMessage(authMode === 'login' ? 'Logged in successfully.' : 'Account registered successfully.');
        setEmailInput('');
        setPasswordInput('');
        await loadAuthenticatedAccount(data.token);
      } else {
        setErrorMessage(data.error || 'Unable to authenticate.');
      }
    } catch (error) {
      setErrorMessage('Error connecting to backend: ' + error.message);
    }

    setLoading(false);
  };

  const handleLogout = async () => {
    try {
      if (token) {
        await fetch('/api/logout/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout request failed:', error);
    }

    setAccountEmail('');
    setToken('');
    window.localStorage.removeItem('contentRepurposerToken');
    window.localStorage.removeItem('contentRepurposerEmail');
    setStatusMessage('Logged out. Your local history is preserved.');
    const saved = window.localStorage.getItem('contentRepurposerHistory');
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  };

  const handleUpgrade = () => {
    window.open('mailto:sales@example.com?subject=Upgrade%20to%20Content%20Repurposer%20Pro', '_blank');
  };

  const handleGenerate = async () => {
    if (!transcript.trim()) {
      setErrorMessage('Please enter a transcript to generate a post.');
      return;
    }

    setErrorMessage('');
    setStatusMessage('');
    setLoading(true);

    try {
      const payload = { transcript, template, tone };
      if (!token && accountEmail) {
        payload.email = accountEmail;
      }

      const response = await fetch('/api/generate/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify(payload),
      });

      const data = await parseResponse(response);
      if (response.ok) {
        setGeneratedPost(data.post);
        if (token) {
          setTrialInfo(data.customer || trialInfo);
          setStatusMessage(`Generated post. Trial uses left: ${data.customer.remaining_trial}.`);
          await loadHistoryForAuthenticatedUser(token);
        } else if (data.customer) {
          setTrialInfo(data.customer);
          setStatusMessage(`Generated post. Trial uses left: ${data.customer.remaining_trial}.`);
          await loadAccount(accountEmail);
        } else {
          setHistory((prev) => [
            {
              id: Date.now(),
              transcript,
              template,
              tone,
              templateLabel: getTemplateLabel(template),
              toneLabel: getToneLabel(tone),
              post: data.post,
            },
            ...prev,
          ].slice(0, 10));
        }
      } else {
        setErrorMessage(data.error || 'Unable to generate post.');
      }
    } catch (error) {
      console.error('Generate error:', error);
      setErrorMessage('Error connecting to backend: ' + error.message);
    }

    setLoading(false);
  };

  const handleCopy = async () => {
    if (!generatedPost) return;
    await navigator.clipboard.writeText(generatedPost);
    setStatusMessage('Post copied to clipboard!');
    setTimeout(() => setStatusMessage(''), 2500);
  };

  const handleReuse = (item) => {
    setTranscript(item.transcript);
    setTemplate(item.template);
    setTone(item.tone);
    setGeneratedPost(item.post);
    setStatusMessage('Loaded history item into the editor.');
    setTimeout(() => setStatusMessage(''), 2500);
  };

  const handleClearHistory = async () => {
    if (accountEmail || token) {
      try {
        const response = await fetch(`/api/history/${token ? '' : `?email=${encodeURIComponent(accountEmail)}`}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
          },
        });
        const data = await parseResponse(response);
        if (response.ok) {
          setHistory([]);
          setStatusMessage(data.message || 'History cleared.');
        } else {
          setErrorMessage(data.error || 'Unable to clear history.');
        }
      } catch (error) {
        setErrorMessage('Error clearing history: ' + error.message);
      }
    } else {
      setHistory([]);
      window.localStorage.removeItem('contentRepurposerHistory');
      setStatusMessage('Local history cleared.');
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="hero-content">
          <div>
            <p className="eyebrow">Content Repurposer</p>
            <h1>Turn your video transcript into LinkedIn content fast.</h1>
            <p className="hero-copy">
              Generate polished posts with a strong call to action and the right tone for your audience.
            </p>
            <button className="hero-button" onClick={() => document.getElementById('repurpose-form').scrollIntoView({ behavior: 'smooth' })}>
              Start creating
            </button>
          </div>
          <div className="hero-card">
            <h2>Why customers pick us</h2>
            <ul>
              <li>Generate polished posts in seconds</li>
              <li>Choose a template for your content type</li>
              <li>Pick the right tone for LinkedIn</li>
              <li>Save history to your free trial account</li>
            </ul>
          </div>
        </div>
      </header>
      <main>
        <section className="tool-panel" id="repurpose-form">
          <div className="container">
            <div className="account-panel">
              <div>
                <h2>Free trial with account history</h2>
                <p>Sign up with your email to save generated posts and track your free trial usage.</p>
              </div>
              {accountEmail ? (
                <div className="account-info">
                  <p>
                    Signed in as <strong>{accountEmail}</strong>
                  </p>
                  <p>
                    Trial uses: {trialInfo.trial_uses} / {trialInfo.trial_limit}
                  </p>
                  {trialInfo.remaining_trial <= 0 ? (
                    <button className="upgrade-button" onClick={handleUpgrade}>
                      Upgrade to Pro
                    </button>
                  ) : null}
                  <button className="logout-button" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              ) : (
                <>
                  <div className="auth-mode-toggle">
                    <button
                      className={authMode === 'register' ? 'active' : ''}
                      onClick={() => setAuthMode('register')}
                      type="button"
                    >
                      Register
                    </button>
                    <button
                      className={authMode === 'login' ? 'active' : ''}
                      onClick={() => setAuthMode('login')}
                      type="button"
                    >
                      Login
                    </button>
                  </div>
                  <div className="auth-mode-label">
                    {authMode === 'login' ? 'Login mode: enter your account credentials' : 'Register mode: create a new account'}
                  </div>
                  <div className="signup-row">
                    <input
                      type="email"
                      value={emailInput}
                      placeholder="Email address"
                      onChange={(e) => setEmailInput(e.target.value)}
                    />
                    <input
                      type="password"
                      value={passwordInput}
                      placeholder="Password"
                      onChange={(e) => setPasswordInput(e.target.value)}
                    />
                    <button onClick={handleAuth} disabled={loading}>
                      {authMode === 'login' ? 'Login' : 'Register'}
                    </button>
                  </div>
                  <p className="upgrade-copy">Upgrade anytime to keep generating posts after your trial ends.</p>
                </>
              )}
            </div>

            <h2>Build your next LinkedIn post</h2>
            <p>Select a template, choose a tone, paste your transcript, and generate.</p>
            <div className="field-row">
              <label>
                Template
                <select value={template} onChange={(e) => setTemplate(e.target.value)}>
                  {templates.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Tone
                <select value={tone} onChange={(e) => setTone(e.target.value)}>
                  {tones.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <textarea
              placeholder="Paste your video transcript here..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows="12"
            />

            {errorMessage && <div className="error-message">{errorMessage}</div>}
            {statusMessage && !errorMessage && <div className="status-message">{statusMessage}</div>}

            <button onClick={handleGenerate} disabled={loading} className="generate-button">
              {loading ? 'Generating...' : 'Generate LinkedIn Post'}
            </button>

            {generatedPost && (
              <div className="result">
                <div className="result-header">
                  <h2>Generated Post</h2>
                  <button className="copy-button" onClick={handleCopy}>
                    Copy
                  </button>
                </div>
                <div className="generated-text">{generatedPost}</div>
              </div>
            )}

            {history.length > 0 && (
              <div className="history-card">
                <div className="history-header">
                  <h3>Saved History</h3>
                  <button className="clear-history" onClick={handleClearHistory}>
                    Clear all
                  </button>
                </div>
                <div className="history-list">
                  {history.map((item) => (
                    <div key={item.id} className="history-item">
                      <div className="history-meta">
                        <span>{item.templateLabel}</span>
                        <span>•</span>
                        <span>{item.toneLabel}</span>
                      </div>
                      <p className="history-text">{item.post}</p>
                      <div className="history-actions">
                        <button onClick={() => navigator.clipboard.writeText(item.post)}>
                          Copy
                        </button>
                        <button onClick={() => handleReuse(item)}>
                          Reuse
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
