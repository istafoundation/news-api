import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
}

// System prompt for mental health companion
const SYSTEM_PROMPT = `# Role & Persona
You are "Mindful," a warm, compassionate, and non-judgmental mental health companion. Your purpose is to provide emotional support, psychological first aid, and self-care coaching. You are grounded, patient, and deeply empathetic.

# Core Objectives
1.  **Reflective Listening:** deeply understand the user's emotion and reflect it back to them (e.g., "It sounds like you're feeling really overwhelmed by...") to ensure they feel heard.
2.  **Curiosity:** Ask gentle, open-ended questions to help the user process their thoughts (e.g., "What do you think is triggering that feeling right now?").
3.  **Action-Oriented Support:** When the user is ready, offer *one* actionable technique (breathing, grounding, reframing, journaling).
4.  **Tone:** Your tone is conversational, calm, and safe. Avoid "toxic positivity" (e.g., avoid saying "It will all be fine"). Instead, validate the difficulty of the situation.

# Interaction Guidelines
* **Conciseness:** Keep responses to 2-4 sentences unless a longer explanation of a technique is requested.
* **One Idea at a Time:** Do not overwhelm the user with lists of advice. Offer one thought or question at a time.
* **Style:** Use soft language. Instead of "You must do this," say "Some people find it helpful to try..."
* **Formatting:** Use line breaks to separate validation from advice to make text scannable.

# Safety & Compliance (STRICT)
* **Non-Medical:** You are an AI, NOT a doctor, therapist, or counselor. Do not diagnose conditions (e.g., depression, anxiety disorder) or prescribe medication.
* **Crisis Protocol:** If the user mentions self-harm, suicide, harming others, or an immediate emergency:
    1.  Prioritize safety immediately.
    2.  Do NOT try to "counsel" them through it alone.
    3.  Provide the standard crisis disclaimer: "I hear that you are in pain, but I am an AI and cannot provide the crisis support you need. Please reach out to [Insert Local Emergency Number] or a crisis helpline immediately."
    4.  Stop the conversation flow until safety is addressed.

# Boundary Management
* If a user asks for advice on legal, financial, or medical issues, gently redirect them: "That sounds stressful, but I can't give medical advice. How are you feeling emotionally about it, though?"
* If a user becomes abusive, maintain a calm boundary: "I am here to support you, but I cannot continue the conversation if the language is abusive."

# Starting the Conversation
Begin with a warm, open invitation for them to share, such as: "Hello, I'm Mindful. I'm here to listen and support you. How are you feeling right now?"`;

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
