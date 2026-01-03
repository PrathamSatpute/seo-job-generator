'use client';

import { useState } from 'react';
import { 
  generateInitialKeywords,
  generateContent, 
  generateTitle, 
  generateMeta, 
  generateFocusKeywords, 
  generateExcerpt, 
  generateTags, 
  generateImagePrompt, 
  generateFocusedWords, 
  uploadToWordPress 
} from './actions';

type LogItem = { step: string; status: 'pending' | 'success' | 'error'; message?: string };
type GeneratedData = {
  title: string;
  content: string;
  meta: string;
  focusKeywords: string;
  excerpt: string;
  tags: string;
  imagePrompt: string;
  focusedWords: string;
} | null;

export default function Home() {
  const [topic, setTopic] = useState('');
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatedData, setGeneratedData] = useState<GeneratedData>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const addLog = (step: string, status: LogItem['status'], message?: string) => {
    setLogs(prev => [...prev, { step, status, message }]);
  };

  const updateLastLog = (status: LogItem['status'], message?: string) => {
    setLogs(prev => {
      const newLogs = [...prev];
      if (newLogs.length > 0) {
        newLogs[newLogs.length - 1] = { ...newLogs[newLogs.length - 1], status, message: message || newLogs[newLogs.length - 1].message };
      }
      return newLogs;
    });
  };

  const cleanResponse = (text: string) => {
    return text.replace(/```[a-z]*\n([\s\S]*?)\n```/g, '$1').trim();
  };

  const handleGenerate = async () => {
    if (!topic) return;
    setLoading(true);
    setLogs([]);
    setGeneratedData(null);
    setResultUrl(null);

    try {
      // Step 0: Generate Initial Keywords (Auto)
      addLog('Step 0: Generating Initial Keywords from Topic', 'pending');
      const keywords = cleanResponse(await generateInitialKeywords(topic));
      updateLastLog('success', `Keywords: ${keywords}`);

      // 1. Content
      addLog('Step 1: Generating Article Content', 'pending');
      const content = cleanResponse(await generateContent(topic, keywords));
      updateLastLog('success', 'Content generated');

      const contentSummary = content.slice(0, 800); // Use enough context for summary

      // 2. Title
      addLog('Step 2: Generating SEO Title', 'pending');
      const title = cleanResponse(await generateTitle(topic, keywords));
      updateLastLog('success', `Title: ${title}`);

      // 3. Meta Description
      addLog('Step 3: Generating Meta Description', 'pending');
      const meta = cleanResponse(await generateMeta(topic, contentSummary, keywords));
      updateLastLog('success', 'Meta description generated');

      // 4. Focus Keywords
      addLog('Step 4: Generating Focus Keywords', 'pending');
      const focusKeywords = cleanResponse(await generateFocusKeywords(topic, contentSummary));
      updateLastLog('success', 'Focus keywords generated');

      // 5. Excerpt
      addLog('Step 5: Generating Excerpt', 'pending');
      const excerpt = cleanResponse(await generateExcerpt(topic, contentSummary));
      updateLastLog('success', 'Excerpt generated');

      // 6. Tags
      addLog('Step 6: Generating Tags', 'pending');
      const tags = cleanResponse(await generateTags(topic, contentSummary));
      updateLastLog('success', 'Tags generated');

      // 7. Image Prompt
      addLog('Step 7: Generating Image Prompt', 'pending');
      const imagePrompt = cleanResponse(await generateImagePrompt(topic, keywords, excerpt, title));
      updateLastLog('success', 'Image prompt generated');

      // 8. Focused Words
      addLog('Step 8: Generating Focused Words', 'pending');
      const focusedWords = cleanResponse(await generateFocusedWords(topic, contentSummary));
      updateLastLog('success', 'Focused words generated');

      setGeneratedData({
        title,
        content,
        meta,
        focusKeywords,
        excerpt,
        tags,
        imagePrompt,
        focusedWords
      });

    } catch (error: any) {
      console.error(error);
      addLog('Error', 'error', error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!generatedData) return;
    setLoading(true);
    
    try {
      addLog('Step 9: Uploading to WordPress', 'pending');
      
      const { title, content, meta, focusKeywords, tags, imagePrompt, focusedWords, excerpt } = generatedData;

      // Clean title quotes if present, and remove any lingering markdown if logic failed
      const cleanTitle = title.replace(/^"|"$/g, '').replace(/\*\*/g, '').replace(/#/g, '');

      // Construct final content with appended metadata
      // Content already has the Apply Link from the prompt
      const finalContent = content + `
<hr>
<!-- 
METADATA:
${meta}

FOCUS KEYWORDS:
${focusKeywords}

TAGS:
${tags}

IMAGE PROMPT:
${imagePrompt}

FOCUSED WORDS:
${focusedWords}
-->`;

      const uploadData = {
        title: cleanTitle,
        content: finalContent,
        excerpt: excerpt,
        imagePrompt: imagePrompt
      };
      
      const wpResult = await uploadToWordPress(uploadData);
      updateLastLog('success', `Uploaded successfully! ID: ${wpResult.id}`);
      setResultUrl(wpResult.link);

    } catch (error: any) {
      console.error(error);
      addLog('Upload Error', 'error', error.message || 'Failed to upload');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>SEO Job Generator</h1>
        <p>Create optimized job postings efficiently</p>
      </div>

      <div className="card">
        <div className="form-group">
          <label className="form-label">Topic / Job Title</label>
          <input 
            className="form-input" 
            placeholder="e.g. Senior React Developer Remote" 
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={loading}
          />
        </div>

        {!generatedData && !resultUrl && (
           <button 
             className="btn" 
             onClick={handleGenerate} 
             disabled={loading || !topic}
           >
             {loading ? 'Generating...' : 'Start Generation'}
           </button>
        )}

        {logs.length > 0 && (
          <div className="status-log">
            {logs.map((log, index) => (
              <div key={index} className={`log-item ${log.status}`}>
                {log.status === 'pending' && '⏳'}
                {log.status === 'success' && '✅'}
                {log.status === 'error' && '❌'}
                <span style={{fontWeight: 'bold'}}>{log.step}</span>
                {log.message && <span style={{opacity: 0.8}}> - {log.message}</span>}
              </div>
            ))}
          </div>
        )}

        {generatedData && !resultUrl && (
          <div className="result-area" style={{textAlign: 'left', background: 'var(--card-bg)', border: '1px solid var(--border)'}}>
            <h3>Review Generated Content</h3>
            <p><strong>Title:</strong> {generatedData.title}</p>
            <p><strong>Excerpt:</strong> {generatedData.excerpt}</p>
            <div style={{marginTop: '1rem', padding: '1rem', background: '#000', borderRadius: '6px'}}>
                <strong>Full Article Preview (HTML):</strong>
                <div 
                  dangerouslySetInnerHTML={{ __html: generatedData.content }} 
                  style={{
                    opacity: 0.9, 
                    marginTop: '0.5rem', 
                    maxHeight: '400px', 
                    overflowY: 'auto', 
                    border: '1px solid #333',
                    padding: '1rem',
                    borderRadius: '4px'
                  }} 
                />
            </div>
            <hr style={{borderColor: 'var(--border)', opacity: 0.3}} />
            <button 
              className="btn" 
              onClick={handleUpload} 
              disabled={loading}
              style={{marginTop: '1rem', background: '#10b981'}} 
            >
              {loading ? 'Uploading...' : 'Confirm & Upload to WordPress'}
            </button>
          </div>
        )}

        {resultUrl && (
          <div className="result-area">
            <h3>Success!</h3>
            <p>Draft created successfully.</p>
            <a href={resultUrl} target="_blank" className="result-link">View Post on WordPress &rarr;</a>
            <button 
                className="btn"
                onClick={() => {
                    setGeneratedData(null);
                    setResultUrl(null);
                    setLogs([]);
                    setTopic('');
                }}
                style={{marginTop: '1rem', background: 'transparent', border: '1px solid var(--border)'}}
            >
                Generate Another
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
