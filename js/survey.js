// Global variables
let currentLanguage = 'ru';
let questionsData = null;
let isSubmitting = false;

// Configuration
const CONFIG = {
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbymL7bS72Qdn1TbmnRZxpEhkbwaz6NeUz8WP4rOMYXqQhJy0RJ-AmSVO09sWiY4s2HtTQ/exec', // Replace with actual Google Apps Script URL
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000
};

// Initialize the survey
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await loadQuestions();
        renderQuestions();
        initializeEventListeners();
        updateLanguage();
    } catch (error) {
        console.error('Failed to initialize survey:', error);
        showError('Ошибка загрузки опроса. Пожалуйста, обновите страницу.');
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

// Render questions dynamically
function renderQuestions() {
    if (!questionsData) return;
    
    const container = document.getElementById('questionsContainer');
    container.innerHTML = '';
    
    questionsData.questions.forEach(question => {
        const questionBlock = createQuestionElement(question);
        container.appendChild(questionBlock);
    });
}

// Create question element
function createQuestionElement(question) {
    const questionBlock = document.createElement('div');
    questionBlock.className = 'question-block';
    
    questionBlock.innerHTML = `
        <label class="question-label" 
               data-ru="${question.textRu}" 
               data-en="${question.textEn}">
            ${currentLanguage === 'ru' ? question.textRu : question.textEn}
        </label>
        <div class="options-container">
            <div class="option-item" onclick="selectOption(${question.id}, 'yes')">
                <input type="radio" 
                       name="question_${question.id}" 
                       value="yes" 
                       id="q${question.id}_yes"
                       ${question.required ? 'required' : ''}>
                <label for="q${question.id}_yes" class="option-label" 
                       data-ru="${questionsData.options.yesRu}" 
                       data-en="${questionsData.options.yesEn}">
                    ${currentLanguage === 'ru' ? questionsData.options.yesRu : questionsData.options.yesEn}
                </label>
            </div>
            <div class="option-item" onclick="selectOption(${question.id}, 'no')">
                <input type="radio" 
                       name="question_${question.id}" 
                       value="no" 
                       id="q${question.id}_no"
                       ${question.required ? 'required' : ''}>
                <label for="q${question.id}_no" class="option-label" 
                       data-ru="${questionsData.options.noRu}" 
                       data-en="${questionsData.options.noEn}">
                    ${currentLanguage === 'ru' ? questionsData.options.noRu : questionsData.options.noEn}
                </label>
            </div>
        </div>
    `;
    
    return questionBlock;
}

// Handle option selection
function selectOption(questionId, value) {
    const radio = document.getElementById(`q${questionId}_${value}`);
    radio.checked = true;
    
    // Update visual selection
    const questionBlock = radio.closest('.question-block');
    const allOptions = questionBlock.querySelectorAll('.option-item');
    const selectedOption = radio.closest('.option-item');
    
    allOptions.forEach(option => option.classList.remove('selected'));
    selectedOption.classList.add('selected');
}

// Initialize event listeners
function initializeEventListeners() {
    // Language toggle
    const langToggle = document.getElementById('langToggle');
    langToggle.addEventListener('click', toggleLanguage);
    
    // Form submission
    const form = document.getElementById('surveyForm');
    form.addEventListener('submit', handleFormSubmit);
    
    // Character counter for feedback
    const feedbackTextarea = document.getElementById('feedback');
    const charCount = document.getElementById('charCount');
    
    feedbackTextarea.addEventListener('input', function() {
        const length = this.value.length;
        charCount.textContent = length;
        
        if (length > 180) {
            charCount.style.color = '#ef4444';
        } else if (length > 150) {
            charCount.style.color = '#f59e0b';
        } else {
            charCount.style.color = '#6b7280';
        }
    });
}

// Toggle language
function toggleLanguage() {
    currentLanguage = currentLanguage === 'ru' ? 'en' : 'ru';
    updateLanguage();
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

// Handle form submission
async function handleFormSubmit(event) {
    event.preventDefault();
    
    if (isSubmitting) return;
    
    try {
        isSubmitting = true;
        showLoading();
        
        const formData = collectFormData();
        await submitToGoogleSheets(formData);
        
        showSuccess();
    } catch (error) {
        console.error('Submission failed:', error);
        showError(currentLanguage === 'ru' 
            ? 'Ошибка отправки. Пожалуйста, попробуйте еще раз.' 
            : 'Submission failed. Please try again.');
    } finally {
        isSubmitting = false;
    }
}

// Collect form data
function collectFormData() {
    const formData = {
        timestamp: new Date().toISOString(),
        answers: {},
        feedback: document.getElementById('feedback').value.trim()
    };
    
    // Collect answers for each question
    questionsData.questions.forEach(question => {
        const selectedOption = document.querySelector(`input[name="question_${question.id}"]:checked`);
        if (selectedOption) {
            formData.answers[`question_${question.id}`] = selectedOption.value;
        }
    });
    
    return formData;
}

// Submit data to Google Sheets
async function submitToGoogleSheets(data, retryCount = 0) {
    try {
        console.log('Submitting data:', data);
        
        // Create form data for Google Apps Script
        const formData = new FormData();
        formData.append('data', JSON.stringify(data));
        
        const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: formData
        });
        
        console.log('Data submitted successfully');
        
    } catch (error) {
        console.error('Submission error:', error);
        
        // Retry with alternative method
        if (retryCount < CONFIG.MAX_RETRIES) {
            console.log(`Retrying submission (attempt ${retryCount + 1}/${CONFIG.MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
            
            // Try alternative method on retry
            if (retryCount > 0) {
                return submitToGoogleSheetsAlternative(data, retryCount);
            }
            
            return submitToGoogleSheets(data, retryCount + 1);
        }
        
        throw error;
    }
}

// Alternative submission method
async function submitToGoogleSheetsAlternative(data, retryCount = 0) {
    try {
        console.log('Trying alternative submission method');
        
        const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'text/plain',
            },
            body: JSON.stringify(data)
        });
        
        console.log('Alternative method succeeded');
        
    } catch (error) {
        console.error('Alternative method failed:', error);
        
        if (retryCount < CONFIG.MAX_RETRIES) {
            console.log(`Retrying alternative method (attempt ${retryCount + 1}/${CONFIG.MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
            return submitToGoogleSheetsAlternative(data, retryCount + 1);
        }
        
        throw error;
    }
}

// Show loading state
function showLoading() {
    const form = document.getElementById('surveyForm');
    const loading = document.getElementById('loadingMessage');
    
    form.style.display = 'none';
    loading.style.display = 'block';
}

// Show success message
function showSuccess() {
    const loading = document.getElementById('loadingMessage');
    const success = document.getElementById('successMessage');
    
    loading.style.display = 'none';
    success.style.display = 'block';
}

// Show error message
function showError(message) {
    const loading = document.getElementById('loadingMessage');
    const form = document.getElementById('surveyForm');
    
    loading.style.display = 'none';
    form.style.display = 'block';
    
    alert(message); // Simple error display - can be enhanced with better UI
}

// Utility function to get current language text
function getText(ruText, enText) {
    return currentLanguage === 'ru' ? ruText : enText;
} 