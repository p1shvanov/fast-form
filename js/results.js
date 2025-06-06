// Global variables
let currentLanguage = 'ru';
let questionsData = null;
let resultsData = null;

// Configuration
const CONFIG = {
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzRO43hC0nYnFkgKi4YVgcZecITkxAUKr_B81SAOeLY47faKQ2danBOVBIDT4xjSKWKbQ/exec', // Replace with actual Google Apps Script URL
    REFRESH_INTERVAL: 30000, // Auto-refresh every 30 seconds (optional)
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000
};

// Initialize the results page
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await loadQuestions();
        await loadResults();
        initializeEventListeners();
        updateLanguage();
        renderResults();
        
        // Optional: Auto-refresh (uncomment if needed)
        // setInterval(loadAndUpdateResults, CONFIG.REFRESH_INTERVAL);
    } catch (error) {
        console.error('Failed to initialize results:', error);
        showError();
    }
});

// Load questions from JSON file
async function loadQuestions() {
    try {
        const response = await fetch('data/questions.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        questionsData = await response.json();
    } catch (error) {
        console.error('Error loading questions:', error);
        throw error;
    }
}

// Load results from Google Sheets
async function loadResults(retryCount = 0) {
    try {
        const response = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=getResults`, {
            method: 'GET',
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        resultsData = await response.json();
        console.log('Results loaded successfully');
        
    } catch (error) {
        console.error('Error loading results:', error);
        
        // Retry logic
        if (retryCount < CONFIG.MAX_RETRIES) {
            console.log(`Retrying results load (attempt ${retryCount + 1}/${CONFIG.MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
            return loadResults(retryCount + 1);
        }
        
        // If all retries fail, use mock data for development
        resultsData = generateMockResults();
        console.log('Using mock data due to connection issues');
    }
}

// Generate mock results for development/testing
function generateMockResults() {
    const mockAnswers = [];
    const totalResponses = Math.floor(Math.random() * 50) + 10; // 10-60 responses
    
    for (let i = 0; i < totalResponses; i++) {
        const response = {
            timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
            answers: {},
            feedback: Math.random() > 0.7 ? `Тестовый отзыв ${i + 1}` : ''
        };
        
        // Generate random answers
        questionsData.questions.forEach(question => {
            response.answers[`question_${question.id}`] = Math.random() > 0.5 ? 'yes' : 'no';
        });
        
        mockAnswers.push(response);
    }
    
    return {
        responses: mockAnswers,
        totalCount: totalResponses
    };
}

// Initialize event listeners
function initializeEventListeners() {
    // Language toggle
    const langToggle = document.getElementById('langToggle');
    langToggle.addEventListener('click', toggleLanguage);
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    refreshBtn.addEventListener('click', refreshResults);
}

// Toggle language
function toggleLanguage() {
    currentLanguage = currentLanguage === 'ru' ? 'en' : 'ru';
    updateLanguage();
    renderResults(); // Re-render with new language
}

// Update language display
function updateLanguage() {
    const langToggle = document.getElementById('langToggle');
    langToggle.textContent = currentLanguage === 'ru' ? 'EN' : 'RU';
    
    // Update all elements with data attributes
    const elements = document.querySelectorAll('[data-ru][data-en]');
    elements.forEach(element => {
        if (currentLanguage === 'ru') {
            element.textContent = element.getAttribute('data-ru');
        } else {
            element.textContent = element.getAttribute('data-en');
        }
    });
    
    // Update document language
    document.documentElement.lang = currentLanguage;
}

// Refresh results
async function refreshResults() {
    const refreshBtn = document.getElementById('refreshBtn');
    const originalText = refreshBtn.textContent;
    
    try {
        refreshBtn.disabled = true;
        refreshBtn.textContent = currentLanguage === 'ru' ? 'Обновляем...' : 'Refreshing...';
        
        await loadResults();
        renderResults();
        
    } catch (error) {
        console.error('Failed to refresh results:', error);
        alert(currentLanguage === 'ru' 
            ? 'Ошибка обновления данных' 
            : 'Failed to refresh data');
    } finally {
        refreshBtn.disabled = false;
        refreshBtn.textContent = originalText;
    }
}

// Load and update results (for auto-refresh)
async function loadAndUpdateResults() {
    try {
        await loadResults();
        renderResults();
    } catch (error) {
        console.error('Auto-refresh failed:', error);
    }
}

// Render results
function renderResults() {
    if (!resultsData || !questionsData) return;
    
    hideLoading();
    showResultsContainer();
    updateTotalResponses();
    renderQuestionResults();
    renderFeedbackResults();
}

// Update total responses count
function updateTotalResponses() {
    const totalElement = document.getElementById('totalResponses');
    totalElement.textContent = resultsData.totalCount || resultsData.responses.length;
}

// Render question results
function renderQuestionResults() {
    const container = document.getElementById('questionsResults');
    container.innerHTML = '';
    
    questionsData.questions.forEach(question => {
        const stats = calculateQuestionStats(question.id);
        const resultElement = createQuestionResultElement(question, stats);
        container.appendChild(resultElement);
    });
}

// Calculate statistics for a question
function calculateQuestionStats(questionId) {
    const answers = resultsData.responses
        .map(response => response.answers[`question_${questionId}`])
        .filter(answer => answer);
    
    const totalAnswers = answers.length;
    const yesCount = answers.filter(answer => answer === 'yes').length;
    const noCount = answers.filter(answer => answer === 'no').length;
    
    return {
        totalAnswers,
        yesCount,
        noCount,
        yesPercentage: totalAnswers > 0 ? Math.round((yesCount / totalAnswers) * 100) : 0,
        noPercentage: totalAnswers > 0 ? Math.round((noCount / totalAnswers) * 100) : 0
    };
}

// Create question result element
function createQuestionResultElement(question, stats) {
    const resultItem = document.createElement('div');
    resultItem.className = 'result-item';
    
    const questionText = currentLanguage === 'ru' ? question.textRu : question.textEn;
    const yesText = currentLanguage === 'ru' ? questionsData.options.yesRu : questionsData.options.yesEn;
    const noText = currentLanguage === 'ru' ? questionsData.options.noRu : questionsData.options.noEn;
    
    resultItem.innerHTML = `
        <div class="result-question">${questionText}</div>
        <div class="result-stats">
            <div class="stat-item">
                <span class="stat-value">${stats.yesPercentage}%</span>
                <div class="stat-label">${yesText}</div>
            </div>
            <div class="stat-item">
                <span class="stat-value">${stats.noPercentage}%</span>
                <div class="stat-label">${noText}</div>
            </div>
        </div>
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${stats.yesPercentage}%"></div>
        </div>
        <div class="response-count" style="text-align: center; color: #6b7280; font-size: 0.875rem;">
            ${getText(`Ответов: ${stats.totalAnswers}`, `Responses: ${stats.totalAnswers}`)}
        </div>
    `;
    
    return resultItem;
}

// Render feedback results
function renderFeedbackResults() {
    const container = document.getElementById('feedbackResults');
    container.innerHTML = '';
    
    const feedbacks = resultsData.responses
        .map(response => response.feedback)
        .filter(feedback => feedback && feedback.trim().length > 0);
    
    if (feedbacks.length === 0) {
        container.innerHTML = `
            <div class="feedback-item" style="text-align: center; font-style: italic;">
                ${getText('Пока нет отзывов', 'No feedback yet')}
            </div>
        `;
        return;
    }
    
    feedbacks.forEach(feedback => {
        const feedbackElement = document.createElement('div');
        feedbackElement.className = 'feedback-item';
        feedbackElement.textContent = feedback;
        container.appendChild(feedbackElement);
    });
}

// Show/hide UI elements
function hideLoading() {
    const loading = document.getElementById('loadingResults');
    loading.style.display = 'none';
}

function showResultsContainer() {
    const container = document.getElementById('resultsContainer');
    container.style.display = 'block';
}

function showError() {
    const loading = document.getElementById('loadingResults');
    const error = document.getElementById('errorMessage');
    
    loading.style.display = 'none';
    error.style.display = 'block';
}

// Utility function to get current language text
function getText(ruText, enText) {
    return currentLanguage === 'ru' ? ruText : enText;
}

// Format date for display
function formatDate(isoString) {
    const date = new Date(isoString);
    return currentLanguage === 'ru' 
        ? date.toLocaleDateString('ru-RU') + ' ' + date.toLocaleTimeString('ru-RU')
        : date.toLocaleDateString('en-US') + ' ' + date.toLocaleTimeString('en-US');
} 