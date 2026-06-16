// BigQuery Release Hub - Frontend Controller

document.addEventListener('DOMContentLoaded', () => {
    // State Management
    let rawFeedData = [];
    let flattenedUpdates = [];
    let activeCategory = 'all';
    let searchQuery = '';
    let activeSort = 'newest';

    // DOM Elements
    const refreshBtn = document.getElementById('refresh-btn');
    const lastSyncedTime = document.getElementById('last-synced-time');
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');
    const emptyState = document.getElementById('empty-state');
    const feedList = document.getElementById('feed-list');
    const retryBtn = document.getElementById('retry-btn');
    
    // Stats elements
    const statFeatures = document.getElementById('stat-features');
    const statIssues = document.getElementById('stat-issues');
    const statOthers = document.getElementById('stat-others');
    const statDays = document.getElementById('stat-days');

    // Controls
    const searchInput = document.getElementById('search-input');
    const searchClearBtn = document.getElementById('search-clear-btn');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const categoryFilters = document.getElementById('category-filters');
    const sortSelect = document.getElementById('sort-select');

    // Modal
    const tweetModal = document.getElementById('tweet-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
    const submitTweetBtn = document.getElementById('submit-tweet-btn');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCount = document.getElementById('char-count');
    const charProgress = document.getElementById('char-progress');
    const tweetPreviewDate = document.getElementById('tweet-preview-date');
    let currentTweetUpdate = null;

    // Toast
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    // Initialize circular progress ring
    const radius = 14;
    const circumference = radius * 2 * Math.PI;
    if (charProgress) {
        charProgress.style.strokeDasharray = `${circumference} ${circumference}`;
        charProgress.style.strokeDashoffset = circumference;
    }

    // 1. Fetch data from API
    async function fetchReleaseNotes(forceRefresh = false) {
        showState('loading');
        
        // Disable refresh button & spin icon
        refreshBtn.disabled = true;
        const spinIcon = refreshBtn.querySelector('.spinner-icon');
        spinIcon.classList.add('spin');

        const url = `/api/release-notes${forceRefresh ? '?refresh=true' : ''}`;
        try {
            const response = await fetch(url);
            const result = await response.json();
            
            if (result.status === 'success') {
                rawFeedData = result.data;
                processData();
                updateStats();
                renderFeed();
                showState('content');
                
                // Update Last Synced Time
                const date = new Date(result.cached_at * 1000);
                lastSyncedTime.textContent = `Synced: ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
            } else {
                throw new Error(result.message || 'Server error occurred');
            }
        } catch (error) {
            console.error('Fetch error:', error);
            errorMessage.textContent = error.message || 'Failed to fetch the release notes feed.';
            showState('error');
        } finally {
            refreshBtn.disabled = false;
            spinIcon.classList.remove('spin');
        }
    }

    // 2. Flatten feed structure into individual updates
    function processData() {
        flattenedUpdates = [];
        
        rawFeedData.forEach(day => {
            if (day.updates && Array.isArray(day.updates)) {
                day.updates.forEach((update, idx) => {
                    flattenedUpdates.push({
                        id: `${day.date.replace(/\s+/g, '_')}_${idx}`,
                        date: day.date,
                        link: day.link,
                        type: update.type || 'Update',
                        html: update.html || '',
                        text: update.text || '',
                        timestamp: new Date(day.updated || day.date).getTime()
                    });
                });
            }
        });
    }

    // 3. Calculate and animate stats
    function updateStats() {
        let features = 0;
        let issues = 0;
        let others = 0;
        
        flattenedUpdates.forEach(update => {
            const typeLower = update.type.toLowerCase();
            if (typeLower === 'feature') features++;
            else if (typeLower === 'issue') issues++;
            else others++;
        });

        animateValue(statFeatures, features);
        animateValue(statIssues, issues);
        animateValue(statOthers, others);
        animateValue(statDays, rawFeedData.length);
    }

    function animateValue(obj, end, duration = 600) {
        if (!obj) return;
        let start = 0;
        let range = end - start;
        let minTimer = 50;
        let stepTime = Math.abs(Math.floor(duration / range));
        
        stepTime = Math.max(stepTime, minTimer);
        
        let startTime = new Date().getTime();
        let endTime = startTime + duration;
        let timer;
        
        function run() {
            let now = new Date().getTime();
            let remaining = Math.max((endTime - now) / duration, 0);
            let value = Math.round(end - (remaining * range));
            obj.innerHTML = value;
            if (value == end) {
                clearInterval(timer);
            }
        }
        
        timer = setInterval(run, stepTime);
        run();
    }

    // 4. Show different feed states (loading, content, error, empty)
    function showState(state) {
        loadingState.style.display = state === 'loading' ? 'flex' : 'none';
        errorState.style.display = state === 'error' ? 'flex' : 'none';
        emptyState.style.display = state === 'empty' ? 'flex' : 'none';
        feedList.style.display = state === 'content' ? 'flex' : 'none';
    }

    // 5. Render feed based on filters, search, and sorting
    function renderFeed() {
        // Apply category filter
        let filtered = flattenedUpdates.filter(update => {
            if (activeCategory === 'all') return true;
            if (activeCategory === 'feature') return update.type.toLowerCase() === 'feature';
            if (activeCategory === 'issue') return update.type.toLowerCase() === 'issue';
            // "other" covers deprecation, change, update, etc.
            return update.type.toLowerCase() !== 'feature' && update.type.toLowerCase() !== 'issue';
        });

        // Apply search query filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(update => {
                return update.text.toLowerCase().includes(query) || 
                       update.type.toLowerCase().includes(query) ||
                       update.date.toLowerCase().includes(query);
            });
        }

        // Apply sorting
        filtered.sort((a, b) => {
            if (activeSort === 'newest') {
                return b.timestamp - a.timestamp;
            } else {
                return a.timestamp - b.timestamp;
            }
        });

        // Handle empty search results
        if (filtered.length === 0) {
            showState('empty');
            return;
        }

        // Render feed items grouped by date
        feedList.innerHTML = '';
        let currentGroupDate = '';
        let currentGroupContainer = null;

        filtered.forEach(update => {
            // Group updates by date
            if (update.date !== currentGroupDate) {
                currentGroupDate = update.date;
                
                // Create Date Header
                const dateHeader = document.createElement('div');
                dateHeader.className = 'date-header';
                dateHeader.innerHTML = `
                    <span class="date-title">${currentGroupDate}</span>
                    <div class="date-line"></div>
                `;
                
                const dateGroup = document.createElement('div');
                dateGroup.className = 'date-group';
                dateGroup.appendChild(dateHeader);
                
                feedList.appendChild(dateGroup);
                currentGroupContainer = dateGroup;
            }

            // Create Update Card
            const card = document.createElement('div');
            card.className = 'update-card';
            
            const badgeClass = getBadgeClass(update.type);
            
            card.innerHTML = `
                <div class="card-header-bar">
                    <div class="card-meta-info">
                        <span class="update-badge ${badgeClass}">${update.type}</span>
                        <span class="card-date">${update.date}</span>
                    </div>
                </div>
                <div class="card-body-content">
                    ${update.html}
                </div>
                <div class="card-actions-bar">
                    <button class="action-icon-btn copy-text-btn" title="Copy Text Only">
                        <i class="fa-regular fa-clipboard"></i>
                    </button>
                    <button class="action-icon-btn copy-link-btn" title="Copy Release Note Link">
                        <i class="fa-solid fa-link"></i>
                    </button>
                    <button class="action-icon-btn tweet-btn-trigger" title="Compose X (Twitter) Post">
                        <i class="fa-brands fa-x-twitter"></i>
                    </button>
                </div>
            `;

            // Event Listeners for actions
            card.querySelector('.copy-text-btn').addEventListener('click', () => {
                copyToClipboard(update.text, 'Plain text copied to clipboard!');
            });

            card.querySelector('.copy-link-btn').addEventListener('click', () => {
                copyToClipboard(update.link, 'Direct release link copied to clipboard!');
            });

            card.querySelector('.tweet-btn-trigger').addEventListener('click', () => {
                openTweetModal(update);
            });

            if (currentGroupContainer) {
                currentGroupContainer.appendChild(card);
            }
        });
        
        showState('content');
    }

    function getBadgeClass(type) {
        const typeLower = type.toLowerCase();
        if (typeLower === 'feature') return 'feat';
        if (typeLower === 'issue') return 'issue';
        return 'other';
    }

    // 6. Clipboard action helper
    function copyToClipboard(text, message) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(message);
        }).catch(err => {
            console.error('Failed to copy: ', err);
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                showToast(message);
            } catch (e) {
                showToast('Failed to copy text.');
            }
            document.body.removeChild(textarea);
        });
    }

    // 7. Toast notification helper
    function showToast(message) {
        toastMessage.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // 8. Tweet Composer Modal logic
    function openTweetModal(update) {
        currentTweetUpdate = update;
        tweetPreviewDate.textContent = update.date;
        
        // Format initial tweet draft
        // Format: "BigQuery [Feature]: Use Gemini Cloud Assist to analyze... \n\nDetails: <URL>"
        const typeLabel = update.type.toUpperCase();
        
        // Max characters available for text is:
        // 280 - (url length + 2 spaces + "Details: " + "BigQuery []: ")
        const prefix = `BigQuery [${typeLabel}]: `;
        const suffix = `\n\nDetails: ${update.link}`;
        const maxTextLen = 280 - (prefix.length + suffix.length);
        
        let mainText = update.text.replace(/\s+/g, ' ').trim();
        if (mainText.length > maxTextLen) {
            mainText = mainText.slice(0, maxTextLen - 3) + '...';
        }
        
        tweetTextarea.value = `${prefix}${mainText}${suffix}`;
        updateCharCount();
        
        tweetModal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Lock background scroll
        tweetTextarea.focus();
    }

    function closeTweetModal() {
        tweetModal.style.display = 'none';
        document.body.style.overflow = '';
        currentTweetUpdate = null;
    }

    function updateCharCount() {
        const text = tweetTextarea.value;
        const len = text.length;
        charCount.textContent = `${len} / 280`;

        // Update progress circle
        const percentage = Math.min(len / 280, 1);
        const offset = circumference - (percentage * circumference);
        charProgress.style.strokeDashoffset = offset;

        // Change color based on length
        if (len > 280) {
            charCount.style.color = 'var(--color-issue)';
            charProgress.style.stroke = 'var(--color-issue)';
            submitTweetBtn.disabled = true;
        } else if (len >= 250) {
            charCount.style.color = '#f59e0b'; // warning orange
            charProgress.style.stroke = '#f59e0b';
            submitTweetBtn.disabled = false;
        } else {
            charCount.style.color = 'var(--text-secondary)';
            charProgress.style.stroke = 'var(--color-feat)';
            submitTweetBtn.disabled = false;
        }
    }

    function submitTweet() {
        const text = tweetTextarea.value;
        if (text.length > 280) return;
        
        const twitterIntentUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterIntentUrl, '_blank');
        closeTweetModal();
        showToast('Opened X (Twitter) Web Intent!');
    }

    // Event Listeners for Tweet Modal
    closeModalBtn.addEventListener('click', closeTweetModal);
    cancelTweetBtn.addEventListener('click', closeTweetModal);
    submitTweetBtn.addEventListener('click', submitTweet);
    tweetTextarea.addEventListener('input', updateCharCount);

    // Close modal on click outside modal-card
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeTweetModal();
        }
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && tweetModal.style.display === 'flex') {
            closeTweetModal();
        }
    });

    // 9. Filtering and Controls Listeners
    categoryFilters.addEventListener('click', (e) => {
        const btn = e.target.closest('.capsule');
        if (!btn) return;
        
        // Update active class
        categoryFilters.querySelectorAll('.capsule').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        
        activeCategory = btn.dataset.type;
        renderFeed();
    });

    sortSelect.addEventListener('change', (e) => {
        activeSort = e.target.value;
        renderFeed();
    });

    // Search Input listeners
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        if (searchQuery) {
            searchClearBtn.style.display = 'flex';
        } else {
            searchClearBtn.style.display = 'none';
        }
        renderFeed();
    });

    searchClearBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        searchClearBtn.style.display = 'none';
        searchInput.focus();
        renderFeed();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        searchClearBtn.style.display = 'none';
        renderFeed();
    });

    // 10. Refresh & Retry Buttons
    refreshBtn.addEventListener('click', () => {
        fetchReleaseNotes(true);
    });

    retryBtn.addEventListener('click', () => {
        fetchReleaseNotes(true);
    });

    // Initial load
    fetchReleaseNotes(false);
});
