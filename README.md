# 📰 Offline News Reader — Progressive Web Application

A feature-rich, offline-first news reading web application built with vanilla JavaScript, Service Workers, and IndexedDB. The app fetches live news headlines from Event Registry API, caches them locally with images, and provides a seamless offline reading experience with full article content.

---

## 📑 Table of Contents

- [Features](#-features)
- [Technologies](#-technologies-used)
- [Architecture](#-architecture)
- [How It Works](#-how-it-works)
- [Installation](#-installation--setup)
- [API Integration](#-api-integration)
- [Data Storage](#-data-storage)
- [Image Caching Strategy](#-image-caching-strategy)
- [Offline Mode](#-offline-mode)
- [PWA Features](#-pwa-features)
- [Project Structure](#-project-structure)
- [Testing](#-testing)
- [Known Limitations](#-known-limitations)
- [Educational Value](#-educational-value)
- [Author](#-author)

---

## ✨ Features

### 🌐 **Online Mode**
- **Live News Fetching**: Retrieves latest 10 articles from Event Registry API
- **Full Article Content**: Complete article body text included in API response
- **Real-time Updates**: Manual refresh fetches newest headlines
- **Instant Display**: Articles show immediately with URL-based images
- **Fresh Badge**: New articles marked with "Fresh" indicator

### 📴 **Offline Mode**
- **Complete Offline Access**: Read articles without internet connection
- **Cached Images**: Base64-encoded images stored in IndexedDB
- **Full Content**: Complete article text readable offline
- **Instant Loading**: Service Worker loads app shell from cache
- **No Network Calls**: Pure local database operations

### 🖼️ **Smart Image Handling**
- **Three-tier System**:
  1. **Cached Base64**: Fastest, always works offline
  2. **URL Loading**: Tries original image URL when online
  3. **Colored Fallback**: Beautiful gradient thumbnails with keywords
- **Background Caching**: Images download in parallel after article display
- **CORS Proxy**: Automatic fallback for cross-origin images
- **Error Handling**: Graceful degradation when images fail

### 📚 **Reading Queue**
- **Bookmark Articles**: Add interesting stories to personal queue
- **Dedicated View**: Separate tab shows only queued articles
- **Visual Indicator**: "✓ In Queue" badge on saved articles
- **Persistent**: Queue survives page refreshes and offline mode

### 🔍 **Search & Filter**
- **Instant Search**: Real-time filtering as you type
- **Title & Snippet**: Searches both fields
- **Case-insensitive**: Finds matches regardless of capitalization
- **Highlights Results**: Shows matching articles only

### 🌓 **Dark Mode**
- **Theme Toggle**: Switch between light and dark themes
- **CSS Variables**: Efficient color switching
- **Persistent**: Theme preference saved locally
- **Smooth Transition**: Animated color changes

### ⚡ **Progressive Web App (PWA)**
- **Installable**: Add to home screen on mobile/desktop
- **Offline-First**: Works without internet from first load
- **App-like Experience**: Standalone window, no browser UI
- **Fast Loading**: Service Worker caches all static assets

### 🔔 **Toast Notifications**
- **Status Updates**: Sync progress, cache completion, errors
- **Non-blocking**: Disappears automatically after 3 seconds
- **Smart Stacking**: Only one notification visible at a time
- **Color Coded**: Green for success, red for errors

---

## 🛠️ Technologies Used

| Technology | Version | Purpose |
|------------|---------|---------|
| **HTML5** | - | Semantic structure and markup |
| **CSS3** | - | Responsive design with CSS variables |
| **JavaScript** | ES6+ | Application logic and async operations |
| **Event Registry API** | v1 | News source with full article content |
| **IndexedDB** | - | Client-side database for offline storage |
| **Service Worker** | - | PWA caching and offline functionality |
| **CORS Proxy** | AllOrigins | Image fetching across domains |

### Why These Technologies?

- **Vanilla JavaScript**: No framework overhead, faster loading
- **Event Registry**: Provides complete article body (not just snippets)
- **IndexedDB**: Handles complex data structures and large binary data (images)
- **Service Worker**: Enables true offline functionality and PWA features

---

## 🏗️ Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    USER INTERFACE                       │
│  (index.html + style.css)                              │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│               APPLICATION LAYER                         │
│  (app.js)                                              │
│  ├─ UI Control (tabs, search, modals)                 │
│  ├─ API Integration (Event Registry)                  │
│  ├─ Background Caching (images + articles)            │
│  └─ State Management (online/offline detection)       │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│               DATA LAYER                                │
│  (db.js + IndexedDB)                                   │
│  ├─ Articles Store (title, content, images)           │
│  └─ Metadata Store (sync time, batch IDs)             │
└─────────────────────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│               SERVICE WORKER                            │
│  (sw.js)                                               │
│  ├─ Static Asset Caching (HTML, CSS, JS)              │
│  ├─ Cache Management (versioning)                     │
│  └─ Offline Fallback                                   │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. ONLINE SYNC
   User clicks "Refresh"
        ↓
   Event Registry API (POST request)
        ↓
   Transform response (10 articles)
        ↓
   Save to IndexedDB immediately
        ↓
   Display articles (with URL images)
        ↓
   Background caching starts (parallel)
        ├─ Download images → Convert to base64 → Save
        └─ Enhanced content scraping (optional)
        ↓
   Update view with cached images
        ↓
   Notification: "✓ Offline: X images, Y articles cached!"

2. OFFLINE LOAD
   User opens app (no internet)
        ↓
   Service Worker loads static assets from cache
        ↓
   IndexedDB query for all articles
        ↓
   Render articles with cached base64 images
        ↓
   Colored fallbacks for unavailable images
        ↓
   Full offline reading experience
```

---

## 🚀 How It Works

### Initial App Load

1. **Service Worker Activation**
   - Downloads and caches `index.html`, `style.css`, `app.js`, `db.js`
   - Enables instant loading on subsequent visits
   - Works offline immediately after first visit

2. **IndexedDB Initialization**
   ```javascript
   Database: 'NewsReaderDB'
   Stores:
     - articles (keyPath: 'url')
     - metadata (keyPath: 'key')
   ```

3. **UI Rendering**
   - Checks for existing articles in database
   - Displays cached articles if available
   - Shows empty state if first visit

### Fetching News (Online)

```javascript
// 1. API Request
POST https://eventregistry.org/api/v1/article/getArticles
Body: {
  apiKey: "...",
  resultType: "articles",
  articlesCount: 10,
  includeArticleBody: true,
  includeArticleImage: true
}

// 2. Response Processing
articles.map(article => ({
  title: article.title,
  description: article.body.substring(0, 200),
  content: article.body,
  fullContent: article.body,  // Complete article!
  image: article.image,
  url: article.url,
  publishedAt: article.dateTime,
  source: { name: article.source.title },
  batchId: Date.now().toString()
}))

// 3. Immediate Save & Display
await saveArticles(transformedArticles, batchId);
renderArticles(transformedArticles);

// 4. Background Caching (Non-blocking)
cacheArticlesInBackground(transformedArticles, batchId, 10);
```

### Background Image Caching

```javascript
// Parallel execution with Promise.allSettled
articles.map(async (article) => {
  // Try direct fetch
  let base64 = await downloadImageAsBase64(article.image);
  
  if (!base64) {
    // Fallback to CORS proxy
    const proxyUrl = `https://api.allorigins.win/raw?url=${article.image}`;
    base64 = await downloadImageAsBase64(proxyUrl);
  }
  
  if (base64) {
    article.cachedImage = base64;
    await saveArticles([article], batchId);
  }
});

// Result: ~50% success rate due to CORS restrictions
```

### Offline Reading

```javascript
// 1. Load from IndexedDB
const articles = await getAllArticles();

// 2. Render with cached data
articles.forEach(article => {
  if (article.cachedImage) {
    // Show base64 image
    img.src = article.cachedImage;
  } else {
    // Show colored fallback
    card.style.background = randomColor;
    card.textContent = getKeyword(article.title);
  }
});

// 3. Full article accessible
modal.content = article.fullContent;  // Complete text!
```

---

## 💻 Installation & Setup

### Prerequisites

- Modern web browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Local web server (cannot run from `file://` protocol)
- Event Registry API key (free tier available)

### Step-by-Step Setup

1. **Download Project**
   ```bash
   # If using Git
   git clone <repository-url>
   cd DFGH
   
   # Or download ZIP and extract
   ```

2. **Get API Key**
   - Visit [Event Registry](https://eventregistry.org/)
   - Create free account
   - Copy your API key from dashboard

3. **Configure API Key**
   - Open `app.js`
   - Line 2: Replace with your key
   ```javascript
   const API_KEY = 'YOUR_API_KEY_HERE';
   ```

4. **Start Local Server**

   **Option A: VS Code Live Server (Recommended)**
   ```
   1. Install "Live Server" extension
   2. Right-click index.html
   3. Select "Open with Live Server"
   4. App opens at http://localhost:5500
   ```

   **Option B: Python**
   ```bash
   python3 -m http.server 5503
   # Visit http://localhost:5503
   ```

   **Option C: Node.js**
   ```bash
   npx serve .
   # Visit http://localhost:3000
   ```

5. **First Use**
   - Click **"Refresh"** button
   - Wait for articles to load
   - Background caching notification appears
   - App is now offline-ready!

### PWA Installation (Optional)

**Desktop (Chrome/Edge)**
1. Look for install icon in address bar (⊕)
2. Click "Install Offline News Reader"
3. App opens in standalone window

**Mobile**
1. Open app in browser
2. Tap share/menu button
3. Select "Add to Home Screen"
4. Icon appears on home screen

---

## 🔌 API Integration

### Event Registry API

**Endpoint**: `https://eventregistry.org/api/v1/article/getArticles`

**Method**: `POST`

**Request Body**:
```json
{
  "apiKey": "29bd8cb1-d842-4339-b606-9fe0621253e4",
  "resultType": "articles",
  "articlesSortBy": "date",
  "articlesCount": 10,
  "lang": "eng",
  "includeArticleBody": true,
  "includeArticleImage": true
}
```

**Response Structure**:
```json
{
  "articles": {
    "results": [
      {
        "title": "Article Title",
        "body": "Full article content...",
        "image": "https://...",
        "url": "https://...",
        "dateTime": "2025-12-04T19:00:00Z",
        "source": {
          "title": "News Source"
        }
      }
    ]
  }
}
```

**Why Event Registry?**
- ✅ Provides **complete article body** (not just snippets)
- ✅ High-quality images
- ✅ Reliable metadata (source, date, URL)
- ✅ Free tier: 500 requests/day
- ✅ No truncation or paywalls in API

---

## 💾 Data Storage

### IndexedDB Schema

```javascript
Database: 'NewsReaderDB'
Version: 1

Object Stores:
┌─────────────────────────────────────────┐
│ Store: 'articles'                       │
│ KeyPath: 'url'                          │
│ Indexes: None                           │
├─────────────────────────────────────────┤
│ Fields:                                 │
│  • title: string                        │
│  • description: string (200 chars)     │
│  • content: string (short)             │
│  • fullContent: string (complete)      │
│  • url: string (primary key)           │
│  • image: string (URL)                 │
│  • cachedImage: string (base64)        │
│  • publishedAt: string (ISO)           │
│  • source: object { name }             │
│  • batchId: string (timestamp)         │
│  • inQueue: boolean                    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Store: 'metadata'                       │
│ KeyPath: 'key'                          │
│ Indexes: None                           │
├─────────────────────────────────────────┤
│ Records:                                │
│  • lastSync: ISO timestamp             │
│  • latestBatchId: string               │
└─────────────────────────────────────────┘
```

### Sample Article Record

```javascript
{
  title: "Putin arrives in New Delhi on a state visit...",
  description: "Russian President Vladimir Putin landed in India...",
  content: "NEW DELHI (AP) -- Russian President...",
  fullContent: "NEW DELHI (AP) -- Russian President Vladimir Putin landed in India Thursday on a state visit aimed at bolstering bilateral and economic ties between the two countries. Indian Prime Minister Narendra Modi received the Russian leader at an airport in New Delhi, giving a bearhug and a tight handshake...",
  url: "https://wral.com/story/...",
  image: "https://wral.com/.../image.jpg",
  cachedImage: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA...",
  publishedAt: "2025-12-04T14:30:00Z",
  source: { name: "WRAL" },
  batchId: "1733328600000",
  inQueue: false
}
```

### Storage Size Estimate

| Data Type | Per Article | 10 Articles | 100 Articles |
|-----------|-------------|-------------|--------------|
| Text Data | ~2 KB | ~20 KB | ~200 KB |
| Image (base64) | ~100 KB | ~1 MB | ~10 MB |
| **Total** | **~102 MB** | **~1 MB** | **~10.2 MB** |

**Browser Limits**: Typically 50-100 MB (varies by browser)

---

## 🖼️ Image Caching Strategy

### Three-Tier Approach

```
TIER 1: Cached Base64 (Fastest)
├─ Source: IndexedDB
├─ Format: data:image/jpeg;base64,...
├─ Speed: Instant
├─ Offline: ✅ Always works
└─ Used: When article.cachedImage exists

TIER 2: URL Loading (Online Only)
├─ Source: Original server
├─ Format: https://server.com/image.jpg
├─ Speed: Network-dependent
├─ Offline: ❌ Fails
└─ Used: When online and no cached version

TIER 3: Colored Fallback (Always Available)
├─ Source: Generated
├─ Format: CSS gradient + text
├─ Speed: Instant
├─ Offline: ✅ Always works
└─ Used: When image unavailable
```

### Background Caching Process

```javascript
async function cacheArticlesInBackground(articles, batchId, total) {
  // Parallel execution (Promise.allSettled)
  const imagePromises = articles.map(async (article) => {
    if (!article.image) return { success: false };
    
    try {
      // Attempt 1: Direct fetch
      let base64 = await withTimeout(
        downloadImageAsBase64(article.image), 
        15000  // 15 second timeout
      );
      
      // Attempt 2: CORS proxy fallback
      if (!base64) {
        const proxy = `https://api.allorigins.win/raw?url=${article.image}`;
        base64 = await withTimeout(
          downloadImageAsBase64(proxy),
          15000
        );
      }
      
      // Save if successful
      if (base64) {
        article.cachedImage = base64;
        await saveArticles([article], batchId);
        return { success: true };
      }
      
      return { success: false, reason: 'fetch failed' };
    } catch (err) {
      return { success: false, reason: err.message };
    }
  });
  
  await Promise.allSettled(imagePromises);
}
```

### Why ~50% Success Rate?

**CORS (Cross-Origin Resource Sharing) Restrictions**

```
Server A: Access-Control-Allow-Origin: *
└─> ✅ Can cache

Server B: (no CORS header)
└─> ❌ Browser blocks
    └─> Try CORS proxy
        ├─> ✅ If proxy succeeds
        └─> ❌ If proxy also fails (403/404)
```

**Common Failure Reasons**:
1. Server doesn't allow cross-origin requests
2. Image requires authentication
3. Server blocks proxy IPs
4. Image deleted/moved (404)
5. Timeout (>15 seconds)

---

## 📴 Offline Mode

### Service Worker Caching

```javascript
// sw.js - Version 29 (updates increment)
const CACHE_NAME = 'offline-news-v29';
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './db.js'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
  );
});

// Fetch event - serve from cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
```

### Offline Detection

```javascript
let isOnline = navigator.onLine;

// Update UI on connectivity change
window.addEventListener('online', () => {
  isOnline = true;
  updateStatus('online');
});

window.addEventListener('offline', () => {
  isOnline = false;
  updateStatus('offline');
});
```

### Offline Reading Flow

```
1. User opens app (airplane mode)
   ↓
2. Service Worker intercepts requests
   ↓
3. Static assets served from cache
   ↓
4. App loads instantly (HTML/CSS/JS)
   ↓
5. JavaScript queries IndexedDB
   ↓
6. Articles rendered with cached data
   ├─ Cached images (base64) display
   └─ Missing images show colored fallback
   ↓
7. User clicks article
   ↓
8. Modal shows fullContent
   ↓
9. Complete offline reading experience ✅
```

---

## ⚡ PWA Features

### Web App Manifest

```json
{
  "name": "Offline News Reader",
  "short_name": "News Reader",
  "start_url": "./",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#6366f1",
  "icons": [
    {
      "src": "icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### PWA Checklist

- ✅ HTTPS (required for Service Worker)
- ✅ Service Worker registered
- ✅ Web App Manifest
- ✅ Offline functionality
- ✅ Fast loading (<3s)
- ✅ Responsive design
- ✅ Mobile-friendly
- ✅ Installable

---

## 📂 Project Structure

```
DFGH/
│
├── index.html              # Main HTML structure
│   ├── Header (title, status, controls)
│   ├── Tabs (All Articles, Reading Queue, Search)
│   ├── Grid (article cards)
│   └── Modal (article detail view)
│
├── style.css               # Styling
│   ├── CSS Variables (theming)
│   ├── Light/Dark mode styles
│   ├── Responsive grid layout
│   ├── Card components
│   └── Modal styles
│
├── app.js                  # Core application logic (912 lines)
│   ├── Utility functions (colors, dates, text)
│   ├── UI rendering (cards, modals)
│   ├── Event handlers (clicks, search)
│   ├── API integration (Event Registry)
│   ├── Background caching (images + articles)
│   ├── IndexedDB operations
│   └── State management
│
├── db.js                   # IndexedDB helper functions
│   ├── Database initialization
│   ├── CRUD operations (save, get, delete)
│   └── Metadata management
│
├── sw.js                   # Service Worker
│   ├── Cache version management
│   ├── Static asset caching
│   ├── Fetch intercepting
│   └── Cache cleanup
│
└── README.md               # This file
```

### Function Breakdown (app.js)

```
Utility Functions:
├─ getRandomColor()          # Color for fallbacks
├─ getCardTopText()          # Keyword extraction
├─ formatDate()              # Time ago formatting
└─ truncateText()            # Snippet shortening

Rendering:
├─ createArticleCard()       # Individual card HTML
├─ renderArticles()          # Grid population
└─ showArticleModal()        # Detail view

Event Handling:
├─ openArticleDetail()       # Card click handler
├─ addToQueue()              # Bookmark handler
├─ searchArticles()          # Search filtering
└─ switchTab()               # Tab navigation

Data Operations:
├─ fetchNews()               # API integration
├─ cacheArticlesInBackground() # Image/content caching
├─ loadAndRenderView()       # UI refresh
└─ cleanupOldArticles()      # Storage management

Helpers:
├─ showNotification()        # Toast messages
├─ updateStatus()            # Online/offline indicator
└─ withTimeout()             # Promise timeout wrapper
```

---

## 🧪 Testing

### Manual Testing Steps

#### 1. **Fresh Install Test**
```
1. Clear browser data (F12 → Application → Clear storage)
2. Open app → Should see empty state
3. Click "Refresh" → Articles load
4. Verify: Images show, content readable
```

#### 2. **Offline Functionality Test**
```
1. Load articles while online
2. Wait for "Offline: X images cached!" notification
3. Open DevTools → Network tab → Select "Offline"
4. Refresh page
5. Verify:
   ✅ App loads instantly
   ✅ Articles display
   ✅ Cached images show
   ✅ Colored fallbacks for others
   ✅ Full article readable in modal
```

#### 3. **Reading Queue Test**
```
1. Click "+ Queue" on an article
2. Verify badge changes to "✓ In Queue"
3. Click "Reading Queue" tab
4. Verify article appears
5. Go offline → Queue persists
```

#### 4. **Search Test**
```
1. Click "Search" tab
2. Type keyword (e.g., "Putin")
3. Verify real-time filtering
4. Clear search → All articles return
```

#### 5. **Dark Mode Test**
```
1. Click theme toggle (🌙)
2. Verify colors switch to dark theme
3. Refresh page
4. Verify theme persists
```

#### 6. **Image Caching Test**
```
1. Load articles online
2. Open console
3. Look for:
   "✓ Image cached: [article title]"
   "Image cache error: [article title]"
4. Count successes vs failures
5. Expected: ~40-60% success rate
```

### Console Logs Reference

```javascript
// API Responses
"Event Registry API returned 10 articles"

// Caching Progress
"Starting background caching for 10 articles..."
"✓ Image cached: Article Title"
"Image cache error: Article Title CORS blocked"
"✓ Article cached: Article Title"

// Completion
"Background caching complete - Verified: 8 images, 10 articles"

// Database Operations
"Saving 10 articles to IndexedDB"
"Loaded 10 articles from IndexedDB"
```

---

## 🐛 Known Limitations

### 1. **Image Caching Success Rate (~50%)**

**Cause**: CORS restrictions on image servers

**Impact**: 
- Only ~5 out of 10 images successfully cache
- Others show colored fallback thumbnails

**Workaround**:
- CORS proxy (api.allorigins.win) helps but not 100%
- Colored fallbacks ensure good UX

**Not Fixable Client-Side**: Server must allow `Access-Control-Allow-Origin`

### 2. **Storage Limitations**

**Browser Limits**:
- Chrome: ~60% of available disk space
- Firefox: ~50 MB without user permission
- Safari: ~50 MB

**Impact**: ~50-100 MB total storage

**Solution**:
- Auto-cleanup: Deletes old articles when fetching new
- Keep latest 10 batches

### 3. **Service Worker Update Delay**

**Behavior**: New version doesn't apply until next page load

**Impact**: User must refresh twice to see updates

**Mitigation**: Version number in cache name forces update

### 4. **API Rate Limits**

**Event Registry Free Tier**:
- 500 requests/day
- 10 articles per request

**Impact**: ~50 syncs per day max

**Solution**: Manual sync button (no auto-refresh)

### 5. **Mobile Safari IndexedDB**

**Issue**: IndexedDB cleared if storage pressure

**Impact**: May lose cached articles on iOS

**Mitigation**: Re-sync when needed

---

## 🎓 Educational Value

This project demonstrates proficiency in:

### **Web Technologies**
- ✅ HTML5 semantic markup
- ✅ CSS3 advanced features (variables, flexbox, grid)
- ✅ ES6+ JavaScript (async/await, modules, arrow functions)
- ✅ DOM manipulation and event handling
- ✅ Responsive web design

### **Progressive Web Apps**
- ✅ Service Worker lifecycle
- ✅ Cache strategies (cache-first, network-first)
- ✅ Offline-first architecture
- ✅ Web App Manifest
- ✅ Installation flows

### **Client-Side Storage**
- ✅ IndexedDB API
- ✅ Complex data structures
- ✅ Binary data (base64 images)
- ✅ Transaction management
- ✅ Storage optimization

### **API Integration**
- ✅ RESTful API consumption
- ✅ POST requests with JSON
- ✅ Response transformation
- ✅ Error handling
- ✅ Timeout management

### **Async Programming**
- ✅ Promises and Promise.allSettled
- ✅ Async/await patterns
- ✅ Parallel execution
- ✅ Error propagation
- ✅ Race conditions handling

### **Performance Optimization**
- ✅ Lazy loading (background caching)
- ✅ Debouncing (search)
- ✅ Efficient rendering
- ✅ Minimal reflows/repaints
- ✅ Network optimization

### **UX/UI Design**
- ✅ Responsive layouts
- ✅ Loading states
- ✅ Error feedback
- ✅ Progressive enhancement
- ✅ Accessibility considerations

### **Problem Solving**
- ✅ CORS workarounds
- ✅ Fallback strategies
- ✅ Error resilience
- ✅ Edge case handling
- ✅ Browser compatibility

### **Software Engineering**
- ✅ Code organization
- ✅ Separation of concerns
- ✅ Reusable functions
- ✅ Clear naming conventions
- ✅ Documentation

---

## 👨‍💻 Author

**Vaibhav Goel**  
Computer Science Engineering — Semester 1  
On-Job Training (OJT) Project  
December 2025

**Contact**: [Your Email/GitHub]  
**Institution**: [Your College Name]

---

## 📄 License

This project is created for educational purposes as part of the OJT curriculum. Feel free to use and modify for learning purposes.

---

## 🙏 Acknowledgments

- **Event Registry** for providing comprehensive news API
- **AllOrigins** for CORS proxy service enabling image caching
- **MDN Web Docs** for excellent PWA and Web API documentation
- **Google Developers** for Service Worker best practices
- **Can I Use** for browser compatibility information

---

## 📚 Further Reading

- [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [CORS Explained](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Event Registry API Docs](https://eventregistry.org/documentation)

---

**Last Updated**: December 4, 2025  
**Version**: 1.0  
**Service Worker Version**: v29
