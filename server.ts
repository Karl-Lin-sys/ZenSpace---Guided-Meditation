import express from 'express';
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '50mb' }));

if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });
  app.use(vite.middlewares);
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Meditation generation endpoint
app.post('/api/meditation/generate', async (req, res) => {
  try {
    const { topic, duration, mood } = req.body;
    
    const prompt = `Create a guided meditation session script.
    Topic: ${topic}
    Estimated duration: ${duration} minutes
    Mood: ${mood}
    
    Provide the response in JSON format with:
    - title: A calming title
    - script: The full text for the meditation. Use natural pauses and gentle instructions.
    - imagePrompt: A detailed, artistic prompt for an image generator that captures the mood of this meditation. Describe a serene, abstract, or natural scene. No text in the image.
    - backgroundDescription: A brief description of the visual scene for accessibility.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            script: { type: Type.STRING },
            imagePrompt: { type: Type.STRING },
            backgroundDescription: { type: Type.STRING },
          },
          required: ["title", "script", "imagePrompt", "backgroundDescription"],
        },
      },
    });

    res.json(JSON.parse(response.text || '{}'));
  } catch (error: any) {
    console.error('Error generating meditation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Image generation endpoint
app.post('/api/meditation/image', async (req, res) => {
  try {
    const { prompt, size = '1K' } = req.body;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: size as any,
        },
      },
    });

    let imageUrl = '';
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) {
      throw new Error('No image was generated');
    }

    res.json({ imageUrl });
  } catch (error: any) {
    console.error('Error generating image:', error);
    res.status(500).json({ error: error.message });
  }
});

// TTS endpoint
app.post('/api/meditation/audio', async (req, res) => {
  try {
    const { text, voice = 'Kore' } = req.body;
    
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash-tts",
      contents: [
        {
          role: "user",
          parts: [{ text }],
        },
      ],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice as any },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error('No audio was generated');
    }

    res.json({ audio: base64Audio });
  } catch (error: any) {
    console.error('Error generating audio:', error);
    res.status(500).json({ error: error.message });
  }
});

// Chatbot endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, complexity = 'general' } = req.body;
    
    // Select model based on complexity
    let model = 'gemini-3.8-flash';
    if (complexity === 'complex') model = 'gemini-4-argon';
    if (complexity === 'fast') model = 'gemini-3.1-flash-lite';

    const chat = ai.chats.create({
      model,
      config: {
        systemInstruction: "You are a Zen meditation master and mindfulness coach. Your goal is to help users find peace, manage stress, and deepen their meditation practice. Use a calm, compassionate, and wise tone. Keep responses relatively concise but meaningful.",
      },
      history: messages.slice(0, -1).map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      })),
    });

    const lastMessage = messages[messages.length - 1].content;
    const result = await chat.sendMessage(lastMessage);
    
    res.json({ content: result.text });
  } catch (error: any) {
    console.error('Error in chat:', error);
    res.status(500).json({ error: error.message });
  }
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
} else {
  // In development, we'll let Vite handle the frontend
  // The agent environment will run this server alongside Vite
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
