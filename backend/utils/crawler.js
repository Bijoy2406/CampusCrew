/**
 * Website Crawler
 * Crawls website pages and extracts text content for knowledge base
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

class WebsiteCrawler {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.visitedUrls = new Set();
    this.pages = [];
  }

  /**
   * Extract clean text from HTML
   */
  extractText(html) {
    const $ = cheerio.load(html);
    
    // Remove script, style, and other non-content elements
    $('script, style, nav, footer, iframe, noscript').remove();
    
    // Get text from main content areas
    let text = '';
    
    // Try to get main content first
    const mainContent = $('main, article, .content, #content').text();
    if (mainContent) {
      text = mainContent;
    } else {
      text = $('body').text();
    }
    
    // Clean up whitespace
    text = text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();
    
    return text;
  }

  /**
   * Crawl a single page
   */
  async crawlPage(url, title = '') {
    try {
      // Skip if already visited
      if (this.visitedUrls.has(url)) {
        return null;
      }
      
      this.visitedUrls.add(url);
      console.log(`Crawling: ${url}`);
      
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'CampusCrew-Crawler/1.0'
        }
      });
      
      const html = response.data;
      const $ = cheerio.load(html);
      
      // Get page title if not provided
      if (!title) {
        title = $('title').text() || $('h1').first().text() || 'Untitled';
      }
      
      // Extract text content
      const text = this.extractText(html);
      
      console.log(`  📄 Title: ${title}`);
      console.log(`  📏 Content length: ${text ? text.length : 0} characters`);
      console.log(`  📝 Preview: ${text ? text.substring(0, 150) : 'No content'}...`);
      
      if (text && text.length > 100) {
        console.log(`  ✅ Page saved successfully\n`);
        return {
          url,
          title: title.trim(),
          content: text,
          timestamp: new Date().toISOString()
        };
      }
      
      console.log(`  ⚠️ Page skipped (content too short or empty)\n`);
      return null;
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
      if (error.code) console.error(`  🔍 Error code: ${error.code}`);
      console.log();
      return null;
    }
  }

  /**
   * Crawl predefined frontend routes
   */
  async crawlFrontendRoutes() {
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
    
    const pages = [];
    
    for (const route of routes) {
      const url = `${this.baseUrl}${route.path}`;
      const page = await this.crawlPage(url, route.title);
      
      if (page) {
        pages.push(page);
      }
      
      // Be nice to the server
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return pages;
  }

  /**
   * Save crawled pages to text files
   */
  async saveToFiles(pages, outputDir) {
    try {
      // Ensure output directory exists
      await fs.mkdir(outputDir, { recursive: true });
      
      for (const page of pages) {
        // Create safe filename
        const filename = page.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '')
          + '.txt';
        
        const filepath = path.join(outputDir, filename);
        
        // Create content with metadata
        const content = `Title: ${page.title}
URL: ${page.url}
Crawled: ${page.timestamp}

${page.content}`;
        
        await fs.writeFile(filepath, content, 'utf-8');
        console.log(`Saved: ${filename}`);
      }
      
      console.log(`\nSaved ${pages.length} pages to ${outputDir}`);
      return pages.length;
    } catch (error) {
      console.error('Error saving files:', error);
      throw error;
    }
  }

  /**
   * Main crawl function
   */
  async crawl(outputDir) {
    console.log('Starting website crawl...\n');
    
    try {
      // Crawl frontend routes
      const pages = await this.crawlFrontendRoutes();
      
      if (pages.length === 0) {
        console.log('No pages were crawled. Make sure the frontend is running.');
        return 0;
      }
      
      // Save to files
      const count = await this.saveToFiles(pages, outputDir);
      
      console.log('\n✅ Crawling complete!');
      return count;
    } catch (error) {
      console.error('Crawl error:', error);
      throw error;
    }
  }
}

// Export for use in other modules
module.exports = WebsiteCrawler;

// CLI usage
if (require.main === module) {
  const outputDir = path.join(__dirname, '../data/website_content');
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  const crawler = new WebsiteCrawler(frontendUrl);
  
  crawler.crawl(outputDir)
    .then(count => {
      console.log(`\n✨ Successfully crawled ${count} pages!`);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Crawl failed:', error.message);
      process.exit(1);
    });
}
