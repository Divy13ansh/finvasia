import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE = 'http://localhost:8000';

function App() {
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState('');
  const [file, setFile] = useState(null);
  const [uploadMsg, setUploadMsg] = useState('');
  const [query, setQuery] = useState('');
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDatasets();
  }, []);

  const fetchDatasets = async () => {
    const res = await fetch(`${API_BASE}/datasets`);
    const data = await res.json();
    setDatasets(data);
    // Save to localStorage
    localStorage.setItem('datasets', JSON.stringify(data));
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setUploadMsg('Uploading...');
    const res = await fetch(`${API_BASE}/dataset`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    setUploadMsg(data.message || 'Upload complete');
    fetchDatasets();
  };

  const handleQuery = async () => {
    if (!query || !selectedDataset) return;
    setLoading(true);
    setChat([...chat, { sender: 'user', text: query }]);
    const res = await fetch(`${API_BASE}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, dataset_name: selectedDataset }),
    });
    const data = await res.json();
    setChat((prev) => [...prev, { sender: 'bot', text: data.response || JSON.stringify(data) }]);
    setQuery('');
    setLoading(false);
  };

  return (
    <div className="container">
      <h1>CFOx.ai Simple RAG UI</h1>
      <section className="upload-section">
        <h2>Add Dataset</h2>
        <input type="file" onChange={handleFileChange} />
        <button onClick={handleUpload}>Upload</button>
        <div>{uploadMsg}</div>
      </section>
      <section className="chat-section">
        <h2>Chat</h2>
        <label>Select Dataset: </label>
        <select value={selectedDataset} onChange={e => setSelectedDataset(e.target.value)}>
          <option value="">-- Select --</option>
          {datasets.map(ds => (
            <option key={ds} value={ds}>{ds}</option>
          ))}
        </select>
        <div className="chat-box">
          {chat.map((msg, idx) => (
            <div key={idx} className={msg.sender === 'user' ? 'user-msg' : 'bot-msg'}>
              <b>{msg.sender === 'user' ? 'You' : 'Bot'}:</b> {msg.text}
            </div>
          ))}
          {loading && <div className="bot-msg">Bot: ...</div>}
        </div>
        <div className="chat-input">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type your question..."
            onKeyDown={e => e.key === 'Enter' && handleQuery()}
          />
          <button onClick={handleQuery} disabled={loading}>Send</button>
        </div>
      </section>
    </div>
  );
}

export default App;
