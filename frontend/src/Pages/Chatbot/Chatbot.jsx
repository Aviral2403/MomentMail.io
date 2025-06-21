import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import LoadingSkeleton from "../../Components/LoadingSkeleton/LoadingSkeleton";
import './Chatbot.css';

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true); // Start with true for initial loading
  const [userInfo, setUserInfo] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [apiLoading, setApiLoading] = useState(false); // Separate loading state for API calls
  const [suggestions] = useState([
    "How do I create an effective email template?",
    "What are the best practices for email subject lines?",
    "How can I improve my email open rates?",
    "What's the optimal time to send bulk emails?",
    "How to avoid spam filters?",
    "What are some effective email CTAs?",
  ]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize component - load user info and chat history
  useEffect(() => {
    const initializeChat = async () => {
      try {
        // Get user info from localStorage
        const storedUserInfo = localStorage.getItem('user-info');
        if (storedUserInfo) {
          const parsedUserInfo = JSON.parse(storedUserInfo);
          setUserInfo(parsedUserInfo);
          
          // Load chat history for this user
          const savedMessages = localStorage.getItem(`chatHistory-${parsedUserInfo.email}`);
          if (savedMessages) {
            setMessages(JSON.parse(savedMessages));
          } else {
            setWelcomeMessage();
          }
        } else {
          // No user info found, set welcome message
          setWelcomeMessage();
        }
        
        // Simulate loading time (you can remove this or adjust as needed)
        await new Promise(resolve => setTimeout(resolve, 1500));
        
      } catch (error) {
        console.error('Error initializing chat:', error);
        setWelcomeMessage();
      } finally {
        setLoading(false);
      }
    };

    initializeChat();
  }, []);

  const setWelcomeMessage = () => {
    setMessages([{
      role: 'assistant',
      content: "# Welcome to the Email Marketing Assistant!\n\nI can help you with:\n\n* Crafting effective email templates\n* Optimizing subject lines\n* Improving open rates\n* Scheduling strategies\n* Avoiding spam filters\n\nHow can I help you today?"
    }]);
  };

  // Save messages whenever they change
  useEffect(() => {
    if (messages.length > 0 && userInfo?.email) {
      localStorage.setItem(`chatHistory-${userInfo.email}`, JSON.stringify(messages));
    }
  }, [messages, userInfo]);

  // Auto-scroll and focus
  useEffect(() => {
    if (!loading) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamedText, loading]);

  useEffect(() => {
    if (!loading) {
      inputRef.current?.focus();
    }
  }, [loading]);

  const goBack = () => {
    window.history.back();
  };

  const simulateStreamingText = async (text) => {
    setIsStreaming(true);
    setStreamedText('');
    
    // Split text into chunks (sentences or segments)
    const chunks = text.split(/(?<=\n)/);
    
    for (let i = 0; i < chunks.length; i++) {
      await new Promise(resolve => {
        setTimeout(() => {
          setStreamedText(prev => prev + chunks[i]);
          resolve();
        }, 20); // Adjust timing for realistic typing speed
      });
    }
    
    // Once streaming is complete, add the full message to the messages array
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: text
    }]);
    
    setIsStreaming(false);
    setStreamedText('');
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error("API key is missing");
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Configuration error: API key not found"
      }]);
      return;
    }

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setApiLoading(true);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ 
                text: `You are an expert email marketing consultant. Answer professionally using proper formatting with:
                - Use markdown formatting for structure
                - Use ## for main headings and ### for subheadings
                - Use bullet points (*) or numbered lists (1.) for listing items
                - Use proper spacing between sections (add blank lines)
                - Use **bold** for emphasis on important points
                - Keep paragraphs concise and scannable
                - Organize information in a clear, hierarchical structure
                
                Always format your response using markdown syntax.
                \nUser Question: ${input}\n\nAnswer:`
              }]
            }],
            safetySettings: [
              {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_ONLY_HIGH"
              }
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2000,
              topP: 0.9
            }
          })
        }
      );

      const data = await response.json();
      console.log('API Response:', data);
      
      if (!response.ok) {
        throw new Error(data.error?.message || `API Error: ${response.status}`);
      }

      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Unexpected response format from API');
      }

      // Instead of immediately setting the message, simulate streaming
      await simulateStreamingText(data.candidates[0].content.parts[0].text);
    } catch (error) {
      console.error('API Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `## Error\n\nSorry, I encountered an error: ${error.message || 'Please try again later'}`
      }]);
    } finally {
      setApiLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const clearChat = () => {
    setWelcomeMessage();
  };

  // Show loading skeleton during initial load
  if (loading) {
    return <LoadingSkeleton type="ask-ai" />;
  }

  return (
    <div className="chatbot-container">
      <div className="chatbot-header">
        <div className="header-left">
          <button className="back-button" onClick={goBack}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h2>Email Marketing Assistant</h2>
        </div>
        <button className="clear-button" onClick={clearChat}>
          New Chat
        </button>
      </div>

      <div className="messages-container">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.role}-message`}>
            <div className="message-bubble">
              {message.role === 'assistant' ? (
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]} 
                  rehypePlugins={[rehypeSanitize]}
                  components={{
                    root: ({node, ...props}) => <div className="markdown-content" {...props} />
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              ) : (
                <p>{message.content}</p>
              )}
            </div>
          </div>
        ))}
        {isStreaming && (
          <div className="message assistant-message">
            <div className="message-bubble">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSanitize]}
                components={{
                  root: ({node, ...props}) => <div className="markdown-content" {...props} />
                }}
              >
                {streamedText}
              </ReactMarkdown>
              <span className="cursor-blink"></span>
            </div>
          </div>
        )}
        {apiLoading && !isStreaming && (
          <div className="message assistant-message">
            <div className="message-bubble">
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

      <div className="suggestions-container">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            className="suggestion-button"
            onClick={() => handleSuggestionClick(suggestion)}
            disabled={apiLoading || isStreaming}
          >
            {suggestion}
          </button>
        ))}
      </div>

      <div className="input-container">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about email marketing..."
          rows={1}
          className="chat-input"
          disabled={apiLoading || isStreaming}
        />
        <button 
          onClick={sendMessage} 
          disabled={apiLoading || isStreaming || !input.trim()}
          className="send-button"
          aria-label="Send message"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Chatbot;