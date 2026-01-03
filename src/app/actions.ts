'use server'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'xiaomi/mimo-v2-flash:free';
const SITE_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://vaartamedia.in';
const WP_USER = process.env.WORDPRESS_USERNAME;
const WP_PASSWORD = process.env.WORDPRESS_APP_PASSWORD;

async function callOpenRouter(systemPrompt: string, userPrompt: string) {
  if (!OPENROUTER_API_KEY) throw new Error('OpenRouter API Key not configured');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': SITE_URL,
      'X-Title': 'SEO Job Generator',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter Error: ${response.status} - ${text}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

// NEW: Helper to generate keywords from topic first, since user removed input
export async function generateInitialKeywords(topic: string) {
  const prompt = `Generate 5 relevant SEO keywords for the topic below. 
Return ONLY the keywords, comma-separated. Do not use markdown like ** or #.
Topic: ${topic}`;
  return callOpenRouter('You are an expert SEO strategist. Output plain text only.', prompt);
}

export async function generateContent(topic: string, keywords: string) {
  const prompt = `Write a full article based on the topic and keywords below.
The article must:
Be at least 850 words long
Start the first paragraph with the focus keyword
Include the focus keyword in one or more subheadings (H2, H3, etc.)
Follow a professional, journalistic tone
Be SEO-optimized with natural keyword usage
output the content in HTML format (use <h2>, <h3>, <p>, <ul>, <li>, <strong>, <table>, etc.).
Do NOT use '<html>', '<head>', or '<body>' tags. Just the content.
Do NOT use Markdown characters like * or #.
Include a Table of Contents (using HTML anchor links if possible, or just a list).
Cover the topic in depth with factual, informative content
Avoid repeating the title inside the body
At the very end of the article, include a bold line or button text saying "Apply Link".
Topic: ${topic}
Keywords: ${keywords}`;
  return callOpenRouter('You are an expert SEO content writer. Output cleanly formatted HTML.', prompt);
}

export async function generateTitle(topic: string, keywords: string) {
  const prompt = `Write an SEO-optimized headline based on the topic and keywords below.
The title must:
Start with the primary focus keyword
Include one power word (e.g., Exciting, Exclusive, Top, Latest)
Be professional and news-style
Be under 60 characters
Be suitable for Google News and search engines
Return ONLY the title text. Do not use quotes, bolding, or markdown.
Topic: ${topic}
Keywords: ${keywords}`;
  return callOpenRouter('You are an expert SEO headline writer. Output plain text only.', prompt);
}

export async function generateMeta(topic: string, contentSummary: string, keywords: string) {
  const prompt = `Write a compelling meta description based on the topic, content summary, and keywords below.
The meta description must:
Be 150–160 characters long
Include the focus keyword exactly once
Be written in a click-worthy but professional tone
Accurately summarize the article content
Return ONLY the text. Do not use markdown.
Topic: ${topic}
Content Summary: ${contentSummary}
Keywords: ${keywords}`;
  return callOpenRouter('You are an expert SEO copywriter. Output plain text only.', prompt);
}

export async function generateFocusKeywords(topic: string, contentSummary: string) {
  const prompt = `Generate SEO-focused keywords based on the topic and content summary below.
Provide:
1 primary focus keyword
5 secondary keywords
5 long-tail keywords
Keywords must be relevant to job searches, hiring news, and organic traffic.
Return plain text only, no markdown formatting.
Topic: ${topic}
Content Summary: ${contentSummary}`;
  return callOpenRouter('You are an expert SEO strategist. Output plain text only.', prompt);
}

export async function generateExcerpt(topic: string, contentSummary: string) {
  const prompt = `Write a short excerpt based on the topic and content summary below.
The excerpt must:
Be 35–55 words
Include the focus keyword naturally
Be written in a news-style summary tone
Be suitable for previews, feeds, and social sharing
Return plain text only.
Topic: ${topic}
Content Summary: ${contentSummary}`;
  return callOpenRouter('You are an expert news editor. Output plain text only.', prompt);
}

export async function generateTags(topic: string, contentSummary: string) {
  const prompt = `Generate SEO-friendly tags based on the topic and content summary below.
The tags must:
Be comma-separated
Contain 8–15 tags
Be relevant to careers, hiring, jobs, and industry trends
Use lowercase words only
Return plain text only (comma separated).
Topic: ${topic}
Content Summary: ${contentSummary}`;
  return callOpenRouter('You are an expert SEO specialist. Output plain text only.', prompt);
}

export async function generateImagePrompt(topic: string, keywords: string, excerpt: string, postTitle: string) {
  const prompt = `Create an editorial image prompt based on the topic, keywords, excerpt, and post title below.
The image must:
Match a professional newsroom style
Be suitable for news websites and Google Discover
Avoid stock-photo clichés
Visually represent the article context

Also generate:
Image alt text using the focus keyword
A one-line image caption in journalistic tone
Output plain text only, clearly labeled.
Topic: ${topic}
Keywords: ${keywords}
Excerpt: ${excerpt}
Post Title: ${postTitle}`;
  return callOpenRouter('You are an expert visual editor. Output plain text only.', prompt);
}

export async function generateFocusedWords(topic: string, contentSummary: string) {
  const prompt = `Based on the topic and content summary below, list:
Focused Words (5–8 terms)
SEO Tags (comma-separated)
Output plain text only.
Topic: ${topic}
Content Summary: ${contentSummary}`;
  return callOpenRouter('You are an expert SEO analyst. Output plain text only.', prompt);
}

export async function uploadToWordPress(data: any) {
  if (!WP_USER || !WP_PASSWORD || !SITE_URL) {
    throw new Error('WordPress credentials not configured');
  }

  const auth = Buffer.from(`${WP_USER}:${WP_PASSWORD}`).toString('base64');
  
  const postBody = {
    title: data.title,
    content: data.content, 
    excerpt: data.excerpt,
    status: 'draft',
  };

  const response = await fetch(`${SITE_URL}/wp-json/wp/v2/posts`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(postBody)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`WordPress Upload Error: ${response.status} - ${text}`);
  }

  const json = await response.json();
  return json;
}
