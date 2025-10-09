/**
 * Chat Route
 * Handles chatbot API endpoints with advanced features:
 * - Website crawling and indexing
 * - ChromaDB for better knowledge retrieval
 * - MongoDB integration for live event data
 */

const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const embeddingService = require('../services/embeddingService');
const chromaManager = require('../utils/chromaEmbeddings');
const dbTools = require('../utils/dbTools');
const WebsiteCrawler = require('../utils/crawler');
const firecrawlService = require('../utils/firecrawlService');
const path = require('path');
const fs = require('fs').promises;

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const CHAT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const FALLBACK_CHAT_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.5-pro';
const API_VERSION = process.env.GEMINI_API_VERSION || 'v1';
const MAX_OUTPUT_TOKENS = Number(process.env.GEMINI_MAX_OUTPUT_TOKENS);
const FRONTEND_BASE_URL = (process.env.frontend_url || process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const HAS_MAX_TOKENS = Number.isFinite(MAX_OUTPUT_TOKENS) && MAX_OUTPUT_TOKENS > 0;

/**
 * Simple context retrieval without embeddings
 * Uses keyword matching from knowledge base files
 */
async function getSimpleContext(query) {
  try {
    const dataDir = path.join(__dirname, '../data/website_content');
    const files = await fs.readdir(dataDir);
    const txtFiles = files.filter(f => f.endsWith('.txt'));
    
    const queryLower = query.toLowerCase();
    const cleanedQuery = queryLower.replace(/[^a-z0-9\s]/g, ' ');
    let keywords = cleanedQuery.split(/\s+/).filter(w => w.length > 2);

    if (keywords.length === 0 && queryLower.includes('campuscrew')) {
      keywords = ['campuscrew'];
    }
    
    let bestMatches = [];
    
    for (const file of txtFiles) {
      const content = await fs.readFile(path.join(dataDir, file), 'utf-8');
      const contentLower = content.toLowerCase();
      
      // Count keyword matches
      let score = 0;
      for (const keyword of keywords) {
        const matches = (contentLower.match(new RegExp(keyword, 'g')) || []).length;
        score += matches;
      }
      
      if (score > 0) {
        bestMatches.push({ file, content, score });
      }
    }
    
    // Sort by score and take top 3
    bestMatches.sort((a, b) => b.score - a.score);
    const topMatches = bestMatches.slice(0, 3);
    
    if (topMatches.length > 0) {
      return topMatches.map(m => m.content.substring(0, 1500)).join('\n\n---\n\n');
    }

    // Fallback to general overview content if no keyword matches
    try {
      const homePath = path.join(dataDir, 'home.txt');
      const defaultContent = await fs.readFile(homePath, 'utf-8');
      return defaultContent.substring(0, 1500);
    } catch (_) {
      // ignore and fall through
    }
    
    return null;
  } catch (error) {
    console.error('Simple context error:', error.message);
    return null;
  }
}

/**
 * POST /chat
 * Process user message and return bot response
 * Now with database integration and advanced context retrieval
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    // Validate input
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message is required and must be a string'
      });
    }

    // Validate Gemini API key
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Gemini API key not configured'
      });
    }

    // Step 1: Check if query requires database access
    const needsDB = dbTools.requiresDatabaseQuery(message);
    const liveDataSections = [];
    let cachedStats = null;
    const wantsFee = /\b(fee|registration fee|cost|price|entry fee|ticket)\b/i.test(message);
    const wantsPrize = /\b(prize|prize money|price money|reward|winnings)\b/i.test(message);
    const wantsFree = /\b(free|free entry|no fee|free event)\b/i.test(message);
    
    if (needsDB) {
      console.log('🔍 Query requires database access');
      const messageLower = message.toLowerCase();
      const eventName = dbTools.extractEventName(message);

      if (eventName) {
        const matches = await dbTools.searchEvents(eventName);
        if (matches.length === 1) {
          const match = matches[0];
          const eventId = `${match.id}`;
          const [details, participants, lastDate] = await Promise.all([
            dbTools.getEventDetails(eventId),
            dbTools.getParticipantCount(eventId),
            dbTools.getLastDate(eventId)
          ]);

          if (details) {
            const eventLink = `${FRONTEND_BASE_URL}/events/${eventId}`;
            const eventDate = details.date ? new Date(details.date) : null;
            const lastRegDate = lastDate && lastDate.lastRegistrationDate ? new Date(lastDate.lastRegistrationDate) : null;
            
            liveDataSections.push(`## 🎉 **${details.title}**

### 📋 **Event Details**
📅 **Date:** ${eventDate ? eventDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }) : '**TBA**'}
⏰ **Time:** ${details.time || '**TBA**'}
📍 **Location:** ${details.location || '**TBA**'}
🏷️ **Category:** **${details.category || 'General'}**
📊 **Status:** **${details.status || 'Active'}**
      ${wantsFee ? `
      💵 **Registration Fee:** ${Number.isFinite(details.price) ? (details.price === 0 ? '**FREE**' : `**৳ ${details.price}**`) : '**TBA**'}` : ''}
${wantsPrize ? `
🏆 **Prize Money:** ${Number.isFinite(details.prizeMoney) ? `**৳ ${details.prizeMoney}**` : '**TBA**'}` : ''}

### 👥 **Registration Info**
${participants ? `🎯 **Participants:** **${participants.participantCount ?? 'N/A'}/${participants.maxParticipants ?? 'N/A'}**
💺 **Spots Remaining:** **${Number.isFinite(participants.spotsRemaining) ? participants.spotsRemaining : 'Unknown'}**
${participants.isFull ? '⚠️ **Event is FULL** - No more registrations accepted' : '✅ **Spots Available** - Register now!'}` : 'Registration information not available'}
${lastRegDate ? `📆 **Last Registration:** ${lastRegDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}

### 🚀 **Take Action**
      🔗 **[Click here to view full details and register ➤](${eventLink})**`);
          }
        } else if (matches.length > 1) {
          const list = matches.map((event, index) => {
            const eventId = `${event.id}`;
            const link = `${FRONTEND_BASE_URL}/events/${eventId}`;
            const eventDate = event.date ? new Date(event.date) : null;
            
            return `#### ${index + 1}. **${event.title}** 🎯

📅 **Date:** ${eventDate ? eventDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }) : '**Date TBA**'}
📍 **Location:** ${event.location || '**Location TBA**'}
              ${wantsFee ? `
              💵 **Registration Fee:** ${Number.isFinite(event.price) ? (event.price === 0 ? '**FREE**' : `**৳ ${event.price}**`) : '**TBA**'}` : ''}
${wantsPrize ? `
🏆 **Prize Money:** ${Number.isFinite(event.prizeMoney) ? `**৳ ${event.prizeMoney}**` : '**TBA**'}` : ''}

        🔗 **[Click to view details ➤](${link})**

---`;
          }).join('\n\n');

          liveDataSections.push(`## 🔍 **Multiple Events Found**

Found **${matches.length} events** matching **"${eventName}"**:

${list}`);
        } else {
          liveDataSections.push(`## ❌ **No Events Found**

Sorry, no events were found matching **"${eventName}"** in our database.

💡 **Tip:** Try searching with different keywords or check for upcoming events in various categories.`);
        }
      }

      // If user asked for free events explicitly
      if (wantsFree && !eventName) {
        const upcoming = await dbTools.getUpcomingEvents(20);
        const freeEvents = (upcoming || []).filter(ev => Number.isFinite(ev.price) && ev.price === 0);

        if (freeEvents.length > 0) {
          const list = freeEvents.slice(0, 10).map((event, idx) => {
            const link = `${FRONTEND_BASE_URL}/events/${event.id}`;
            const eventDate = event.date ? new Date(event.date) : null;
            return `
${idx + 1}. **${event.title}**
   📅 ${eventDate ? eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '**TBA**'}
   📍 ${event.location || '**TBA**'}
   💵 **FREE**
   🔗 [View & Register](${link})`;
          }).join('\n\n');

          liveDataSections.push(`## ✅ **Free Upcoming Events**

Here are events with **no registration fee**:

${list}`);
        } else {
          liveDataSections.push(`## ❌ No Free Upcoming Events

We couldn't find any upcoming events with a **FREE** registration right now.

💡 Tip: Check back later or browse all events here: [Upcoming Events](${FRONTEND_BASE_URL}/upcoming-events)`);
        }
      }

      // Check for category queries
      const category = dbTools.extractCategory(message);
      if (category) {
        const categoryEvents = await dbTools.getEventsByCategory(category, 10);
        
        if (categoryEvents.length > 0) {
          const upcomingEvents = categoryEvents.filter(e => e.isUpcoming);
          const pastEvents = categoryEvents.filter(e => !e.isUpcoming);
          
          let categoryResponse = `## 🎯 **${category.toUpperCase()}** Category Events

📊 **Found ${categoryEvents.length} total events** (${upcomingEvents.length} upcoming, ${pastEvents.length} past)

`;
          
          if (upcomingEvents.length > 0) {
            if (upcomingEvents.length === 1) {
              categoryResponse += `### ✨ **FEATURED EVENT** ✨\n\n`;
            } else {
              categoryResponse += '### 🚀 **UPCOMING EVENTS**\n\n';
            }
            
            upcomingEvents.forEach((event, index) => {
              const link = `${FRONTEND_BASE_URL}/events/${event.id}`;
              const eventDate = event.date ? new Date(event.date) : null;
              const regDeadline = event.registrationDeadline ? new Date(event.registrationDeadline) : null;
              
              if (upcomingEvents.length === 1) {
                // Single featured event - clean, left-aligned Markdown
                categoryResponse += `
#### 🎭 **${event.title}** ✨

📅 ${eventDate ? eventDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }) : '**TBA**'}
📍 ${event.location || '**TBA**'}
💵 ${Number.isFinite(event.price) ? (event.price === 0 ? '**FREE ENTRY**' : `**Fee:** ৳ ${event.price}`) : '**Fee: TBA**'}
🏆 ${Number.isFinite(event.prizeMoney) ? `**Prize:** ৳ ${event.prizeMoney}` : '**Prize: TBA**'}
⏰ Registration closes: ${regDeadline ? regDeadline.toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        }) : '**TBA**'}
👥 ${event.participants}/${event.maxParticipants} registered • ${event.maxParticipants - event.participants} spots remaining

🔗 **[Join Event ➤](${link})**

`;
              } else {
                // Multiple events - simple list style, left-aligned
                categoryResponse += `
#### ${index + 1}. 🎭 **${event.title}** ✨

📅 ${eventDate ? eventDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }) : '**TBA**'}
📍 ${event.location || '**TBA**'}
💵 ${Number.isFinite(event.price) ? (event.price === 0 ? '**FREE**' : `**Fee:** ৳ ${event.price}`) : '**Fee: TBA**'}
🏆 ${Number.isFinite(event.prizeMoney) ? `**Prize:** ৳ ${event.prizeMoney}` : '**Prize: TBA**'}
⏰ Deadline: ${regDeadline ? regDeadline.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      }) : '**TBA**'}
👥 ${event.participants}/${event.maxParticipants} registered (${event.maxParticipants - event.participants} spots left)

🔗 **[Register Here ➤](${link})**

`;
              }
            });
          }
          
          if (pastEvents.length > 0) {
            categoryResponse += '\n### 📅 **PAST EVENTS**\n\n';
            pastEvents.slice(0, 3).forEach((event, index) => {
              const link = `${FRONTEND_BASE_URL}/events/${event.id}`;
              const eventDate = event.date ? new Date(event.date) : null;
              
              categoryResponse += `#### ${index + 1}. **${event.title}**

📅 **Date:** ${eventDate ? eventDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }) : '**TBA**'}
📍 **Location:** ${event.location || '**TBA**'}

🔗 **[View event details ➤](${link})**

---

`;
            });
          }
          
          liveDataSections.push(categoryResponse.trim());
        } else {
          liveDataSections.push(`## ❌ No Events Found

Sorry, no events were found in the **"${category}"** category in our database.

💡 **Tip:** Try searching for other categories like:
- **Cultural** - Fashion shows, cultural programs
- **Arts & Creativity** - Drama, film screenings  
- **Career & Professional Development** - Career fairs, workshops
- **Environment** - Clean-up drives, eco events
- **Literary / Speaking** - Debate competitions, literary events
- **Seminar** - Educational workshops, bootcamps`);
        }
      }

      if (messageLower.includes('upcoming')) {
        const [stats, upcoming] = await Promise.all([
          cachedStats ? Promise.resolve(cachedStats) : dbTools.getEventStats(),
          dbTools.getUpcomingEvents(10)
        ]);
        cachedStats = stats;

        if (upcoming.length > 0) {
          const totalUpcoming = stats?.upcomingEvents ?? upcoming.length;
          
          const overview = upcoming.slice(0, 5).map((event, index) => {
            const link = `${FRONTEND_BASE_URL}/events/${event.id}`;
            const eventDate = event.date ? new Date(event.date) : null;
            
            return `
#### ${index + 1}. 🎪 **${event.title}** ✨

📅 **Date:** ${eventDate ? eventDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }) : '**TBA**'}${event.time ? ` at **${event.time}**` : ''}
📍 **Location:** ${event.location || '**TBA**'}
💵 **Fee:** ${Number.isFinite(event.price) ? (event.price === 0 ? '**FREE**' : `**৳ ${event.price}**`) : '**TBA**'}
🏆 **Prize:** ${Number.isFinite(event.prizeMoney) ? `**৳ ${event.prizeMoney}**` : '**TBA**'}
👥 **Participants:** **${event.participants ?? 'N/A'}/${event.maxParticipants ?? 'N/A'}**
💺 **Spots Remaining:** **${Number.isFinite(event.spotsRemaining) ? event.spotsRemaining : 'Unknown'}**

🔗 [**View Details & Register ➤**](${link})`;
          }).join('\n\n');

          liveDataSections.push(`## 🚀 **Upcoming Events Summary**

📊 **Total upcoming events:** **${totalUpcoming}**
👇 **Showing the ${Math.min(5, upcoming.length)} soonest events:**

${overview}`);
        } else {
          liveDataSections.push(`## 📅 **No Upcoming Events**

Currently, there are no upcoming events scheduled in our database.

💡 **Stay tuned!** New events are added regularly. Check back soon for exciting opportunities!`);
        }
      }

      if (messageLower.includes('stat')) {
        if (!cachedStats) {
          cachedStats = await dbTools.getEventStats();
        }
        if (cachedStats) {
          liveDataSections.push(`## 📊 **Platform Statistics**

### 🎯 **Event Overview**
🎪 **Total Events:** **${cachedStats.totalEvents}**
🚀 **Upcoming Events:** **${cachedStats.upcomingEvents}**  
📅 **Past Events:** **${cachedStats.pastEvents}**

### 👥 **Community Engagement**
📝 **Total Registrations:** **${cachedStats.totalRegistrations}**

---

💡 **Ready to join an event?** Ask me about upcoming events or specific categories!`);
        }
      }
    }

    const liveData = liveDataSections.join('\n\n');

    // If we already built a live, formatted answer from the database,
    // return it directly to preserve exact Markdown, emojis, and hyperlinks.
    if (liveDataSections.length > 0) {
      return res.json({
        success: true,
        response: liveData,
        model: 'live-db',
        timestamp: new Date().toISOString()
      });
    }

    // Step 2: Try ChromaDB first, fallback to regular embeddings
    let context = '';
    const chromaStats = await chromaManager.getStats();
    
    if (chromaStats.available && chromaStats.count > 0) {
      console.log('📊 Using ChromaDB for context retrieval');
      const results = await chromaManager.querySimilar(message, 5);
      
      if (results.length > 0) {
        context = results
          .map((result, index) => 
            `[Source ${index + 1}: ${result.metadata.title || 'Document'} (Relevance: ${(result.similarity * 100).toFixed(1)}%)]\n${result.content.substring(0, 1000)}...`
          )
          .join('\n\n---\n\n');
      }
    }
    
    // Fallback to regular embedding service
    if (!context) {
      console.log('📚 Using fallback embedding service');
      try {
        context = await embeddingService.getContextForPrompt(message);
      } catch (error) {
        console.error('Error getting context from embeddings:', error.message);
      }
    }

    if (!context) {
      console.log('⚠️  Trying simple keyword search...');
      context = await getSimpleContext(message);
    }

    if (!context) {
      context = 'I have access to information about CampusCrew, but I\'m having trouble retrieving it right now.';
    }

    // Step 3: Build conversation history text
    const recentHistory = conversationHistory.slice(-5);
    let conversationText = '';
    
    for (const msg of recentHistory) {
      conversationText += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
    }

    // Step 4: Build the full prompt for Gemini
    const fullPrompt = `You are a helpful assistant for CampusCrew, an event management platform. 
Your role is to answer questions about the website, its features, and help users navigate the platform.

Use the following information from the website's knowledge base to answer questions:

${context}

${liveData ? `IMPORTANT - Here is LIVE, REAL-TIME data from the database. Use this for the most accurate, up-to-date information:${liveData}` : ''}

If the information needed to answer the question is not in the provided context, politely inform the user and suggest they contact support or explore the website. Keep responses friendly, concise, and helpful.

${conversationText ? `Previous conversation:\n${conversationText}\n` : ''}
User: ${message}
Assistant:`;

    // Step 5: Call Gemini API
    let botResponse;
    let usedModel = CHAT_MODEL;
    const modelParams = { model: CHAT_MODEL };
    const requestOptions = { apiVersion: API_VERSION };

    try {
      const model = genAI.getGenerativeModel(modelParams, requestOptions);
      const generationConfig = { temperature: 0.7 };
      if (HAS_MAX_TOKENS) {
        generationConfig.maxOutputTokens = MAX_OUTPUT_TOKENS;
      }
      const requestPayload = {
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig,
      };
      const result = await model.generateContent(requestPayload);
      botResponse = result.response.text();
    } catch (modelError) {
      console.error(`Primary model (${CHAT_MODEL}) failed:`, modelError.message);

      if (!CHAT_MODEL.includes('gemini-pro')) {
        try {
          const fallbackModel = genAI.getGenerativeModel({ model: FALLBACK_CHAT_MODEL }, requestOptions);
          const generationConfig = { temperature: 0.7 };
          if (HAS_MAX_TOKENS) {
            generationConfig.maxOutputTokens = MAX_OUTPUT_TOKENS;
          }
          const fallbackResult = await fallbackModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
            generationConfig,
          });
          botResponse = fallbackResult.response.text();
          usedModel = FALLBACK_CHAT_MODEL;
        } catch (fallbackError) {
          console.error(`Fallback model (${FALLBACK_CHAT_MODEL}) also failed:`, fallbackError.message);
          throw fallbackError;
        }
      } else {
        throw modelError;
      }
    }

    // Return response
    res.json({
      success: true,
      response: botResponse,
      model: usedModel,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat error:', error);
    
    // Handle specific Gemini errors
    if (error.message?.includes('API key')) {
      return res.status(500).json({
        success: false,
        error: 'Invalid Gemini API key'
      });
    }
    
    if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded. Please try again later.'
      });
    }

    res.status(500).json({
      success: false,
      error: 'An error occurred while processing your message'
    });
  }
});

/**
 * GET /chat/health
 * Check if chat service is ready
 */
router.get('/chat/health', async (req, res) => {
  try {
    const hasApiKey = !!process.env.GEMINI_API_KEY;
    const isInitialized = embeddingService.initialized;
    
    res.json({
      success: true,
      status: hasApiKey && isInitialized ? 'ready' : 'not_ready',
      hasApiKey,
      isInitialized,
      embeddingsCount: embeddingService.embeddings.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /chat/reload-knowledge
 * Reload knowledge base (useful after updating content)
 */
router.post('/chat/reload-knowledge', async (req, res) => {
  try {
    embeddingService.embeddings = [];
    embeddingService.initialized = false;
    await embeddingService.loadKnowledgeBase();
    
    // Also reload ChromaDB if available
    const contentDir = path.join(__dirname, '../data/website_content');
    let chromaCount = 0;
    
    try {
      if (!chromaManager.initialized) {
        await chromaManager.initialize();
      }
      chromaCount = await chromaManager.loadDocuments(contentDir);
    } catch (error) {
      console.log('ChromaDB reload skipped:', error.message);
    }
    
    res.json({
      success: true,
      message: 'Knowledge base reloaded',
      documentsLoaded: embeddingService.embeddings.length,
      chromaDocuments: chromaCount
    });
  } catch (error) {
    console.error('Error reloading knowledge base:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reload knowledge base'
    });
  }
});

/**
 * POST /chat/crawl
 * Crawl website and update knowledge base
 * Uses Firecrawl if configured, falls back to basic crawler
 */
router.post('/chat/crawl', async (req, res) => {
  try {
    const frontendUrl = req.body.url || process.env.FRONTEND_URL || 'http://localhost:3000';
    const outputDir = path.join(__dirname, '../data/website_content');
    
    console.log(`Starting crawl of ${frontendUrl}...`);
    
    let pageCount = 0;
    let crawlMethod = 'basic';
    
    // Try Firecrawl first if configured
    if (firecrawlService.isConfigured()) {
      try {
        console.log('Using Firecrawl for advanced scraping...');
        firecrawlService.baseUrl = frontendUrl;
        const result = await firecrawlService.crawlAndSave();
        
        if (result.success) {
          pageCount = result.successful;
          crawlMethod = 'firecrawl';
          console.log(`✅ Firecrawl: Successfully crawled ${pageCount} pages`);
        } else {
          console.log('⚠️ Firecrawl failed, falling back to basic crawler...');
          throw new Error('Firecrawl failed');
        }
      } catch (error) {
        console.log('Firecrawl error:', error.message);
        console.log('Falling back to basic crawler...');
        
        // Fallback to basic crawler
        const crawler = new WebsiteCrawler(frontendUrl);
        pageCount = await crawler.crawl(outputDir);
        crawlMethod = 'basic';
      }
    } else {
      // Use basic crawler if Firecrawl not configured
      console.log('Using basic crawler (Firecrawl not configured)...');
      const crawler = new WebsiteCrawler(frontendUrl);
      pageCount = await crawler.crawl(outputDir);
    }
    
    // Reload knowledge base after crawling
    embeddingService.embeddings = [];
    embeddingService.initialized = false;
    await embeddingService.loadKnowledgeBase();
    
    // Load into ChromaDB if available
    let chromaLoaded = false;
    try {
      if (!chromaManager.initialized) {
        await chromaManager.initialize();
      }
      await chromaManager.loadDocuments(outputDir);
      chromaLoaded = true;
    } catch (error) {
      console.log('ChromaDB indexing skipped:', error.message);
    }
    
    res.json({
      success: true,
      message: 'Website crawled and indexed',
      crawlMethod: crawlMethod,
      pagesCrawled: pageCount,
      documentsIndexed: embeddingService.embeddings.length,
      chromaEnabled: chromaLoaded
    });
  } catch (error) {
    console.error('Error crawling website:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to crawl website',
      details: error.message
    });
  }
});

/**
 * POST /chat/index
 * Index existing documents in ChromaDB
 */
router.post('/chat/index', async (req, res) => {
  try {
    const contentDir = path.join(__dirname, '../data/website_content');
    
    // Initialize ChromaDB if needed
    if (!chromaManager.initialized) {
      const initialized = await chromaManager.initialize();
      if (!initialized) {
        return res.status(500).json({
          success: false,
          error: 'ChromaDB not available. Make sure it is running.'
        });
      }
    }
    
    // Load documents
    const count = await chromaManager.loadDocuments(contentDir);
    const stats = await chromaManager.getStats();
    
    res.json({
      success: true,
      message: 'Documents indexed in ChromaDB',
      documentsIndexed: count,
      totalInCollection: stats.count
    });
  } catch (error) {
    console.error('Error indexing documents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to index documents',
      details: error.message
    });
  }
});

/**
 * GET /chat/stats
 * Get chatbot statistics
 */
router.get('/chat/stats', async (req, res) => {
  try {
    const chromaStats = await chromaManager.getStats();
    const dbStats = await dbTools.getEventStats();
    
    res.json({
      success: true,
      knowledge: {
        embeddingsLoaded: embeddingService.embeddings.length,
        chromaDB: chromaStats
      },
      database: dbStats,
      crawlers: {
        firecrawl: firecrawlService.isConfigured(),
        basicCrawler: true
      },
      apiKey: !!process.env.GEMINI_API_KEY
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /chat/test-firecrawl
 * Test Firecrawl connection and configuration
 */
router.post('/chat/test-firecrawl', async (req, res) => {
  try {
    if (!firecrawlService.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'Firecrawl is not configured. Please set FIRECRAWL_API_KEY in your .env file.',
        instructions: 'Get your API key from: https://www.firecrawl.dev/'
      });
    }

    const testResult = await firecrawlService.testConnection();
    
    if (testResult) {
      res.json({
        success: true,
        message: 'Firecrawl is working correctly!',
        configured: true
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Firecrawl test failed. Check your API key and frontend URL.',
        configured: true
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      configured: firecrawlService.isConfigured()
    });
  }
});

module.exports = router;
