import React, { useState, useEffect, useRef } from 'react';
import { AuthService } from './auth';
import { ChatService } from './chat';
import ReactMarkdown from 'react-markdown';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('google.gemma-3-27b-it');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    AuthService.getCurrentUser().then(setUser);
  }, []);

  useEffect(() => {
    if (user) {
      ChatService.getHistory().then(history => {
        const msgs = history.flatMap(h => [
          { role: 'user', content: h.userMessage, timestamp: h.timestamp },
          { role: 'assistant', content: h.botResponse, timestamp: h.timestamp }
        ]);
        setMessages(msgs);
      });
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = { role: 'user', content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await ChatService.sendMessage(input, selectedModel);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response, 
        timestamp: Date.now() 
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Error: ' + error.message, 
        timestamp: Date.now() 
      }]);
    }
    setLoading(false);
  };

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div className="app">
      <div className="stars"></div>
      <div className="stars2"></div>
      <div className="stars3"></div>
      
      <header>
        <div className="logo">
          <span className="logo-icon">⚡</span>
          <h1>NEXUS AI</h1>
        </div>
        <div className="header-controls">
          <select 
            value={selectedModel} 
            onChange={e => setSelectedModel(e.target.value)}
            className="model-selector"
          >
            <option value="google.gemma-3-27b-it">Gemma 3-27B</option>
            <option value="meta.llama3-70b-instruct-v1:0">Llama 3 70B</option>
            <option value="mistral.mistral-large-2402-v1:0">Mistral Large</option>
          </select>
          <button className="logout-btn" onClick={() => { AuthService.signOut(); setUser(null); }}>
            <span>Logout</span>
            <span className="logout-icon">→</span>
          </button>
        </div>
      </header>
      
      <div className="chat-container">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="message-avatar">
              {msg.role === 'user' ? '👤' : '🤖'}
            </div>
            <div className="message-content">
              <ReactMarkdown>
                {msg.content
                  .replace(/&#39;/g, "'")
                  .replace(/&quot;/g, '"')
                  .replace(/&amp;/g, '&')
                  .replace(/&lt;/g, '<')
                  .replace(/&gt;/g, '>')
                }
              </ReactMarkdown>
            </div>
          </div>
        ))}
        {loading && (
          <div className="message assistant">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="input-container">
        <div className="input-wrapper">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask me anything..."
            disabled={loading}
          />
          <button onClick={handleSend} disabled={loading} className="send-btn">
            <span className="send-icon">⚡</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (needsVerification) {
        await AuthService.confirmSignUp(email, code);
        alert('Email verified! Please sign in.');
        setNeedsVerification(false);
        setIsSignUp(false);
      } else if (isSignUp) {
        await AuthService.signUp(email, password);
        setNeedsVerification(true);
      } else {
        await AuthService.signIn(email, password);
        const user = await AuthService.getCurrentUser();
        onLogin(user);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  if (needsVerification) {
    return (
      <div className="login">
        <form onSubmit={handleSubmit}>
          <h2>Verify Email</h2>
          <p>Check your email for verification code</p>
          {error && <div className="error">{error}</div>}
          <input
            type="text"
            placeholder="Verification Code"
            value={code}
            onChange={e => setCode(e.target.value)}
            required
          />
          <button type="submit">Verify</button>
          <button type="button" onClick={() => setNeedsVerification(false)}>
            Back
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="login">
      <form onSubmit={handleSubmit}>
        <h2>{isSignUp ? 'Sign Up' : 'Sign In'}</h2>
        {error && <div className="error">{error}</div>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button type="submit">{isSignUp ? 'Sign Up' : 'Sign In'}</button>
        <button type="button" onClick={() => setIsSignUp(!isSignUp)}>
          {isSignUp ? 'Already have an account?' : 'Need an account?'}
        </button>
      </form>
    </div>
  );
}

export default App;
