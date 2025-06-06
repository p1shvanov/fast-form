// Global variables
let currentLanguage = 'ru';
let questionsData = null;
let resultsData = null;

// Configuration
const CONFIG = {
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbymL7bS72Qdn1TbmnRZxpEhkbwaz6NeUz8WP4rOMYXqQhJy0RJ-AmSVO09sWiY4s2HtTQ/exec', // Replace with actual Google Apps Script URL
    REFRESH_INTERVAL: 30000, // Auto-refresh every 30 seconds (optional)
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000
};

// Initialize the results page
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Initializing results page...');
    
    try {
        console.log('📄 Loading questions...');
        await loadQuestions();
        console.log('✅ Questions loaded');
        
        console.log('📊 Loading results...');
        await loadResults();
        console.log('✅ Results loaded');
        
        console.log('🎛 Setting up event listeners...');
        initializeEventListeners();
        
        console.log('🌐 Updating language...');
        updateLanguage();
        
        console.log('🎨 Rendering results...');
        renderResults();
        
        console.log('✅ Results page initialized successfully');
        
        // Optional: Auto-refresh (uncomment if needed)
        // setInterval(loadAndUpdateResults, CONFIG.REFRESH_INTERVAL);
    } catch (error) {
        console.error('❌ Failed to initialize results:', error);
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
        console.log('Loading results from Google Sheets...');
        
        const response = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=getResults`, {
            method: 'GET'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const responseText = await response.text();
        console.log('Raw response:', responseText);
        
        try {
            resultsData = JSON.parse(responseText);
            console.log('Results parsed successfully:', resultsData);
            console.log('Results type:', typeof resultsData);
            console.log('Responses count:', resultsData?.responses?.length);
        } catch (parseError) {
            console.error('Failed to parse JSON:', parseError);
            console.error('Response text:', responseText);
            throw parseError;
        }
        
    } catch (error) {
        console.error('Error loading results:', error);
        
        // Retry logic
        if (retryCount < CONFIG.MAX_RETRIES) {
            console.log(`Retrying results load (attempt ${retryCount + 1}/${CONFIG.MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
            return loadResults(retryCount + 1);
        }
        
        // If all retries fail, use mock data for development
        console.log('Using mock data due to connection issues');
        resultsData = generateMockResults();
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
    if (langToggle) {
        langToggle.addEventListener('click', toggleLanguage);
        console.log('Language toggle initialized');
    } else {
        console.error('Element with ID "langToggle" not found');
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshResults);
        console.log('Refresh button initialized');
    } else {
        console.error('Element with ID "refreshBtn" not found');
    }
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
    if (langToggle) {
        langToggle.textContent = currentLanguage === 'ru' ? 'EN' : 'RU';
    }
    
    // Update all elements with data attributes (but preserve child elements)
    const elements = document.querySelectorAll('[data-ru][data-en]');
    elements.forEach(element => {
        const newText = currentLanguage === 'ru' ? element.getAttribute('data-ru') : element.getAttribute('data-en');
        
        // Special handling for elements that contain other elements
        if (element.classList.contains('total-responses')) {
            // For total-responses, preserve the span element
            const span = element.querySelector('span');
            if (span) {
                element.innerHTML = newText + ' ' + span.outerHTML;
            } else {
                element.textContent = newText;
            }
        } else if (element.children.length > 0) {
            // For other elements with children, be more careful
            const childElements = Array.from(element.children);
            element.textContent = newText;
            // Re-append child elements if they don't have their own text content
            childElements.forEach(child => {
                if (!child.hasAttribute('data-ru') && !child.hasAttribute('data-en')) {
                    element.appendChild(child);
                }
            });
        } else {
            // For simple elements without children, just update text
            element.textContent = newText;
        }
    });
    
    // Update placeholders
    const elementsWithPlaceholder = document.querySelectorAll('[data-placeholder-ru][data-placeholder-en]');
    elementsWithPlaceholder.forEach(element => {
        if (currentLanguage === 'ru') {
            element.placeholder = element.getAttribute('data-placeholder-ru');
        } else {
            element.placeholder = element.getAttribute('data-placeholder-en');
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
    console.log('renderResults called');
    console.log('resultsData:', resultsData);
    console.log('questionsData:', questionsData);
    
    if (!resultsData || !questionsData) {
        console.error('Missing data:', { resultsData: !!resultsData, questionsData: !!questionsData });
        return;
    }
    
    try {
        hideLoading();
        showResultsContainer();
        updateTotalResponses();
        renderQuestionResults();
        renderFeedbackResults();
        console.log('Results rendered successfully');
    } catch (error) {
        console.error('Error rendering results:', error);
        showError();
    }
}

// Update total responses count
function updateTotalResponses() {
    console.log('🔍 Looking for totalResponses element...');
    
    // Try multiple ways to find the element
    const totalElement = document.getElementById('totalResponses');
    const querySelector = document.querySelector('#totalResponses');
    const spanElement = document.querySelector('.total-responses span');
    const classElement = document.querySelector('.total-count');
    
    // Find the element
    const element = totalElement || querySelector || spanElement || classElement;
    
    if (!element) {
        console.error('❌ Cannot find totalResponses element anywhere');
        
        // Create a fallback notification
        const header = document.querySelector('.results-meta');
        if (header) {
            const fallbackElement = document.createElement('div');
            fallbackElement.style.cssText = 'background: #e3f2fd; padding: 8px 12px; border-radius: 4px; margin: 10px 0; color: #1565c0; font-weight: 500;';
            fallbackElement.textContent = `📊 Всего ответов: ${resultsData.totalCount || resultsData.responses.length}`;
            header.appendChild(fallbackElement);
            console.log('✅ Created fallback total responses display');
        }
        
        return;
    }
    
    const count = resultsData.totalCount || resultsData.responses.length;
    console.log('✅ Found element, updating total responses count to:', count);
    element.textContent = count;
}

// Render question results
function renderQuestionResults() {
    const container = document.getElementById('questionsResults');
    if (!container) {
        console.error('Element with ID "questionsResults" not found');
        return;
    }
    
    console.log('Rendering question results...');
    container.innerHTML = '';
    
    questionsData.questions.forEach(question => {
        const stats = calculateQuestionStats(question.id);
        const resultElement = createQuestionResultElement(question, stats);
        container.appendChild(resultElement);
    });
    
    console.log('Question results rendered');
}

// Calculate statistics for a question
function calculateQuestionStats(questionId) {
    console.log(`Calculating stats for question ${questionId}`);
    
    if (!resultsData || !resultsData.responses) {
        console.error('No results data available');
        return { totalAnswers: 0, yesCount: 0, noCount: 0, yesPercentage: 0, noPercentage: 0 };
    }
    
    const answers = resultsData.responses
        .map(response => response.answers[`question_${questionId}`])
        .filter(answer => answer);
    
    console.log(`Question ${questionId} answers:`, answers);
    
    const totalAnswers = answers.length;
    const yesCount = answers.filter(answer => answer === 'yes').length;
    const noCount = answers.filter(answer => answer === 'no').length;
    
    const stats = {
        totalAnswers,
        yesCount,
        noCount,
        yesPercentage: totalAnswers > 0 ? Math.round((yesCount / totalAnswers) * 100) : 0,
        noPercentage: totalAnswers > 0 ? Math.round((noCount / totalAnswers) * 100) : 0
    };
    
    console.log(`Question ${questionId} stats:`, stats);
    return stats;
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
    if (!container) {
        console.error('Element with ID "feedbackResults" not found');
        return;
    }
    
    console.log('Rendering feedback results...');
    container.innerHTML = '';
    
    const feedbacks = resultsData.responses
        .map(response => response.feedback)
        .filter(feedback => {
            if (!feedback) return false;
            // Convert to string if it's a number, then check if it has content
            const feedbackStr = String(feedback).trim();
            return feedbackStr.length > 0;
        })
        .map(feedback => String(feedback)); // Ensure all feedbacks are strings
    
    console.log('Filtered feedbacks:', feedbacks);
    
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
    
    console.log('Feedback results rendered');
}

// Show/hide UI elements
function hideLoading() {
    const loading = document.getElementById('loadingResults');
    if (!loading) {
        console.error('Element with ID "loadingResults" not found');
        return;
    }
    loading.style.display = 'none';
}

function showResultsContainer() {
    const container = document.getElementById('resultsContainer');
    if (!container) {
        console.error('Element with ID "resultsContainer" not found');
        return;
    }
    
    console.log('📦 Showing results container');
    console.log('🔍 Container before show:', container.innerHTML.length, 'characters');
    container.style.display = 'block';
    
    // Check if header elements are still there after showing container
    setTimeout(() => {
        const afterElement = document.getElementById('totalResponses');
        const afterSpans = document.querySelectorAll('span').length;
        console.log('🔍 After showing container - totalResponses:', !!afterElement);
        console.log('🔍 After showing container - span count:', afterSpans);
    }, 10);
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