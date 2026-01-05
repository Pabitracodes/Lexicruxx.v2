// LexiCruxx - Enhanced Dictionary Application with Improved API Handling
class LexiCruxx {
    constructor() {
        // Primary API endpoint
        this.API_PRIMARY = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
        // Fallback API endpoint
        this.API_FALLBACK = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
        // API retry configuration
        this.MAX_RETRIES = 2;
        this.RETRY_DELAY = 1000; // 1 second
        
        // Current word data
        this.currentWord = null;
        this.currentAudio = null;
        
        // Local storage data
        this.searchHistory = this.getStorageData('lexicruxx_history') || [];
        this.favorites = this.getStorageData('lexicruxx_favorites') || [];
        
        // Sample words for "Word of the Day"
        this.sampleWords = [
            'serendipity', 'eloquence', 'ephemeral', 'luminous', 'mellifluous', 
            'petrichor', 'wanderlust', 'solitude', 'ethereal', 'nostalgia', 
            'ubiquitous', 'serenity', 'effervescent', 'languid', 'pristine', 
            'quintessential', 'resplendent', 'tranquil', 'vivacious', 'whimsical',
            'aesthetic', 'benevolent', 'cacophony', 'diligent', 'empathy',
            'fortitude', 'gregarious', 'halcyon', 'ineffable', 'jubilant'
        ];

        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => this.setupApp(), 100);
            });
        } else {
            setTimeout(() => this.setupApp(), 100);
        }
    }

    setupApp() {
        this.bindEvents();
        this.loadWordOfTheDay();
        this.updateHistoryPanel();
        this.updateFavoritesPanel();
        
        // Auto-load a sample word
        setTimeout(() => {
            this.searchWord('serendipity');
        }, 1500);
    }

    bindEvents() {
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        
        if (searchBtn) {
            searchBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleSearch();
            });
        }

        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleSearch();
                }
            });

            searchInput.addEventListener('focus', () => {
                const wrapper = searchInput.closest('.search-input-wrapper');
                if (wrapper) wrapper.classList.add('focused');
            });

            searchInput.addEventListener('blur', () => {
                const wrapper = searchInput.closest('.search-input-wrapper');
                if (wrapper) wrapper.classList.remove('focused');
            });
        }

        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === '/' && !e.ctrlKey && !e.metaKey && e.target.tagName !== 'INPUT') {
                e.preventDefault();
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
            }
            
            if (e.key === 'Escape') {
                this.closeAllPanels();
            }
        });

        this.bindPanelEvents();
        this.bindWordActionEvents();

        const tryAgainBtn = document.getElementById('tryAgainBtn');
        if (tryAgainBtn) {
            tryAgainBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (searchInput) searchInput.focus();
                this.hideError();
            });
        }
    }

    bindPanelEvents() {
        const historyBtn = document.getElementById('historyBtn');
        const favoritesBtn = document.getElementById('favoritesBtn');
        const closeHistoryBtn = document.getElementById('closeHistoryBtn');
        const closeFavoritesBtn = document.getElementById('closeFavoritesBtn');
        const clearHistoryBtn = document.getElementById('clearHistoryBtn');
        const clearFavoritesBtn = document.getElementById('clearFavoritesBtn');
        const overlay = document.getElementById('overlay');

        if (historyBtn) {
            historyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.togglePanel('history');
            });
        }

        if (favoritesBtn) {
            favoritesBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.togglePanel('favorites');
            });
        }

        if (closeHistoryBtn) {
            closeHistoryBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.closePanel('history');
            });
        }

        if (closeFavoritesBtn) {
            closeFavoritesBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.closePanel('favorites');
            });
        }

        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.clearHistory();
            });
        }

        if (clearFavoritesBtn) {
            clearFavoritesBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.clearFavorites();
            });
        }

        if (overlay) {
            overlay.addEventListener('click', () => this.closeAllPanels());
        }
    }

    bindWordActionEvents() {
        const pronounceBtn = document.getElementById('pronounceBtn');
        const favoriteBtn = document.getElementById('favoriteBtn');

        if (pronounceBtn) {
            pronounceBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.pronounceWord();
            });
        }

        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleFavorite();
            });
        }
    }

    async loadWordOfTheDay() {
        const today = new Date().toDateString();
        const savedWordOfDay = this.getStorageData('lexicruxx_word_of_day');
        
        if (savedWordOfDay && savedWordOfDay.date === today) {
            this.displayWordOfDay(savedWordOfDay.data);
            return;
        }

        const randomWord = this.sampleWords[Math.floor(Math.random() * this.sampleWords.length)];
        
        try {
            const data = await this.fetchWordDataWithRetry(randomWord);
            const wordOfDayData = { date: today, data };
            localStorage.setItem('lexicruxx_word_of_day', JSON.stringify(wordOfDayData));
            this.displayWordOfDay(data);
        } catch (error) {
            console.error('Error loading word of the day:', error);
            this.displayWordOfDayFallback();
        }
    }

    displayWordOfDay(data) {
        const content = document.getElementById('wordOfDayContent');
        if (!content) return;

        const wordData = data[0];
        const meaning = wordData.meanings[0];
        const definition = meaning.definitions[0];

        content.innerHTML = `
            <div class="word-of-day-content">
                <h3 class="word-of-day-word" onclick="window.appInstance.searchWord('${wordData.word}')">${wordData.word}</h3>
                <p class="word-of-day-phonetic">${wordData.phonetic || this.getPhoneticFromMeanings(wordData.meanings) || ''}</p>
                <div class="word-of-day-meaning">
                    <span class="part-of-speech">${meaning.partOfSpeech}</span>
                    <p class="definition-text">${definition.definition}</p>
                    ${definition.example ? `<p class="example">"${definition.example}"</p>` : ''}
                </div>
                <button class="btn btn--outline btn--sm" onclick="window.appInstance.searchWord('${wordData.word}')">
                    🔍 Explore this word
                </button>
            </div>
        `;
    }

    displayWordOfDayFallback() {
        const content = document.getElementById('wordOfDayContent');
        if (!content) return;

        content.innerHTML = `
            <div class="word-of-day-content">
                <h3 class="word-of-day-word" onclick="window.appInstance.searchWord('serendipity')">serendipity</h3>
                <p class="word-of-day-phonetic">/ˌsɛrənˈdɪpɪti/</p>
                <div class="word-of-day-meaning">
                    <span class="part-of-speech">noun</span>
                    <p class="definition-text">The occurrence and development of events by chance in a happy or beneficial way.</p>
                    <p class="example">"A fortunate stroke of serendipity brought the two old friends together."</p>
                </div>
                <button class="btn btn--outline btn--sm" onclick="window.appInstance.searchWord('serendipity')">
                    🔍 Explore this word
                </button>
            </div>
        `;
    }

    async handleSearch() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;

        const query = searchInput.value.trim();

        if (!query) {
            this.showError('Please enter a word to search.');
            return;
        }

        this.showLoading();
        this.hideError();

        try {
            const data = await this.fetchWordDataWithRetry(query);
            this.displayResults(data);
            this.addToHistory(query.toLowerCase());
            this.updateHistoryPanel();
        } catch (error) {
            this.hideLoading();
            this.showError(`Sorry, we couldn't find "${query}". Please check your spelling and try again.`);
        }
    }

    async fetchWordDataWithRetry(word, retryCount = 0) {
        try {
            const response = await fetch(`${this.API_PRIMARY}${encodeURIComponent(word.toLowerCase())}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                // Add timeout
                signal: AbortSignal.timeout(10000) // 10 second timeout
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Word not found');
                }
                throw new Error(`API error: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`Fetch attempt ${retryCount + 1} failed:`, error);
            
            // Retry logic
            if (retryCount < this.MAX_RETRIES) {
                console.log(`Retrying in ${this.RETRY_DELAY}ms...`);
                await this.sleep(this.RETRY_DELAY);
                return this.fetchWordDataWithRetry(word, retryCount + 1);
            }
            
            // If all retries failed, throw error
            throw error;
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    displayResults(data) {
        this.hideLoading();
        this.currentWord = data[0];
        
        const resultsSection = document.getElementById('resultsSection');
        const resultWord = document.getElementById('resultWord');
        const phoneticText = document.getElementById('phoneticText');
        const resultsContent = document.getElementById('resultsContent');

        if (!resultsSection || !resultWord || !phoneticText || !resultsContent) return;

        resultWord.textContent = this.currentWord.word;
        phoneticText.textContent = this.currentWord.phonetic || this.getPhoneticFromMeanings(this.currentWord.meanings) || '';

        this.updateFavoriteButton();

        let definitionsHTML = '';
        
        this.currentWord.meanings.forEach((meaning) => {
            definitionsHTML += `
                <div class="definition-group">
                    <div class="part-of-speech">${meaning.partOfSpeech}</div>
                    <div class="definition-list">
            `;

            meaning.definitions.forEach((def) => {
                definitionsHTML += `
                    <div class="definition-item">
                        <div class="definition-text">${def.definition}</div>
                        ${def.example ? `<div class="example">"${def.example}"</div>` : ''}
                    </div>
                `;
            });

            definitionsHTML += '</div></div>';
        });

        const synonyms = this.extractRelatedWords('synonyms');
        const antonyms = this.extractRelatedWords('antonyms');

        if (synonyms.length > 0 || antonyms.length > 0) {
            definitionsHTML += '<div class="word-relations">';
            
            if (synonyms.length > 0) {
                definitionsHTML += `
                    <div class="word-relation-group">
                        <h4>📝 Synonyms</h4>
                        <div class="word-tags">
                            ${synonyms.map(word => `<span class="word-tag" onclick="window.appInstance.searchWord('${word}')">${word}</span>`).join('')}
                        </div>
                    </div>
                `;
            }

            if (antonyms.length > 0) {
                definitionsHTML += `
                    <div class="word-relation-group">
                        <h4>🔄 Antonyms</h4>
                        <div class="word-tags">
                            ${antonyms.map(word => `<span class="word-tag" onclick="window.appInstance.searchWord('${word}')">${word}</span>`).join('')}
                        </div>
                    </div>
                `;
            }

            definitionsHTML += '</div>';
        }

        resultsContent.innerHTML = definitionsHTML;
        resultsSection.classList.add('visible');

        setTimeout(() => {
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }

    getPhoneticFromMeanings(meanings) {
        if (!meanings) return '';
        for (const meaning of meanings) {
            if (meaning.phonetic) return meaning.phonetic;
        }
        return '';
    }

    extractRelatedWords(type) {
        const words = new Set();
        if (!this.currentWord?.meanings) return [];
        
        this.currentWord.meanings.forEach(meaning => {
            meaning.definitions.forEach(def => {
                if (def[type]) {
                    def[type].forEach(word => words.add(word));
                }
            });
            if (meaning[type]) {
                meaning[type].forEach(word => words.add(word));
            }
        });
        return Array.from(words).slice(0, 8);
    }

    async pronounceWord() {
        if (!this.currentWord) return;

        const pronounceBtn = document.getElementById('pronounceBtn');
        if (!pronounceBtn) return;

        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }

        const originalHTML = pronounceBtn.innerHTML;
        pronounceBtn.innerHTML = '<span style="animation: pulse 1s infinite;">🔊</span>';
        pronounceBtn.disabled = true;

        let audioUrl = null;
        
        if (this.currentWord.phonetics) {
            for (const phonetic of this.currentWord.phonetics) {
                if (phonetic.audio && phonetic.audio.trim()) {
                    audioUrl = phonetic.audio;
                    break;
                }
            }
        }

        const resetButton = () => {
            pronounceBtn.innerHTML = originalHTML;
            pronounceBtn.disabled = false;
        };

        if (audioUrl) {
            try {
                this.currentAudio = new Audio(audioUrl);
                
                this.currentAudio.addEventListener('loadeddata', () => {
                    this.currentAudio.play().catch(() => {
                        this.fallbackPronunciation();
                    });
                });

                this.currentAudio.addEventListener('ended', resetButton);
                this.currentAudio.addEventListener('error', () => {
                    this.fallbackPronunciation();
                    resetButton();
                });

                setTimeout(() => {
                    if (this.currentAudio && this.currentAudio.readyState === 0) {
                        this.fallbackPronunciation();
                        resetButton();
                    }
                }, 3000);

            } catch (error) {
                this.fallbackPronunciation();
                resetButton();
            }
        } else {
            this.fallbackPronunciation();
            resetButton();
        }
    }

    fallbackPronunciation() {
        if ('speechSynthesis' in window && this.currentWord) {
            try {
                const utterance = new SpeechSynthesisUtterance(this.currentWord.word);
                utterance.rate = 0.8;
                utterance.pitch = 1;
                utterance.volume = 0.8;
                
                const voices = speechSynthesis.getVoices();
                const preferredVoice = voices.find(voice => 
                    voice.lang.startsWith('en') && (voice.name.includes('Google') || voice.name.includes('Microsoft'))
                );
                if (preferredVoice) {
                    utterance.voice = preferredVoice;
                }
                
                speechSynthesis.speak(utterance);
            } catch (error) {
                console.error('Speech synthesis failed:', error);
            }
        }
    }

    toggleFavorite() {
        if (!this.currentWord) return;

        const word = this.currentWord.word.toLowerCase();
        const existingIndex = this.favorites.findIndex(fav => fav.word === word);

        if (existingIndex > -1) {
            this.favorites.splice(existingIndex, 1);
        } else {
            this.favorites.unshift({
                word: word,
                timestamp: Date.now(),
                phonetic: this.currentWord.phonetic || this.getPhoneticFromMeanings(this.currentWord.meanings) || '',
                definition: this.currentWord.meanings[0]?.definitions[0]?.definition || ''
            });
        }

        this.saveStorageData('lexicruxx_favorites', this.favorites);
        this.updateFavoriteButton();
        this.updateFavoritesPanel();
    }

    updateFavoriteButton() {
        const favoriteBtn = document.getElementById('favoriteBtn');
        if (!favoriteBtn) return;

        const word = this.currentWord?.word?.toLowerCase();
        const isFavorited = word && this.favorites.some(fav => fav.word === word);
        
        if (isFavorited) {
            favoriteBtn.classList.add('favorited');
            favoriteBtn.innerHTML = '<span class="heart-icon">❤️</span>';
            favoriteBtn.title = 'Remove from favorites';
        } else {
            favoriteBtn.classList.remove('favorited');
            favoriteBtn.innerHTML = '<span class="heart-icon">🤍</span>';
            favoriteBtn.title = 'Add to favorites';
        }
    }

    addToHistory(word) {
        this.searchHistory = this.searchHistory.filter(item => item.word !== word);
        
        this.searchHistory.unshift({
            word: word,
            timestamp: Date.now()
        });

        this.searchHistory = this.searchHistory.slice(0, 50);
        
        this.saveStorageData('lexicruxx_history', this.searchHistory);
    }

    updateHistoryPanel() {
        const historyContent = document.getElementById('historyContent');
        if (!historyContent) return;
        
        if (this.searchHistory.length === 0) {
            historyContent.innerHTML = '<div class="empty-state"><p>No search history yet.<br>Start exploring words!</p></div>';
            return;
        }

        const historyHTML = this.searchHistory.map(item => `
            <div class="history-item" onclick="window.appInstance.searchWord('${item.word}')">
                <div>
                    <div class="item-word">${item.word}</div>
                    <div class="item-time">${this.formatTimestamp(item.timestamp)}</div>
                </div>
                <div class="item-actions">
                    <button class="item-action-btn" onclick="event.stopPropagation(); window.appInstance.removeFromHistory('${item.word}')" title="Remove">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');

        historyContent.innerHTML = historyHTML;
    }

    updateFavoritesPanel() {
        const favoritesContent = document.getElementById('favoritesContent');
        if (!favoritesContent) return;
        
        if (this.favorites.length === 0) {
            favoritesContent.innerHTML = '<div class="empty-state"><p>No favorite words yet.<br>Add some by clicking the heart icon!</p></div>';
            return;
        }

        const favoritesHTML = this.favorites.map(item => `
            <div class="favorite-item" onclick="window.appInstance.searchWord('${item.word}')">
                <div>
                    <div class="item-word">${item.word}</div>
                    <div class="item-time">${this.formatTimestamp(item.timestamp)}</div>
                    ${item.definition ? `<div class="item-definition">${item.definition.substring(0, 60)}${item.definition.length > 60 ? '...' : ''}</div>` : ''}
                </div>
                <div class="item-actions">
                    <button class="item-action-btn" onclick="event.stopPropagation(); window.appInstance.removeFromFavorites('${item.word}')" title="Remove">
                        💔
                    </button>
                </div>
            </div>
        `).join('');

        favoritesContent.innerHTML = favoritesHTML;
    }

    removeFromHistory(word) {
        this.searchHistory = this.searchHistory.filter(item => item.word !== word);
        this.saveStorageData('lexicruxx_history', this.searchHistory);
        this.updateHistoryPanel();
    }

    removeFromFavorites(word) {
        this.favorites = this.favorites.filter(item => item.word !== word);
        this.saveStorageData('lexicruxx_favorites', this.favorites);
        this.updateFavoritesPanel();
        this.updateFavoriteButton();
    }

    clearHistory() {
        if (confirm('Are you sure you want to clear your search history?')) {
            this.searchHistory = [];
            this.saveStorageData('lexicruxx_history', this.searchHistory);
            this.updateHistoryPanel();
        }
    }

    clearFavorites() {
        if (confirm('Are you sure you want to clear your favorite words?')) {
            this.favorites = [];
            this.saveStorageData('lexicruxx_favorites', this.favorites);
            this.updateFavoritesPanel();
            this.updateFavoriteButton();
        }
    }

    searchWord(word) {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = word;
            this.handleSearch();
            this.closeAllPanels();
        }
    }

    togglePanel(panelType) {
        const panel = document.getElementById(`${panelType}Panel`);
        const overlay = document.getElementById('overlay');

        if (!panel || !overlay) return;

        if (panel.classList.contains('visible')) {
            this.closePanel(panelType);
        } else {
            this.closeAllPanels();
            panel.classList.add('visible');
            overlay.classList.add('visible');
        }
    }

    closePanel(panelType) {
        const panel = document.getElementById(`${panelType}Panel`);
        const overlay = document.getElementById('overlay');
        
        if (panel) panel.classList.remove('visible');
        if (overlay && !document.querySelector('.side-panel.visible')) {
            overlay.classList.remove('visible');
        }
    }

    closeAllPanels() {
        const panels = ['historyPanel', 'favoritesPanel'];
        const overlay = document.getElementById('overlay');
        
        panels.forEach(panelId => {
            const panel = document.getElementById(panelId);
            if (panel) panel.classList.remove('visible');
        });
        if (overlay) overlay.classList.remove('visible');
    }

    showLoading() {
        const loadingState = document.getElementById('loadingState');
        const resultsSection = document.getElementById('resultsSection');
        const errorState = document.getElementById('errorState');

        if (loadingState) loadingState.classList.add('visible');
        if (resultsSection) resultsSection.classList.remove('visible');
        if (errorState) errorState.classList.remove('visible');
    }

    hideLoading() {
        const loadingState = document.getElementById('loadingState');
        if (loadingState) loadingState.classList.remove('visible');
    }

    showError(message) {
        const errorMessage = document.getElementById('errorMessage');
        const errorState = document.getElementById('errorState');
        const resultsSection = document.getElementById('resultsSection');
        const loadingState = document.getElementById('loadingState');

        if (errorMessage) errorMessage.textContent = message;
        if (errorState) errorState.classList.add('visible');
        if (resultsSection) resultsSection.classList.remove('visible');
        if (loadingState) loadingState.classList.remove('visible');
    }

    hideError() {
        const errorState = document.getElementById('errorState');
        if (errorState) errorState.classList.remove('visible');
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        
        return date.toLocaleDateString();
    }

    getStorageData(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return null;
        }
    }

    saveStorageData(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }
}

// CSS Animation styles injection
const animationStyles = `
@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = animationStyles;
document.head.appendChild(styleSheet);

// Initialize app
let appInstance;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        appInstance = new LexiCruxx();
        window.appInstance = appInstance;
    });
} else {
    appInstance = new LexiCruxx();
    window.appInstance = appInstance;
}

// Global click listener for dynamic elements
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('word-tag') || e.target.classList.contains('word-of-day-word')) {
        const word = e.target.textContent.trim();
        if (word && window.appInstance) {
            window.appInstance.searchWord(word);
        }
    }
});

// Handle speech synthesis voices loading
if ('speechSynthesis' in window) {
    speechSynthesis.addEventListener('voiceschanged', () => {
        // Voices are now loaded
    });
}