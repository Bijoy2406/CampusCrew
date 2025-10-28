const express = require('express');
const path = require('path');
const app = express()
const cors = require('cors')
const cookieParser = require('cookie-parser')
require('dotenv').config({ path: path.join(__dirname, '.env') })
const MongDB = require('./database')
const { startAutomaticCleanup } = require('./utils/eventCleanup')
const port = process.env.PORT || 8000
const frontend_url = process.env.frontend_url


const UserRouter = require('./Router/UserRoute')
const EventRouter = require('./Router/EventRoute')
const RegistrationRouter = require('./Router/RegistrationRoute')
const RecommendetionRouter = require('./Router/Recommendetion')
const ChatRouter = require('./Router/ChatRoute')
const embeddingService = require('./services/embeddingService')

// Import the automatic vector database update system
const { autoUpdateVectorDB } = require('./utils/autoUpdateVectorDB')


app.use(express.json())
MongDB();
const allowedOrigins = [
    frontend_url,
    'https://talk-threads-seven.vercel.app'
];


app.use(cors({
    origin: function (origin, callback) {
        if (allowedOrigins.includes(origin) || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ['Content-Type', 'Authorization', 'refreshtoken'],
}))
app.use(cookieParser())


app.get('/', (req, res) => {
    res.status(200).send(`Backend is running in port ${port}`)
})


app.listen(port, async () => {
    console.log(`Backend is running on port ${port}`)
    // Start the automatic event cleanup service
    startAutomaticCleanup();
    
    // Initialize chatbot knowledge base (optional)
    if (process.env.ENABLE_EMBEDDINGS !== 'false') {
        console.log('\n🤖 Initializing Chatbot Knowledge Base...');
        try {
            await embeddingService.loadKnowledgeBase();
            console.log('✅ Chatbot ready!\n');
        } catch (error) {
            console.error('⚠️  Chatbot initialization failed:', error.message);
            console.log('Chatbot will work with limited functionality\n');
        }
    } else {
        console.log('\n⚠️  Skipping embedding initialization (ENABLE_EMBEDDINGS=false).');
        console.log('   The chatbot will use keyword-based context only.\n');
    }
    
    // Auto-update Qdrant with fresh data (checks for old/duplicate data)
    // Runs in background without blocking server startup
    autoUpdateVectorDB().catch(error => {
        console.error('⚠️  Vector database auto-update failed:', error.message);
    });
})


app.use('/api', UserRouter)
app.use('/api', EventRouter)
app.use('/api', RegistrationRouter)
app.use('/api', RecommendetionRouter)
app.use('/api', ChatRouter)