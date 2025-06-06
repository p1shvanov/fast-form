// Quick test script for Google Apps Script
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwMV7H46kkRGpYWPBQIofVmBD9Qcg0s6zeg_RjzDbcLsnmDobrYJpfKTrwA828BG8ZOLg/exec';

// Test data
const testData = {
    timestamp: new Date().toISOString(),
    answers: {
        question_1: 'yes',
        question_2: 'no',
        question_3: 'yes',
        question_4: 'no',
        question_5: 'yes',
        question_6: 'no',
        question_7: 'yes',
        question_8: 'no',
        question_9: 'yes',
        question_10: 'no'
    },
    feedback: 'Quick test message'
};

// Test FormData method
async function testFormData() {
    try {
        console.log('Testing FormData method...');
        
        const formData = new FormData();
        formData.append('data', JSON.stringify(testData));
        
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.text();
        console.log('✅ FormData test successful:', result);
        return true;
        
    } catch (error) {
        console.error('❌ FormData test failed:', error);
        return false;
    }
}

// Test getting results
async function testGetResults() {
    try {
        console.log('Testing get results...');
        
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getResults`);
        const result = await response.text();
        
        console.log('✅ Get results successful:', result);
        return JSON.parse(result);
        
    } catch (error) {
        console.error('❌ Get results failed:', error);
        return null;
    }
}

// Run all tests
async function runTests() {
    console.log('🚀 Starting Google Apps Script tests...\n');
    
    // Test 1: Submit data
    const submitSuccess = await testFormData();
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Get results
    const results = await testGetResults();
    
    console.log('\n📊 Test Summary:');
    console.log('Submit data:', submitSuccess ? '✅ PASSED' : '❌ FAILED');
    console.log('Get results:', results ? '✅ PASSED' : '❌ FAILED');
    
    if (results) {
        console.log(`Total responses in sheet: ${results.totalCount || 0}`);
    }
}

// Auto-run tests if in browser console
if (typeof window !== 'undefined') {
    console.log('Copy and paste this into your browser console to test:');
    console.log('runTests();');
} 