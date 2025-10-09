/**
 * Chatbot Component
 * Main chatbot UI with message history and input
 */

import React, { useState, useRef, useEffect } from 'react';
import './Chatbot.css';
import { FaPaperPlane, FaTimes, FaRobot } from 'react-icons/fa';
import botAvatar from '../../assets/img/chatbot.gif';
import userAvatar from '../../assets/img/defaultavator.png';
import { useAuth } from '../../contexts/AuthContext';

const Chatbot = ({ onClose }) => {
  const STORAGE_KEY = 'campuscrew_chat_messages_v1';
  const { user } = useAuth?.() || {};
  const userAvatarSrc = (user && typeof user.profilePic === 'string' && user.profilePic.trim() !== '')
    ? user.profilePic
    : userAvatar;
  const [messages, setMessages] = useState(() => {
    // Load from sessionStorage if available, else use default greeting
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map(m => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp || new Date().toISOString(),
            isError: !!m.isError
          }));
        }
      }
    } catch (e) {
      // ignore and fall back to default
    }
    return [
      {
        role: 'assistant',
        content: 'Hello! I\'m the CampusCrew assistant. How can I help you today?',
        timestamp: new Date().toISOString()
      }
    ];
  });
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Persist messages in this browser tab until it is closed
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      // storage may be unavailable or full; fail silently
    }
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');

    // Add user message to chat
    const newUserMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      // Prepare conversation history (last 5 messages for context)
      const conversationHistory = messages.slice(-5).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Call backend API
      const response = await fetch(`${import.meta.env.VITE_BACKEND_LINK || 'http://localhost:8000'}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory
        })
      });

      const data = await response.json();

      if (data.success) {
        // Add bot response to chat
        const botMessage = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      
      // Add error message
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again later or contact support if the issue persists.',
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Lightweight Markdown renderer (bold, italics, links, line breaks)
  // This follows copilot_chatbot_prompt.txt rules without adding deps
  const renderMarkdown = (md) => {
    if (!md) return '';
    let s = String(md);

    // Escape HTML to prevent injection
    s = s
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');

    // Convert [text](url) to anchor
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Convert raw URLs to anchor (avoid double-linking inside existing anchors)
    s = s.replace(/(^|[\s(])((https?:\/\/[^\s)]+))/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');

    // Bold: **text**
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic: *text* (single asterisk, not part of bold)
    s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');

    // Line breaks: convert double newlines to extra spacing
    s = s.replace(/\n{2,}/g, '<br/><br/>').replace(/\n/g, '<br/>' );

    return s;
  };

  return (
    <div className="chatbot-container">
      <div className="chatbot-header">
        <div className="chatbot-header-content">
          <FaRobot className="chatbot-icon" />
          <div>
            <h3>CampusCrew Assistant</h3>
            <p>Ask me anything about CampusCrew</p>
          </div>
        </div>
        <button className="chatbot-close-btn" onClick={onClose} aria-label="Close chat">
          <FaTimes />
        </button>
      </div>

      <div className="chatbot-messages">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`message ${message.role} ${message.isError ? 'error' : ''}`}
          >
            <div className="message-row">
              {message.role === 'assistant' && (
                <img
                  className="avatar assistant"
                  src={botAvatar}
                  alt="Bot avatar"
                  width={32}
                  height={32}
                />
              )}
              <div
                className="message-content"
                {...(message.role === 'assistant'
                  ? { dangerouslySetInnerHTML: { __html: renderMarkdown(message.content) } }
                  : {})}
              >
                {message.role !== 'assistant' ? message.content : null}
              </div>
              {message.role === 'user' && (
                <img
                  className="avatar user"
                  src={userAvatarSrc}
                  alt="Your avatar"
                  width={32}
                  height={32}
                />
              )}
            </div>
            <div className="message-time">
              {formatTime(message.timestamp)}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message assistant">
            <div className="message-row">
              <img
                className="avatar assistant"
                src={botAvatar}
                alt="Bot avatar"
                width={32}
                height={32}
              />
              <div className="message-content typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chatbot-input-container">
        <input
          ref={inputRef}
          type="text"
          className="chatbot-input"
          placeholder="Type your message..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
        />
        <button
          className="chatbot-send-btn"
          onClick={handleSendMessage}
          disabled={!inputMessage.trim() || isLoading}
          aria-label="Send message"
        >
          <FaPaperPlane />
        </button>
      </div>
    </div>
  );
};

export default Chatbot;
