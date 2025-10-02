import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { chatAPI } from '../services/api';
import ReactMarkdown from 'react-markdown';
import starlightCharacter from '../assets/starlight_character.png';
import starlight2 from '../assets/starlight2.png';
import './Chat.css';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Add welcome message with Starlight's personality
    setMessages([
      {
        role: 'assistant',
        content: "👋 Hi there! I'm Starlight, your friendly AI document assistant. I'm here to help you understand your documents better. Just upload some files and ask me anything - I'm great at finding information and providing summaries!",
      },
    ]);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message to chat
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // Prepare conversation history for backend (exclude the current message and welcome message)
      const historyForBackend = messages
        .filter(msg => msg.role !== 'assistant' || !msg.content.includes("👋 Hi there! I'm Starlight"))
        .slice(-10) // Keep last 10 messages for context
        .map(msg => ({
          user: msg.role === 'user' ? msg.content : undefined,
          assistant: msg.role === 'assistant' ? msg.content : undefined
        }))
        .filter(entry => entry.user || entry.assistant);

      console.log('Sending conversation history:', historyForBackend);
      console.log('Current message count:', messages.length);
      console.log('Filtered messages for history:', messages.filter(msg => msg.role !== 'assistant' || !msg.content.includes("👋 Hi there! I'm Starlight")));

      const response = await chatAPI.sendMessage(userMessage, historyForBackend);

      // Add assistant response to chat
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.answer,
          chunkSummaries: response.chunkSummaries
        },
      ]);

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error while processing your message. Please try again.',
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-sidebar">
        <div className="sidebar-header">
          <div className="starlight-sidebar-avatar">
            <img src={starlight2} alt="Starlight" />
          </div>
          <h2>Starlight</h2>
          <p>Your friendly AI assistant</p>
        </div>

        <div className="sidebar-actions">
          <Link to="/upload" className="btn btn-secondary btn-full">
            📁 Upload Document
          </Link>
        </div>

        <div className="sidebar-tips">
          <h3>💡 Tips</h3>
          <ul>
            <li>Ask specific questions about your documents</li>
            <li>Request summaries using keywords like "summary" or "summarize"</li>
            <li>Reference specific chapters or sections</li>
            <li>Ask for comparisons between documents</li>
          </ul>
        </div>
      </div>

      <div className="chat-main">
        <div className="chat-messages">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`message ${message.role} ${
                message.isError ? 'error' : ''
              }`}
            >
              <div className="message-avatar">
                {message.role === 'user' ? (
                  '👤'
                ) : (
                  <img src={starlightCharacter} alt="Starlight" />
                )}
              </div>
              <div className="message-content">
                <div className="message-text">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p style={{ margin: 0 }}>{children}</p>,
                      h1: ({ children }) => <h1 style={{ fontSize: '1.5em', fontWeight: 'bold', margin: '0.5em 0' }}>{children}</h1>,
                      h2: ({ children }) => <h2 style={{ fontSize: '1.3em', fontWeight: 'bold', margin: '0.4em 0' }}>{children}</h2>,
                      h3: ({ children }) => <h3 style={{ fontSize: '1.1em', fontWeight: 'bold', margin: '0.3em 0' }}>{children}</h3>,
                      ul: ({ children }) => <ul style={{ margin: '0.5em 0', paddingLeft: '1.5em' }}>{children}</ul>,
                      ol: ({ children }) => <ol style={{ margin: '0.5em 0', paddingLeft: '1.5em' }}>{children}</ol>,
                      li: ({ children }) => <li style={{ margin: '0.2em 0' }}>{children}</li>,
                      code: ({ children }) => <code style={{ background: 'rgba(0,0,0,0.1)', padding: '0.2em 0.4em', borderRadius: '3px', fontFamily: 'monospace' }}>{children}</code>,
                      pre: ({ children }) => <pre style={{ background: 'rgba(0,0,0,0.05)', padding: '1em', borderRadius: '5px', overflow: 'auto', margin: '0.5em 0' }}>{children}</pre>,
                      blockquote: ({ children }) => <blockquote style={{ borderLeft: '4px solid var(--primary)', paddingLeft: '1em', margin: '0.5em 0', fontStyle: 'italic' }}>{children}</blockquote>,
                      strong: ({ children }) => <strong style={{ fontWeight: 'bold' }}>{children}</strong>,
                      em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
                {message.chunkSummaries && message.chunkSummaries.length > 0 && (
                  <div className="chunk-summaries">
                    <details>
                      <summary>View detailed summaries</summary>
                      <div className="summaries-list">
                        {message.chunkSummaries.map((chunk, idx) => (
                          <div key={idx} className="chunk-item">
                            <strong>{chunk.title || `Chunk ${idx + 1}`}</strong>
                            <p>{chunk.summary}</p>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="message assistant">
              <div className="message-avatar">🤖</div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="chat-input-form">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your documents..."
            rows="1"
            disabled={loading}
            className="chat-input"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="send-button"
          >
            {loading ? '⏳' : '➤'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
