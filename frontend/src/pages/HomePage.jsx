import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import starlight2 from '../assets/starlight2.png';
import starlight3 from '../assets/starlight3.png';
import starlight4 from '../assets/starlight4.png';
import starlight5 from '../assets/starlight5.png';
import starlightCharacter from '../assets/starlight_character.png';
import './HomePage.css';

const HomePage = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="homepage">
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Meet <span className="gradient-text">Starlight</span>
            <br />
            Your AI Document Assistant
          </h1>
          <p className="hero-description">
            Upload your documents and chat with Starlight, your friendly AI assistant.
            Get instant answers, summaries, and insights from your files with a personal touch.
          </p>
          <div className="hero-buttons">
            {isAuthenticated ? (
              <>
                <Link to="/upload" className="btn btn-primary">
                  Upload Documents
                </Link>
                <Link to="/chat" className="btn btn-secondary">
                  Chat with Starlight
                </Link>
              </>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary">
                  Meet Starlight
                </Link>
                <Link to="/login" className="btn btn-secondary">
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="hero-illustration">
          <div className="starlight-avatar main-avatar">
            <img src={starlightCharacter} alt="Starlight AI Assistant" />
            <div className="avatar-glow"></div>
          </div>
          <div className="floating-avatar avatar-1">
            <img src={starlight2} alt="Starlight smiling" />
          </div>
          <div className="floating-avatar avatar-2">
            <img src={starlight3} alt="Starlight happy" />
          </div>
          <div className="floating-avatar avatar-3">
            <img src={starlight4} alt="Starlight cheerful" />
          </div>
          <div className="floating-avatar avatar-4">
            <img src={starlight5} alt="Starlight friendly" />
          </div>
        </div>
      </section>

      <section className="starlight-intro">
        <div className="intro-content">
          <div className="intro-text">
            <h2>Get to Know Starlight</h2>
            <p>
              Starlight is your friendly AI companion, always ready to help you navigate through your documents.
              With her warm personality and advanced intelligence, she'll make working with your files feel like
              chatting with a knowledgeable friend.
            </p>
            <div className="starlight-traits">
              <div className="trait">
                <span className="trait-icon">🤗</span>
                <span>Friendly & Approachable</span>
              </div>
              <div className="trait">
                <span className="trait-icon">🧠</span>
                <span>Smart & Knowledgeable</span>
              </div>
              <div className="trait">
                <span className="trait-icon">⚡</span>
                <span>Fast & Efficient</span>
              </div>
              <div className="trait">
                <span className="trait-icon">�</span>
                <span>Secure & Private</span>
              </div>
            </div>
          </div>
          <div className="intro-avatar">
            <img src={starlight2} alt="Starlight smiling warmly" />
          </div>
        </div>
      </section>

      <section className="features">
        <h2 className="section-title">What Starlight Can Do For You</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🚀</div>
            <h3>Instant Answers</h3>
            <p>Ask Starlight anything about your documents and get immediate, accurate responses.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🧠</div>
            <h3>Deep Understanding</h3>
            <p>Starlight truly understands your documents and provides context-aware answers.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Secure & Private</h3>
            <p>Your documents are encrypted and stored securely. Only you have access.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Smart Summaries</h3>
            <p>Get instant summaries and key insights from your documents with Starlight's help.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💡</div>
            <h3>Context-Aware</h3>
            <p>Starlight remembers context across your documents for better, more relevant answers.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Real-time Chat</h3>
            <p>Chat with Starlight in real-time and get instant responses to your questions.</p>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-content">
          <div className="cta-avatar">
            <img src={starlight3} alt="Starlight ready to help" />
          </div>
          <div className="cta-text">
            <h2>Ready to meet Starlight?</h2>
            <p>Join thousands of users who are already chatting with Starlight to boost their productivity.</p>
            {!isAuthenticated && (
              <Link to="/register" className="btn btn-primary btn-large">
                Start Chatting with Starlight
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
