// Event Registry API Configuration (provides full article content)
const API_KEY = '29bd8cb1-d842-4339-b606-9fe0621253e4';
const API_BASE_URL = 'https://eventregistry.org/api/v1';

// State
let allArticles = [];
let currentView = 'all'; // 'all' or 'queue'
let latestBatchId = null;
let isOnline = navigator.onLine;

// DOM Elements
const grid = document.querySelector('.grid');
const searchInput = document.querySelector('.search-box input');
const tabs = document.querySelectorAll('.tab');
const syncButton = document.querySelector('.btn');
const statusDot = document.querySelector('.status-dot');
const statusText = document.querySelector('.status');

// Random gradient colors for cards
const gradients = [
    '#6366f1', '#8b5cf6', '#06b6d4', '#f97316', '#10b981',
    '#ef4444', '#ec4899', '#f59e0b', '#14b8a6', '#3b82f6'
];

// Utility function to get random color
function getRandomColor() {
    return gradients[Math.floor(Math.random() * gradients.length)];
}

// Utility function to extract first word(s) from title
function getCardTopText(title) {
    const words = title.split(' ');
    let text = words[0];
    if (text.length < 8 && words[1]) {
        text += ' ' + words[1];
    }
    return text.length > 15 ? text.substring(0, 15) : text;
}

// Utility function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 24) {
        return diffHours < 1 ? 'Just now' : `${diffHours}h ago`;
    } else if (diffDays < 7) {
        return `${diffDays}d ago`;
    } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
}

// Check if article is from latest batch (Fresh vs Stale)
function isFreshArticle(article) {
    return article.batchId === latestBatchId;
}

// Create article card HTML
async function createArticleCard(article) {
    const snippet = article.description || 'No description available...';
    const truncatedSnippet = snippet.length > 100 ? snippet.substring(0, 100) + '...' : snippet;
    const source = article.source.name || 'Unknown';
    const freshBadge = isFreshArticle(article);
    const timeAgo = formatDate(article.publishedAt);
    const inQueue = await isInQueue(article.url);

    const queueButtonText = inQueue ? '✓ In Queue' : '+ Queue';
    const queueButtonClass = inQueue ? 'btn-in-queue' : 'btn-add-queue';

    // Determine card top style - image or colored background
    let cardTopStyle = '';
    let cardTopContent = '';

    // Get fallback (colored background with keyword)
    const cardTopText = getCardTopText(article.title);
    const color = getRandomColor();

    if (article.cachedImage) {
        // Cached base64 - always works instantly
        cardTopStyle = `background-image: url('${article.cachedImage}'); background-size: cover; background-position: center;`;
        cardTopContent = '';
    } else if (article.image) {
        // Try loading URL image - colored fallback visible behind if it fails
        cardTopStyle = `background: ${color}; color: white; font-size: 32px; font-weight: 700;`;
        cardTopContent = `<img src="${article.image}" style="width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;z-index:1;" onerror="this.style.display='none'" /><span style="position:relative;z-index:0;">${cardTopText}</span>`;
    } else {
        // No image at all - colored background with keyword
        cardTopStyle = `background: ${color}; color: white; font-size: 32px; font-weight: 700;`;
        cardTopContent = cardTopText;
    }

    return `
    <div class="card" data-url="${article.url}">
      <div class="card-top" style="${cardTopStyle}" onclick="openArticleDetail(this)">${cardTopContent}</div>
      <div class="card-bottom">
        <div class="card-title" onclick="openArticleDetail(this)">${article.title}</div>
        <div class="card-snippet">${truncatedSnippet}</div>
        <div class="meta-row">
          <span>${source} • ${timeAgo}</span>
          <div class="card-actions">
            <span class="${freshBadge ? 'badge-fresh' : 'badge-stale'}">
              ${freshBadge ? 'Fresh' : 'Stale'}
            </span>
            <button class="${queueButtonClass}" onclick="toggleQueue(this, event)">
              ${queueButtonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Open article detail modal
async function openArticleDetail(element) {
    const card = element.closest('.card');
    const url = card.dataset.url;

    // Find article in current view
    let article;
    if (currentView === 'all') {
        const articles = await getAllArticles();
        article = articles.find(a => a.url === url);
    } else if (currentView === 'queue') {
        const queueArticles = await getReadingQueue();
        article = queueArticles.find(a => a.url === url);
    }

    if (!article) {
        console.error('Article not found:', url);
        return;
    }

    // Show article detail modal
    showArticleModal(article);
}

// Show article detail in modal
async function showArticleModal(article) {
    const modal = document.getElementById('articleModal');
    const modalImage = document.getElementById('modalImage');
    const modalTitle = document.getElementById('modalTitle');
    const modalMeta = document.getElementById('modalMeta');
    const modalContent = document.getElementById('modalContent');
    const readFullButton = document.getElementById('readFullButton');

    // Set image - try cached first, then URL, hide if neither
    if (article.cachedImage) {
        modalImage.src = article.cachedImage;
        modalImage.style.display = 'block';
    } else if (article.image) {
        // Try the original URL (might work online)
        modalImage.src = article.image;
        modalImage.style.display = 'block';
        // onerror handler in HTML will hide if it fails
    } else {
        // No image at all
        modalImage.style.display = 'none';
    }

    // Set title
    modalTitle.textContent = article.title;

    // Set metadata
    const source = article.source.name || 'Unknown';
    const timeAgo = formatDate(article.publishedAt);
    modalMeta.textContent = `${source} • ${timeAgo}`;

    // Reset button display
    readFullButton.style.display = 'block';
    readFullButton.onclick = () => window.open(article.url, '_blank');

    // Check if full article has actual content (not just empty HTML)
    const hasFullContent = article.fullContent && article.fullContent.replace(/<[^>]*>/g, '').trim().length > 50;

    if (hasFullContent) {
        // Display full article from IndexedDB - INSTANT!
        modalContent.innerHTML = `
            <div style="line-height: 1.8; font-size: 16px;">
                ${article.fullContent}
            </div>
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border-color);">
                <p style="color: var(--success-color); font-size: 14px;">
                    ✓ Full article available offline
                </p>
            </div>
        `;
    } else {
        // No full content or empty - show preview/description
        const previewText = article.content || article.description || 'No preview available.';
        modalContent.innerHTML = `
            <div style="line-height: 1.8; font-size: 16px;">
                <p>${previewText}</p>
            </div>
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border-color);">
                <p style="color: var(--text-muted); font-size: 14px;">
                    Preview only - click below to read full article
                </p>
            </div>
        `;
    }

    // Show modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Close article modal
function closeArticleModal() {
    const modal = document.getElementById('articleModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Toggle article in reading queue
async function toggleQueue(element, event) {
    event.stopPropagation();

    const card = element.closest('.card');
    const articleUrl = card.dataset.url;

    try {
        const inQueue = await isInQueue(articleUrl);

        if (inQueue) {
            await removeFromQueue(articleUrl);
            showNotification('Removed from reading queue');
        } else {
            // Find the article
            const article = allArticles.find(a => a.url === articleUrl);
            if (article) {
                await addToQueue(article);
                showNotification('Added to reading queue');
            }
        }

        // Re-render current view
        await loadAndRenderView();
    } catch (error) {
        console.error('Error toggling queue:', error);
        showNotification('Error updating queue', true);
    }
}

// Show notification toast - only one at a time
function showNotification(message, isError = false) {
    // Remove any existing toasts first to prevent stacking
    document.querySelectorAll('.toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'toast-error' : 'toast-success'}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Render articles to grid
async function renderArticles(articles) {
    if (!articles || articles.length === 0) {
        const emptyMessage = currentView === 'queue'
            ? 'Your reading queue is empty. Add articles from "All Articles" tab.'
            : 'No articles found. Click sync to fetch news!';

        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">${emptyMessage}</p>`;
        return;
    }

    const cardsHTML = await Promise.all(articles.map(article => createArticleCard(article)));
    grid.innerHTML = cardsHTML.join('');
}

// Load and render current view
async function loadAndRenderView() {
    try {
        if (currentView === 'all') {
            allArticles = await getAllArticles();
            // Sort: Fresh articles first, then stale
            allArticles.sort((a, b) => {
                if (a.batchId === latestBatchId && b.batchId !== latestBatchId) return -1;
                if (a.batchId !== latestBatchId && b.batchId === latestBatchId) return 1;
                return new Date(b.publishedAt) - new Date(a.publishedAt);
            });
            await renderArticles(allArticles);
        } else if (currentView === 'queue') {
            const queueArticles = await getReadingQueue();
            await renderArticles(queueArticles);
        }
    } catch (error) {
        console.error('Error loading view:', error);
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">Error loading articles</p>';
    }
}

// Format article content for display
function formatArticleContent(article) {
    // GNews already provides content - just format it nicely
    let formattedContent = '';

    // Add description
    if (article.description) {
        formattedContent += `<p><strong>Summary:</strong></p>`;
        formattedContent += `<p>${article.description}</p>`;
    }

    // Add main content if available
    if (article.content) {
        formattedContent += `<div style="margin-top: 20px;"><p><strong>Article Content:</strong></p>`;

        // Split content into paragraphs (GNews content is usually one long string)
        // Remove the "[+XXXX chars]" suffix that GNews adds
        let cleanContent = article.content.replace(/\[\+\d+ chars\]$/, '').trim();

        // Split by common sentence endings followed by spaces to create paragraphs
        const sentences = cleanContent.split(/(?<=[.!?])\s+/);
        let currentParagraph = '';

        sentences.forEach((sentence, index) => {
            currentParagraph += sentence + ' ';

            // Create a new paragraph every 3-4 sentences or at the end
            if ((index + 1) % 3 === 0 || index === sentences.length - 1) {
                formattedContent += `<p>${currentParagraph.trim()}</p>`;
                currentParagraph = '';
            }
        });

        formattedContent += `</div>`;
    }

    // Add read more link
    formattedContent += `
    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border-color);">
      <p id="fetch-status" style="color: var(--text-muted); font-size: 14px; font-style: italic;">
        Attempting to fetch full article...
      </p>
      <a href="${article.url}" target="_blank" style="color: var(--primary-color); text-decoration: none; font-weight: 500;">
        Read full article on ${article.source.name} →
      </a>
    </div>
  `;

    return formattedContent;
}

// Attempt to fetch full article from source website
async function fetchFullArticleFromWeb(url) {
    try {
        console.log(`Attempting to fetch full article from: ${url}`);

        // Use allorigins CORS proxy
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);

        if (!response.ok) {
            console.warn(`Proxy failed with status: ${response.status}`);
            return null;
        }

        const html = await response.text();

        if (!html || html.length < 100) {
            console.warn('Received empty or very short response');
            return null;
        }

        // Parse HTML and extract article content
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Remove unwanted elements
        doc.querySelectorAll('script, style, iframe, nav, header, footer, .ad, .advertisement, .social-share, .comments, aside, .sidebar, .related-articles').forEach(el => el.remove());

        // Try to find article content using common selectors
        const selectors = [
            'article',
            '[role="article"]',
            '.article-body',
            '.article-content',
            '.post-content',
            '.entry-content',
            '.story-body',
            'main article',
            'main',
            '#article-body',
            '#main-content',
            '.content'
        ];

        let articleContent = null;

        for (const selector of selectors) {
            const element = doc.querySelector(selector);
            if (element) {
                const paragraphs = element.querySelectorAll('p');
                if (paragraphs.length > 2) {
                    articleContent = element.innerHTML;
                    console.log(`✓ Found full article using selector: ${selector}`);
                    break;
                }
            }
        }

        if (!articleContent) {
            // Fallback: get all substantial paragraphs from body
            const allParagraphs = doc.querySelectorAll('body p');
            if (allParagraphs.length > 3) {
                const container = doc.createElement('div');
                allParagraphs.forEach(p => {
                    if (p.textContent.trim().length > 50) {
                        container.appendChild(p.cloneNode(true));
                    }
                });
                if (container.children.length > 0) {
                    articleContent = container.innerHTML;
                    console.log(`✓ Extracted ${container.children.length} paragraphs from body`);
                }
            }
        }

        if (articleContent) {
            // Clean up the content - PLAIN TEXT ONLY
            const tempDiv = doc.createElement('div');
            tempDiv.innerHTML = articleContent;

            // Remove unwanted elements
            tempDiv.querySelectorAll(`
                video, iframe, audio, embed, object, source,
                script, style, noscript, form, input, button, textarea,
                nav, aside, footer, figure, figcaption, img,
                [class*="share"], [class*="social"], [class*="comment"],
                [class*="related"], [class*="recommend"], [class*="sidebar"],
                [class*="ad"], [class*="promo"], [class*="newsletter"],
                [class*="subscribe"], [class*="author"], [class*="byline"],
                [class*="paywall"], [class*="premium"], [class*="locked"],
                [id*="comment"], [id*="disqus"], [id*="paywall"]
            `.replace(/\s+/g, '')).forEach(el => el.remove());

            // Remove ALL links - replace with just their text content
            tempDiv.querySelectorAll('a').forEach(a => {
                const text = a.textContent;
                const textNode = document.createTextNode(text);
                a.parentNode.replaceChild(textNode, a);
            });

            // Get clean text from paragraphs
            let cleanText = '';
            tempDiv.querySelectorAll('p').forEach(p => {
                const text = p.textContent.trim();
                if (text.length > 20) { // Only keep substantial paragraphs
                    cleanText += `<p>${text}</p>\n`;
                }
            });

            // If no paragraphs found, try to get text from divs
            if (cleanText.length < 100) {
                const allText = tempDiv.textContent.trim();
                if (allText.length > 50) {
                    // Split by double newlines to create paragraphs
                    const paragraphs = allText.split(/\n\s*\n/).filter(p => p.trim().length > 20);
                    cleanText = paragraphs.map(p => `<p>${p.trim()}</p>`).join('\n');
                }
            }

            // Check for paywall/subscription messages - don't save useless content
            const lowerText = cleanText.toLowerCase();
            const paywallPhrases = [
                'paid plan', 'subscription required', 'premium content',
                'subscribe to read', 'subscribe to continue', 'sign up to read',
                'members only', 'exclusive content', 'unlock this article',
                'create an account', 'log in to read', 'register to read',
                'only available in', 'upgrade to access', 'become a member'
            ];

            const isPaywalled = paywallPhrases.some(phrase => lowerText.includes(phrase));

            if (isPaywalled) {
                console.log('Paywall detected, skipping article');
                return null;
            }

            // Return cleaned content or null if empty
            return cleanText.length > 100 ? cleanText : null;
        }

        return null;
    } catch (error) {
        console.error('Error fetching full article:', error);
        return null;
    }
}

// Download image and convert to base64 for offline storage
async function downloadImageAsBase64(imageUrl) {
    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.warn('Failed to download image:', imageUrl, error);
        return null;
    }
}

// Fetch news from API - FAST display, background caching
async function fetchNews() {
    if (!isOnline) {
        showNotification('You are offline. Cannot sync.', true);
        return;
    }

    try {
        // Update status
        updateStatus('syncing');
        showNotification('Fetching headlines...');

        // Event Registry API - uses POST with JSON body
        const endpoint = `${API_BASE_URL}/article/getArticles`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                apiKey: API_KEY,
                resultType: 'articles',
                articlesSortBy: 'date',
                articlesCount: 10,
                lang: 'eng',
                includeArticleBody: true,
                includeArticleImage: true
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const data = await response.json();
        console.log('Event Registry API response:', data);

        const articles = data.articles?.results || [];
        console.log(`Event Registry API returned ${articles.length} articles`);

        if (articles.length > 0) {
            await cleanupOldArticles(10);

            const batchId = Date.now().toString();

            // Transform articles from Event Registry format - includes FULL article body!
            const transformedArticles = articles
                .filter(article => article.title && article.title.length > 5)
                .map(article => ({
                    title: article.title,
                    description: article.body ? article.body.substring(0, 200) + '...' : 'No description',
                    content: article.body || 'No content available',
                    fullContent: article.body || null, // Event Registry gives FULL body!
                    url: article.url,
                    image: article.image || null, // Event Registry image URL
                    publishedAt: article.dateTime || article.date,
                    source: { name: article.source?.title || 'Unknown' },
                    batchId: batchId
                }));

            // Check if we have any articles
            if (transformedArticles.length === 0) {
                showNotification('No articles found. Try again later.', true);
                updateStatus('online');
                return;
            }

            // STEP 1: Save ALL articles immediately (with full content from API!)
            await saveArticles(transformedArticles, batchId);
            await saveMetadata('latestBatchId', batchId);
            latestBatchId = batchId;

            // STEP 2: Display articles INSTANTLY
            allArticles = await getAllArticles();
            await loadAndRenderView();

            // Count how many have full content
            const withContent = transformedArticles.filter(a => a.fullContent && a.fullContent.length > 100).length;
            showNotification(`✓ ${transformedArticles.length} headlines (${withContent} full articles)! Caching images...`);
            updateStatus('online');

            // STEP 3: Background caching - images only (articles already have full body!)
            cacheArticlesInBackground(transformedArticles, batchId, transformedArticles.length);

        } else {
            throw new Error(data.message || 'Failed to fetch news');
        }
    } catch (error) {
        console.error('Error fetching news:', error);
        updateStatus('offline');
        showNotification('Failed to sync news. Try again later.', true);
    }
}

// Background caching - runs PARALLEL for speed
async function cacheArticlesInBackground(articles, batchId, total) {
    console.log('Starting background caching for', articles.length, 'articles...');
    showNotification('Caching for offline use...');

    let imagesCached = 0;
    let articlesFetched = 0;
    const articlesWithImage = articles.filter(a => a.image).length;

    // Helper function with timeout
    const withTimeout = (promise, ms) => {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
        ]);
    };

    // Cache all images in parallel (with 30sec timeout each)
    const imagePromises = articles.map(async (article) => {
        if (!article.image || article.cachedImage) return { success: false, reason: 'no image or already cached' };

        try {
            let base64Image = null;

            // Try direct fetch first
            try {
                base64Image = await withTimeout(downloadImageAsBase64(article.image), 15000);
            } catch (e) {
                console.log('Direct image fetch failed, trying proxy...', article.title);
            }

            // Try proxy if direct failed
            if (!base64Image) {
                try {
                    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(article.image)}`;
                    base64Image = await withTimeout(downloadImageAsBase64(proxyUrl), 15000);
                } catch (e) {
                    console.log('Proxy image fetch also failed:', article.title);
                }
            }

            if (base64Image) {
                article.cachedImage = base64Image;
                imagesCached++;
                await saveArticles([article], batchId);
                console.log('✓ Image cached:', article.title);
                return { success: true };
            }
            return { success: false, reason: 'fetch failed' };
        } catch (err) {
            console.error('Image cache error:', article.title, err);
            return { success: false, reason: err.message };
        }
    });

    // Fetch all articles in parallel (with 30sec timeout each)
    const articlePromises = articles.map(async (article) => {
        if (article.fullContent) return { success: false, reason: 'already cached' };

        try {
            const fullContent = await withTimeout(fetchFullArticleFromWeb(article.url), 30000);
            if (fullContent && fullContent.length > 100) {
                article.fullContent = fullContent;
                articlesFetched++;
                await saveArticles([article], batchId);
                console.log('✓ Article cached:', article.title);
                return { success: true };
            }
            return { success: false, reason: 'no content extracted' };
        } catch (err) {
            console.error('Article cache error:', article.title, err);
            return { success: false, reason: err.message };
        }
    });

    // Wait for all to complete (parallel)
    const imageResults = await Promise.allSettled(imagePromises);
    const articleResults = await Promise.allSettled(articlePromises);

    console.log('Image results:', imageResults);
    console.log('Article results:', articleResults);

    // Update last sync time
    await saveMetadata('lastSync', new Date().toISOString());

    // Get fresh data from IndexedDB to verify what was actually saved
    const savedArticles = await getAllArticles();
    const actualImagesCached = savedArticles.filter(a => a.cachedImage).length;
    const actualArticlesCached = savedArticles.filter(a => a.fullContent && a.fullContent.length > 100).length;

    // Refresh view to use base64 images
    allArticles = savedArticles;
    await loadAndRenderView();

    // Show actual counts from database
    showNotification(`✓ Offline: ${actualImagesCached} images, ${actualArticlesCached} articles cached!`);
    console.log(`Background caching complete - Verified: ${actualImagesCached} images, ${actualArticlesCached} articles in database`);
}

// Cleanup old articles to make room for new ones
async function cleanupOldArticles(keepLatest = 10) {
    try {
        const articles = await getAllArticles();

        // Sort by batch ID (newest first)
        articles.sort((a, b) => parseInt(b.batchId) - parseInt(a.batchId));

        // Get unique batch IDs
        const uniqueBatches = [...new Set(articles.map(a => a.batchId))];

        // If we have more batches than we want to keep, delete old ones
        if (uniqueBatches.length > keepLatest) {
            const batchesToDelete = uniqueBatches.slice(keepLatest);

            // Delete articles from old batches
            for (const batchId of batchesToDelete) {
                const oldArticles = articles.filter(a => a.batchId === batchId);
                for (const article of oldArticles) {
                    // Delete from articles store
                    await new Promise((resolve, reject) => {
                        const transaction = db.transaction([ARTICLES_STORE], 'readwrite');
                        const store = transaction.objectStore(ARTICLES_STORE);
                        const request = store.delete(article.url);
                        request.onsuccess = () => resolve();
                        request.onerror = () => reject(request.error);
                    });
                }
            }

            console.log(`Deleted ${batchesToDelete.length} old batches to make room for new articles`);
        }
    } catch (error) {
        console.error('Error cleaning up old articles:', error);
    }
}

// Update online/offline status
function updateStatus(status) {
    if (status === 'online') {
        statusDot.style.background = '#10b981';
        statusText.innerHTML = '<div class="status-dot" style="background: #10b981;"></div> Online';
        syncButton.disabled = false;
        syncButton.style.opacity = '1';
    } else if (status === 'offline') {
        statusDot.style.background = '#ef4444';
        statusText.innerHTML = '<div class="status-dot" style="background: #ef4444;"></div> Offline';
        syncButton.disabled = true;
        syncButton.style.opacity = '0.5';
    } else if (status === 'syncing') {
        statusDot.style.background = '#f59e0b';
        statusText.innerHTML = '<div class="status-dot" style="background: #f59e0b;"></div> Syncing...';
        syncButton.disabled = true;
        syncButton.style.opacity = '0.5';
    }
}

// Search functionality
async function searchArticles(query) {
    const articlesToSearch = currentView === 'all'
        ? await getAllArticles()
        : await getReadingQueue();

    if (!query.trim()) {
        await renderArticles(articlesToSearch);
        return;
    }

    const filtered = articlesToSearch.filter(article => {
        const titleMatch = article.title.toLowerCase().includes(query.toLowerCase());
        const descMatch = article.description?.toLowerCase().includes(query.toLowerCase());
        return titleMatch || descMatch;
    });

    await renderArticles(filtered);
}

// Event Listeners
syncButton.addEventListener('click', fetchNews);

searchInput.addEventListener('input', (e) => {
    searchArticles(e.target.value);
});

// Tab functionality
tabs.forEach((tab, index) => {
    tab.addEventListener('click', async () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        if (index === 0) {
            // All Articles
            currentView = 'all';
            searchInput.value = '';
            await loadAndRenderView();
        } else if (index === 1) {
            // Reading Queue
            currentView = 'queue';
            searchInput.value = '';
            await loadAndRenderView();
        } else if (index === 2) {
            // Search tab - just focus search
            searchInput.focus();
        }
    });
});

// Network status listeners
window.addEventListener('online', () => {
    isOnline = true;
    updateStatus('online');
    showNotification('You are back online');
});

window.addEventListener('offline', () => {
    isOnline = false;
    updateStatus('offline');
    showNotification('You are offline', true);
});

// Initialize app
async function initApp() {
    try {
        // Initialize IndexedDB
        await initDB();

        // Load latest batch ID
        latestBatchId = await getMetadata('latestBatchId');

        // Load articles
        allArticles = await getAllArticles();

        if (allArticles.length > 0) {
            await renderArticles(allArticles);
            updateStatus(isOnline ? 'online' : 'offline');
        } else {
            // No cached articles, fetch if online
            if (isOnline) {
                await fetchNews();
            } else {
                updateStatus('offline');
                grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">No articles cached. Connect to internet and click sync.</p>';
            }
        }
    } catch (error) {
        console.error('Error initializing app:', error);
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">Error initializing application</p>';
    }
}

// Delete all articles (works offline and online)
async function deleteAllArticles() {
    if (confirm('Are you sure you want to delete all articles? This cannot be undone.')) {
        try {
            await clearArticles();
            allArticles = [];
            await renderArticles([]);
            showNotification('All articles deleted');
        } catch (error) {
            console.error('Error deleting articles:', error);
            showNotification('Error deleting articles', true);
        }
    }
}

// Refresh view - syncs when online, reloads from cache when offline
async function refreshView() {
    try {
        if (isOnline) {
            // Online: fetch new articles
            await fetchNews();
        } else {
            // Offline: just reload from cache
            showNotification('Refreshing from cache...');
            await loadAndRenderView();
            showNotification('✓ Refreshed from cache');
        }
    } catch (error) {
        console.error('Error refreshing:', error);
        showNotification('Error refreshing', true);
    }
}

// Start app when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    // Initialize app
    initApp();

    // Add button event listeners
    const refreshBtn = document.getElementById('refreshBtn');
    const deleteBtn = document.getElementById('deleteBtn');

    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshView);
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', deleteAllArticles);
    }
});
