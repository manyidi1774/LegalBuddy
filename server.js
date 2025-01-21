require('dotenv').config();

const OpenAI = require('openai');
// Log for debugging
console.log('API Key exists:', !!process.env.OPENAI_API_KEY);
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Accept']
}));

app.use(express.json());
app.use(express.static('public'));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Define MongoDB schemas
const ChatSchema = new mongoose.Schema({
    userId: String,
    messages: [{
        content: String,
        timestamp: Date,
        isUser: Boolean
    }]
});

const UserSchema = new mongoose.Schema({
    userId: String,
    preferences: {
        theme: String,
        language: String
    }
});

const Chat = mongoose.model('Chat', ChatSchema);
const User = mongoose.model('User', UserSchema);

async function getBotResponse(userMessage) {
    try {
        // Add context management
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: `You are a helpful legal assistant. 
                             Provide clear, concise legal information.
                             Always include a disclaimer about not being legal advice.
                             Focus on ${userMessage.length > 100 ? 'detailed' : 'brief'} responses.`
                },
                {
                    role: "user",
                    content: userMessage
                }
            ],
            max_tokens: 500,
            temperature: 0.7,
            presence_penalty: 0.6,
            frequency_penalty: 0.5,
        });

        return completion.choices[0].message.content;
    } catch (error) {
        if (error.response) {
            console.error(error.response.status);
            console.error(error.response.data);

            if (error.response.status === 429) {
                return "I'm receiving too many requests right now. Please try again in a moment.";
            }
        }

        console.error('OpenAI API Error:', error);
        return "I apologize, but I'm having trouble processing your request at the moment. Please try again later.";
    }
}


// API endpoints
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        const userId = req.session.userId;

        // Save user message
        await Chat.updateOne(
            { userId },
            {
                $push: {
                    messages: {
                        content: message,
                        timestamp: new Date(),
                        isUser: true
                    }
                }
            },
            { upsert: true }
        );

        // Get bot response (implement your AI logic here)
        const botResponse = await getBotResponse(message); // Replace with actual bot logic

        // Save bot response
        await Chat.updateOne(
            { userId },
            {
                $push: {
                    messages: {
                        content: botResponse,
                        timestamp: new Date(),
                        isUser: false
                    }
                }
            }
        );

        res.json({ response: botResponse });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/chat-history', async (req, res) => {
    try {
        const userId = req.session.userId;
        const chat = await Chat.findOne({ userId });
        res.json(chat?.messages || []);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/chats', async (req, res) => {
    try {
        const userId = req.session.userId || 'anonymous';
        const chats = await Chat.find({ userId });
        res.json(chats);
    } catch (error) {
        console.error('Error loading chats:', error);
        res.status(500).json({ error: 'Failed to load chats' });
    }
});

app.put('/api/chats/:chatId', async (req, res) => {
    try {
        const { chatId } = req.params;
        const { title } = req.body;
        const userId = req.session.userId || 'anonymous';

        const updatedChat = await Chat.findOneAndUpdate(
            { _id: chatId, userId },
            { title },
            { new: true }
        );

        if (!updatedChat) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        res.json({ success: true, chat: updatedChat });
    } catch (error) {
        console.error('Error updating chat:', error);
        res.status(500).json({ error: 'Failed to update chat' });
    }
});

app.delete('/api/chats/:chatId', async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.session.userId || 'anonymous';

        const deletedChat = await Chat.findOneAndDelete({
            _id: chatId,
            userId
        });

        if (!deletedChat) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting chat:', error);
        res.status(500).json({ error: 'Failed to delete chat' });
    }
});

app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        console.log('Received message:', message); // Debug log

        // Get bot response from OpenAI
        const botResponse = await getBotResponse(message);
        console.log('Bot response:', botResponse); // Debug log

        res.json({ response: botResponse });
    } catch (error) {
        console.error('Error in chat endpoint:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/clear-chats', async (req, res) => {
    try {
        await Chat.deleteMany({});
        res.json({ message: 'All chats cleared' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to clear chats' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

