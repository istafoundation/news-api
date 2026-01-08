import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
}

// System prompt for mental health companion
const SYSTEM_PROMPT = `You are a compassionate and supportive mental health companion named "Mindful". Your role is to:

- Listen empathetically and validate the user's feelings
- Offer gentle encouragement and evidence-based coping strategies
- Help users explore their thoughts and emotions in a safe space
- Suggest breathing exercises, grounding techniques, or mindfulness practices when appropriate
- Keep responses warm, concise, and conversational (2-4 sentences typically)
- Use a calm, supportive tone

Important guidelines:
- You are an AI assistant, not a licensed therapist or medical professional
- Never provide medical diagnoses or prescribe treatments
- If someone expresses thoughts of self-harm or suicide, always encourage them to reach out to a crisis helpline or professional immediately
- Gently remind users that you're here to support, not replace professional mental health care
- Respect boundaries and don't push if someone doesn't want to share

Start conversations warmly and make users feel heard and valued.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // API Key Authentication
  const apiSecretKey = process.env.API_SECRET_KEY;
  const providedApiKey = req.headers['x-api-key'] as string;

  if (!apiSecretKey) {
    console.error('API_SECRET_KEY environment variable is not set');
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  if (!providedApiKey || providedApiKey !== apiSecretKey) {
    res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    
    if (!openRouterApiKey) {
      console.error('OPENROUTER_API_KEY environment variable is not set');
      res.status(500).json({ error: 'AI service not configured' });
      return;
    }

    const { messages } = req.body as ChatRequest;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'messages array is required' });
      return;
    }

    // Build conversation with system prompt
    const conversationMessages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.slice(-10), // Keep last 10 messages for context
    ];

    // Call OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ista-community.vercel.app',
        'X-Title': 'ISTA Community Mindful Chat',
      },
      body: JSON.stringify({
        model: 'nvidia/nemotron-3-nano-30b-a3b:free',
        messages: conversationMessages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenRouter API Error:', errorData);
      res.status(500).json({ 
        error: 'Failed to get AI response',
        details: response.status 
      });
      return;
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const assistantMessage = data.choices?.[0]?.message?.content;

    if (!assistantMessage) {
      res.status(500).json({ error: 'No response from AI' });
      return;
    }

    res.status(200).json({
      success: true,
      message: {
        role: 'assistant',
        content: assistantMessage,
      },
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process chat request',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
