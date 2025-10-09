/**
 * Puppeteer Crawler
 * Uses Puppeteer to crawl React SPA with JavaScript rendering
 * Works with localhost!
 */

// Load environment variables
require('dotenv').config();

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class PuppeteerCrawler {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.visitedUrls = new Set();
    this.pages = [];
    this.browser = null;
  }

  /**
   * Initialize browser
   */
  async initialize() {
    console.log('🚀 Launching browser...');
    this.browser = await puppeteer.launch({
      headless: 'new', // Use new headless mode
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('✅ Browser launched');
  }

  /**
   * Close browser
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔒 Browser closed');
    }
  }

  /**
   * Extract text content from page
   */
  extractCleanText(html) {
    // Remove script and style tags
    let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    
    // Remove HTML tags
    text = text.replace(/<[^>]+>/g, ' ');
    
    // Decode HTML entities
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    
    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
  }

  /**
   * Crawl a single page with Puppeteer
   */
  async crawlPage(url, title = '') {
    try {
      if (this.visitedUrls.has(url)) {
        return null;
      }
      
      this.visitedUrls.add(url);
      console.log(`\n📄 Crawling: ${url}`);

      const page = await this.browser.newPage();
      
      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Navigate to page
      await page.goto(url, {
        waitUntil: 'networkidle2', // Wait for network to be idle
        timeout: 30000
      });

      // Wait a bit for React to render
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get page title
      if (!title) {
        title = await page.title();
      }

      // Get rendered HTML
      const html = await page.content();
      
      // Extract text from body
      const bodyText = await page.evaluate(() => {
        // Remove navigation, footer, scripts, etc.
        const clones = document.body.cloneNode(true);
        const nav = clones.querySelectorAll('nav, header, footer, script, style, .navbar, .header, .footer');
        nav.forEach(el => el.remove());
        
        return clones.innerText || clones.textContent;
      });

      // Get meta description
      const description = await page.evaluate(() => {
        const meta = document.querySelector('meta[name="description"]');
        return meta ? meta.getAttribute('content') : '';
      });

      await page.close();

      const contentLength = bodyText ? bodyText.length : 0;
      console.log(`   📏 Content length: ${contentLength} characters`);
      console.log(`   📝 Title: ${title}`);
      console.log(`   📖 Preview: ${bodyText ? bodyText.substring(0, 150) : 'No content'}...`);

      if (bodyText && contentLength > 50) {
        console.log(`   ✅ Page saved successfully`);
        return {
          url,
          title: title.trim(),
          content: bodyText.trim(),
          description: description,
          html: html,
          timestamp: new Date().toISOString()
        };
      } else {
        console.log(`   ⚠️ Page skipped (content too short)`);
        return null;
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      return null;
    }
  }

  /**
   * Crawl all frontend routes
   */
  async crawlFrontend() {
    const routes = [
      { path: '/', title: 'Home' },
      { path: '/about', title: 'About Us' },
      { path: '/contact', title: 'Contact' },
      { path: '/upcoming-events', title: 'Upcoming Events' },
      { path: '/login', title: 'Login' },
      { path: '/signup', title: 'Sign Up' },
      { path: '/profile', title: 'Profile' },
      { path: '/create-event', title: 'Create Event' },
      { path: '/joined-events', title: 'My Events' },
      { path: '/dashboard', title: 'Dashboard' }
    ];

    console.log(`\n🔍 Starting crawl of ${routes.length} pages...`);
    console.log(`🌐 Base URL: ${this.baseUrl}\n`);

    const successfulPages = [];

    for (const route of routes) {
      const url = `${this.baseUrl}${route.path}`;
      const result = await this.crawlPage(url, route.title);
      
      if (result) {
        successfulPages.push(result);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return successfulPages;
  }

  /**
   * Save pages to files
   */
  async saveToFiles(pages, outputDir = './data/website_content') {
    try {
      const fullPath = path.resolve(__dirname, '..', outputDir);
      await fs.mkdir(fullPath, { recursive: true });

      console.log(`\n💾 Saving to: ${fullPath}\n`);

      for (const page of pages) {
        const filename = page.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '') + '.txt';
        
        const filepath = path.join(fullPath, filename);
        
        const content = `Page: ${page.title}
URL: ${page.url}
Crawled: ${page.timestamp}

${page.content}

---
Description: ${page.description || 'No description'}
`;

        await fs.writeFile(filepath, content, 'utf-8');
        console.log(`   ✅ Saved: ${filename} (${page.content.length} chars)`);
      }

      // Create index file
      const indexContent = `Crawl Index
Generated: ${new Date().toISOString()}
Total Pages: ${pages.length}
Method: Puppeteer (JavaScript-enabled)

${pages.map(p => `- ${p.title}: ${p.url} (${p.content.length} chars)`).join('\n')}
`;

      await fs.writeFile(
        path.join(fullPath, '_index.txt'),
        indexContent,
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
   * Full crawl operation
   */
  async crawlAndSave() {
    try {
      await this.initialize();
      const pages = await this.crawlFrontend();
      
      if (pages.length > 0) {
        await this.saveToFiles(pages);
        console.log(`\n📊 Crawl Summary:`);
        console.log(`   ✅ Successfully crawled: ${pages.length} pages`);
        console.log(`   📁 Files saved to: backend/data/website_content/\n`);
      } else {
        console.log(`\n⚠️ No pages were successfully crawled.`);
        console.log(`Make sure your frontend is running on ${this.baseUrl}\n`);
      }
      
      await this.close();
      return pages.length > 0;
    } catch (error) {
      console.error('\n❌ Crawl failed:', error.message);
      await this.close();
      return false;
    }
  }
}

// CLI usage
if (require.main === module) {
  (async () => {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const crawler = new PuppeteerCrawler(baseUrl);
    
    console.log('╔════════════════════════════════════════╗');
    console.log('║   Puppeteer Web Crawler for React     ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    const success = await crawler.crawlAndSave();
    process.exit(success ? 0 : 1);
  })();
}

module.exports = PuppeteerCrawler;
