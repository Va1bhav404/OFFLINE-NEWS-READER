// IndexedDB Helper Functions for News Reader
const DB_NAME = 'NewsReaderDB';
const DB_VERSION = 1;
const ARTICLES_STORE = 'articles';
const QUEUE_STORE = 'readingQueue';
const METADATA_STORE = 'metadata';

let db = null;

// Initialize IndexedDB
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('IndexedDB failed to open:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            console.log('IndexedDB initialized successfully');
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            db = event.target.result;

            // Articles store
            if (!db.objectStoreNames.contains(ARTICLES_STORE)) {
                const articlesStore = db.createObjectStore(ARTICLES_STORE, { keyPath: 'url' });
                articlesStore.createIndex('batchId', 'batchId', { unique: false });
                articlesStore.createIndex('publishedAt', 'publishedAt', { unique: false });
            }

            // Reading Queue store
            if (!db.objectStoreNames.contains(QUEUE_STORE)) {
                const queueStore = db.createObjectStore(QUEUE_STORE, { keyPath: 'url' });
                queueStore.createIndex('addedAt', 'addedAt', { unique: false });
            }

            // Metadata store (for batch tracking)
            if (!db.objectStoreNames.contains(METADATA_STORE)) {
                db.createObjectStore(METADATA_STORE, { keyPath: 'key' });
            }

            console.log('IndexedDB schema created');
        };
    });
}

// Save articles to IndexedDB with batch ID
async function saveArticles(articles, batchId) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([ARTICLES_STORE], 'readwrite');
        const store = transaction.objectStore(ARTICLES_STORE);

        articles.forEach(article => {
            article.batchId = batchId; // Tag with batch ID
            store.put(article);
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

// Get all articles
async function getAllArticles() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([ARTICLES_STORE], 'readonly');
        const store = transaction.objectStore(ARTICLES_STORE);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Get articles by batch ID
async function getArticlesByBatch(batchId) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([ARTICLES_STORE], 'readonly');
        const store = transaction.objectStore(ARTICLES_STORE);
        const index = store.index('batchId');
        const request = index.getAll(batchId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Add article to reading queue
async function addToQueue(article) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([QUEUE_STORE], 'readwrite');
        const store = transaction.objectStore(QUEUE_STORE);

        const queueItem = {
            ...article,
            addedAt: new Date().toISOString()
        };

        const request = store.put(queueItem);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Remove article from reading queue
async function removeFromQueue(articleUrl) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([QUEUE_STORE], 'readwrite');
        const store = transaction.objectStore(QUEUE_STORE);
        const request = store.delete(articleUrl);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Get all reading queue items
async function getReadingQueue() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([QUEUE_STORE], 'readonly');
        const store = transaction.objectStore(QUEUE_STORE);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Check if article is in queue
async function isInQueue(articleUrl) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([QUEUE_STORE], 'readonly');
        const store = transaction.objectStore(QUEUE_STORE);
        const request = store.get(articleUrl);

        request.onsuccess = () => resolve(!!request.result);
        request.onerror = () => reject(request.error);
    });
}

// Save metadata (like latest batch ID)
async function saveMetadata(key, value) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([METADATA_STORE], 'readwrite');
        const store = transaction.objectStore(METADATA_STORE);
        const request = store.put({ key, value });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Get metadata
async function getMetadata(key) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([METADATA_STORE], 'readonly');
        const store = transaction.objectStore(METADATA_STORE);
        const request = store.get(key);

        request.onsuccess = () => resolve(request.result?.value);
        request.onerror = () => reject(request.error);
    });
}

// Clear all articles (useful for testing)
async function clearArticles() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([ARTICLES_STORE], 'readwrite');
        const store = transaction.objectStore(ARTICLES_STORE);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}
