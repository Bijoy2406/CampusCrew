/**
 * ChromaDB Embeddings Manager
 * Manages embeddings storage and retrieval using ChromaDB
 */

const { ChromaClient } = require('chromadb');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;
const path = require('path');

class ChromaEmbeddingsManager {
  constructor() {
    this.client = null;
    this.collection = null;
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.initialized = false;
  }

  /**
   * Initialize ChromaDB client and collection
   */
  async initialize() {
    try {
      // Initialize ChromaDB client
      this.client = new ChromaClient({
        path: process.env.CHROMA_URL || 'http://localhost:8000'
      });
      
      // Get or create collection
      try {
        this.collection = await this.client.getCollection({
          name: 'campuscrew_knowledge'
        });
        console.log('✅ Connected to existing ChromaDB collection');
      } catch {
        this.collection = await this.client.createCollection({
          name: 'campuscrew_knowledge',
          metadata: { description: 'CampusCrew website knowledge base' }
        });
        console.log('✅ Created new ChromaDB collection');
      }
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.warn('⚠️  ChromaDB not available, using fallback mode:', error.message);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Generate embedding using Gemini
   */
  async generateEmbedding(text) {
    try {
      const model = this.genAI.getGenerativeModel({ model: "embedding-001" });
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Load and index documents from directory
   */
  async loadDocuments(contentDir) {
    try {
      console.log(`\n📚 Loading documents from ${contentDir}...`);
      
      // Read all text files
      const files = await fs.readdir(contentDir);
      const txtFiles = files.filter(file => file.endsWith('.txt'));
      
      if (txtFiles.length === 0) {
        console.log('No documents found. Run crawler first.');
        return 0;
      }
      
      const documents = [];
      const embeddings = [];
      const metadatas = [];
      const ids = [];
      
      for (let i = 0; i < txtFiles.length; i++) {
        const filename = txtFiles[i];
        const filepath = path.join(contentDir, filename);
        const content = await fs.readFile(filepath, 'utf-8');
        
        // Extract title from first line
        const lines = content.split('\n');
        const titleLine = lines.find(line => line.startsWith('Title:'));
        const title = titleLine ? titleLine.replace('Title:', '').trim() : filename;
        
        console.log(`Processing: ${title}`);
        
        // Generate embedding
        const embedding = await this.generateEmbedding(content);
        
        documents.push(content);
        embeddings.push(embedding);
        metadatas.push({
          filename,
          title,
          source: 'website'
        });
        ids.push(`doc_${i}`);
      }
      
      // Add to ChromaDB if available
      if (this.initialized && this.collection) {
        await this.collection.add({
          ids,
          documents,
          embeddings,
          metadatas
        });
        console.log(`\n✅ Indexed ${documents.length} documents in ChromaDB`);
      } else {
        console.log(`\n✅ Loaded ${documents.length} documents (ChromaDB not available)`);
      }
      
      return documents.length;
    } catch (error) {
      console.error('Error loading documents:', error);
      throw error;
    }
  }

  /**
   * Query similar documents
   */
  async querySimilar(query, topK = 5) {
    try {
      if (!this.initialized || !this.collection) {
        console.warn('ChromaDB not available for querying');
        return [];
      }
      
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Query ChromaDB
      const results = await this.collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: topK
      });
      
      if (!results.documents || results.documents.length === 0) {
        return [];
      }
      
      // Format results
      const documents = results.documents[0] || [];
      const metadatas = results.metadatas[0] || [];
      const distances = results.distances[0] || [];
      
      return documents.map((doc, i) => ({
        content: doc,
        metadata: metadatas[i] || {},
        similarity: 1 - (distances[i] || 0) // Convert distance to similarity
      }));
    } catch (error) {
      console.error('Error querying ChromaDB:', error);
      return [];
    }
  }

  /**
   * Get collection stats
   */
  async getStats() {
    try {
      if (!this.initialized || !this.collection) {
        return { count: 0, available: false };
      }
      
      const count = await this.collection.count();
      return {
        count,
        available: true,
        name: 'campuscrew_knowledge'
      };
    } catch (error) {
      return { count: 0, available: false, error: error.message };
    }
  }

  /**
   * Clear collection (use with caution!)
   */
  async clearCollection() {
    try {
      if (this.initialized && this.collection) {
        await this.client.deleteCollection({ name: 'campuscrew_knowledge' });
        console.log('Collection cleared');
      }
    } catch (error) {
      console.error('Error clearing collection:', error);
    }
  }
}

// Singleton instance
const chromaManager = new ChromaEmbeddingsManager();

module.exports = chromaManager;
