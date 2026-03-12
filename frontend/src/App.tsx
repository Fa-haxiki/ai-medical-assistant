import React, { useState } from 'react';
import './App.css';
import ChatInterface from './components/ChatInterface';
import KnowledgeUpload from './components/KnowledgeUpload';

function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'knowledge'>('chat');

  return (
    <div className="App">
      <header className="App-header" aria-hidden="true" />
      <main>
        <div className="main-top-bar">
          <h2 className="main-title">AI医疗助手</h2>
          <div className="App-nav">
            <button
              className={`nav-button ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              智能问诊
            </button>
            <button
              className={`nav-button ${activeTab === 'knowledge' ? 'active' : ''}`}
              onClick={() => setActiveTab('knowledge')}
            >
              知识库管理
            </button>
          </div>
        </div>
        <div className="main-content">
          {activeTab === 'chat' ? <ChatInterface /> : <KnowledgeUpload />}
        </div>
      </main>
      <footer className="App-footer">
        <p>© 2026 AI医疗助手 · 仅供参考，非医疗建议</p>
      </footer>
    </div>
  );
}

export default App;
