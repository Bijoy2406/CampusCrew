import React, { useState, useRef, useEffect } from "react";
import stringSimilarity from "string-similarity";
import "../CSS/ChatBot.css";
import { faqR } from "../data/faqRandom";


const faq = [
  ...faqR
];
function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hello! I am your event assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef(null);

  const toggleChat = () => setIsOpen(!isOpen);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = { sender: "user", text: input };
    setMessages(prev => [...prev, userMessage]);

    const questions = faq.map(f => f.question.toLowerCase());
    const userText = input.toLowerCase();
    const { bestMatchIndex, ratings } = stringSimilarity.findBestMatch(userText, questions);

    let botResponse;
    if (ratings[bestMatchIndex].rating > 0.5) {
      botResponse = faq[bestMatchIndex].answer;
    } else {
      botResponse = "I'm sorry, I didn't understand that. Can you rephrase your question?";
    }

    setTimeout(() => {
      setMessages(prev => [...prev, { sender: "bot", text: botResponse }]);
    }, 500);

    setInput("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSend();
  };

  // Scroll to bottom when messages update
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  return (
    <>
      {/* Bot Icon */}
      <div className={`chatbot-icon ${isOpen ? "hidden" : ""}`} onClick={toggleChat}>
        🤖
      </div>

      {/* Chat Popup */}
      <div className={`chatbot-popup ${isOpen ? "open" : ""}`}>
        <div className="chatbot-header">
          Event Assistant
          <button className="close-btn" onClick={toggleChat}>✖</button>
        </div>
        <div className="chat-window">
          {messages.map((msg, index) => (
            <div key={index} className={`chat-message ${msg.sender}`}>
              {msg.text}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <div className="chat-input">
          <input
            type="text"
            placeholder="Ask me something..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button onClick={handleSend}>Send</button>
        </div>
      </div>
    </>
  );
}

export default ChatBot;
