import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Load variables from .env file
dotenv.config();

// Workaround for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("⚠️ Error: No API key found!");
    console.error("Please open the .env file and add your GEMINI_API_KEY.");
    process.exit(1);
}

// Initialize the AI agent
const ai = new GoogleGenAI({ apiKey });

// Chat API Endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: message,
        });

        res.json({ text: response.text });
    } catch (error) {
        console.error('⚠️ AI Agent Error:', error.message || error);
        res.status(500).json({ error: 'Failed to generate content' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`==================================================`);
    console.log(`🚀 AI Agent Server is running!`);
    console.log(`🌐 Open http://localhost:${port} in your browser`);
    console.log(`==================================================`);
});
