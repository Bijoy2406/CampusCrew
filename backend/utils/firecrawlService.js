/**
 * Firecrawl Service
 * Advanced web crawler using Firecrawl API that handles JavaScript-rendered content
 */

// Load environment variables
require('dotenv').config();

const FirecrawlApp = require('@mendable/firecrawl-js').default;
const fs = require('fs').promises;
const path = require('path');

class FirecrawlService {
  constructor() {
    this.apiKey = process.env.FIRECRAWL_API_KEY;
    this.app = null;
    this.baseUrl = 'http://localhost:3000';
  }

  /**
   * Initialize Firecrawl client
   */
  initialize() {
    if (!this.apiKey) {
      throw new Error('FIRECRAWL_API_KEY is not set in environment variables');
    }
    this.app = new FirecrawlApp({ apiKey: this.apiKey });
    console.log('✅ Firecrawl service initialized');
  }

  /**
   * Check if Firecrawl is configured
   */
  isConfigured() {
    return !!this.apiKey;
  }

  /**
   * Scrape a single page with Firecrawl
   */
  async scrapePage(url) {
    try {
      console.log(`🔥 Firecrawl scraping: ${url}`);
      
      // Firecrawl v4.x uses scrape() method, not scrapeUrl()
      const scrapeResult = await this.app.scrape(url, {
        formats: ['markdown', 'html'],
        onlyMainContent: true,
        waitFor: 2000 // Wait for JavaScript to render
      });

      if (scrapeResult && scrapeResult.data) {
        const data = scrapeResult.data;
        console.log(`  ✅ Success - ${data.markdown?.length || 0} chars`);
        return {
          success: true,
          url: url,
          title: data.metadata?.title || 'Untitled',
          content: data.markdown || data.content || '',
          html: data.html || '',
          metadata: data.metadata || {}
        };
      } else {
        console.log(`  ❌ Failed to scrape ${url}`);
        return { success: false, url, error: 'Scrape failed' };
      }
    } catch (error) {
      console.error(`  ❌ Error scraping ${url}:`, error.message);
      return { success: false, url, error: error.message };
    }
  }

  /**
   * Crawl multiple pages from the frontend
   */
  async crawlFrontend() {
    if (!this.app) {
      this.initialize();
    }

    console.log('\n🔥 Starting Firecrawl crawling...\n');

    const routes = [
      { path: '/', title: 'Home' },
      { path: '/about', title: 'About Us' },
      { path: '/contact', title: 'Contact' },
      { path: '/upcoming-events', title: 'Upcoming Events' },
      { path: '/login', title: 'Login' },
      { path: '/profile', title: 'Profile' },
      { path: '/create-event', title: 'Create Event' },
      { path: '/joined-events', title: 'My Events' },
      { path: '/dashboard', title: 'Dashboard' }
    ];

    const results = [];
    const successfulPages = [];

    for (const route of routes) {
      const url = `${this.baseUrl}${route.path}`;
      const result = await this.scrapePage(url);
      
      if (result.success && result.content && result.content.length > 50) {
        successfulPages.push({
          url: result.url,
          title: result.title || route.title,
          content: result.content,
          metadata: result.metadata,
          timestamp: new Date().toISOString()
        });
      }
      
      results.push(result);
      
      // Rate limiting - wait 1 second between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return {
      total: routes.length,
      successful: successfulPages.length,
      failed: routes.length - successfulPages.length,
      pages: successfulPages,
      details: results
    };
  }

  /**
   * Save crawled pages to files
   */
  async saveToFiles(pages, outputDir = './data/website_content') {
    try {
      const fullPath = path.resolve(__dirname, '..', outputDir);
      await fs.mkdir(fullPath, { recursive: true });

      console.log(`\n📁 Saving to: ${fullPath}`);

      for (const page of pages) {
        const filename = page.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '') + '.txt';
        
        const filepath = path.join(fullPath, filename);
        
        const content = `Page: ${page.title}
URL: ${page.url}
Scraped: ${page.timestamp}

${page.content}

---
Metadata:
${JSON.stringify(page.metadata, null, 2)}
`;

        await fs.writeFile(filepath, content, 'utf-8');
        console.log(`  ✅ Saved: ${filename}`);
      }

      // Create index file
      const indexContent = pages.map(p => 
        `- ${p.title}: ${p.url} (${p.content.length} chars)`
      ).join('\n');

      await fs.writeFile(
        path.join(fullPath, '_index.txt'),
        `Firecrawl Crawl Index
Generated: ${new Date().toISOString()}
Total Pages: ${pages.length}

${indexContent}
`,
        'utf-8'
      );

      console.log(`\n✨ Successfully saved ${pages.length} pages!`);
      return true;
    } catch (error) {
      console.error('❌ Error saving files:', error.message);
      return false;
    }
  }

  /**
   * Full crawl and save operation
   */
  async crawlAndSave() {
    try {
      const result = await this.crawlFrontend();
      
      console.log('\n📊 Crawl Summary:');
      console.log(`   Total URLs: ${result.total}`);
      console.log(`   Successful: ${result.successful}`);
      console.log(`   Failed: ${result.failed}`);

      if (result.successful > 0) {
        await this.saveToFiles(result.pages);
        return {
          success: true,
          ...result
        };
      } else {
        console.log('\n⚠️ No pages were successfully crawled.');
        console.log('Make sure:');
        console.log('1. Your frontend is running on http://localhost:3000');
        console.log('2. Your Firecrawl API key is valid');
        console.log('3. You have sufficient Firecrawl credits');
        return {
          success: false,
          ...result
        };
      }
    } catch (error) {
      console.error('\n❌ Crawl failed:', error.message);
      throw error;
    }
  }

  /**
   * Test Firecrawl connection
   */
  async testConnection() {
    try {
      if (!this.app) {
        this.initialize();
      }

      console.log('🧪 Testing Firecrawl connection...');
      const testUrl = `${this.baseUrl}/`;
      const result = await this.scrapePage(testUrl);
      
      if (result.success) {
        console.log('✅ Firecrawl is working correctly!');
        console.log(`   Scraped ${result.content?.length || 0} characters from homepage`);
        return true;
      } else {
        console.log('❌ Firecrawl test failed');
        return false;
      }
    } catch (error) {
      console.error('❌ Connection test error:', error.message);
      return false;
    }
  }
}

// Export singleton instance
const firecrawlService = new FirecrawlService();
module.exports = firecrawlService;

// CLI usage
if (require.main === module) {
  (async () => {
    try {
      await firecrawlService.crawlAndSave();
    } catch (error) {
      console.error('Fatal error:', error.message);
      process.exit(1);
    }
  })();
}
