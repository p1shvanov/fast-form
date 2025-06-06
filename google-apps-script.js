/**
 * Google Apps Script for Survey Data Management
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Sheets document
 * 2. Go to Extensions > Apps Script
 * 3. Replace the default code with this script
 * 4. Set up the spreadsheet structure (see setupSpreadsheet() function)
 * 5. Deploy as web app with execute permissions for "Anyone"
 * 6. Copy the web app URL and use it in your frontend code
 */

// Configuration
const CONFIG = {
  SHEET_NAME: 'Survey Responses',
  RESULTS_CACHE_DURATION: 60, // Cache results for 60 seconds
  MAX_FEEDBACK_LENGTH: 200
};

/**
 * Main function to handle HTTP requests
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // Validate and sanitize data
    const validatedData = validateSurveyData(data);
    
    // Save to spreadsheet
    saveSurveyResponse(validatedData);
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, message: 'Data saved successfully' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in doPost:', error);
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle GET requests for retrieving results
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    
    if (action === 'getResults') {
      const results = getSurveyResults();
      
      return ContentService
        .createTextOutput(JSON.stringify(results))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Invalid action' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in doGet:', error);
    
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Validate survey data
 */
function validateSurveyData(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data format');
  }
  
  if (!data.timestamp) {
    data.timestamp = new Date().toISOString();
  }
  
  if (!data.answers || typeof data.answers !== 'object') {
    throw new Error('Missing or invalid answers');
  }
  
  // Validate feedback length
  if (data.feedback && data.feedback.length > CONFIG.MAX_FEEDBACK_LENGTH) {
    data.feedback = data.feedback.substring(0, CONFIG.MAX_FEEDBACK_LENGTH);
  }
  
  // Sanitize feedback
  if (data.feedback) {
    data.feedback = data.feedback.replace(/[<>]/g, ''); // Basic XSS protection
  }
  
  return data;
}

/**
 * Save survey response to spreadsheet
 */
function saveSurveyResponse(data) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
  
  // Create sheet if it doesn't exist
  if (!sheet) {
    sheet = setupSpreadsheet();
  }
  
  // Prepare row data
  const rowData = [
    new Date(data.timestamp),
    data.answers.question_1 || '',
    data.answers.question_2 || '',
    data.answers.question_3 || '',
    data.answers.question_4 || '',
    data.answers.question_5 || '',
    data.answers.question_6 || '',
    data.answers.question_7 || '',
    data.answers.question_8 || '',
    data.answers.question_9 || '',
    data.answers.question_10 || '',
    data.feedback || ''
  ];
  
  // Add row to sheet
  sheet.appendRow(rowData);
  
  console.log('Survey response saved successfully');
}

/**
 * Set up spreadsheet structure
 */
function setupSpreadsheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.insertSheet(CONFIG.SHEET_NAME);
  
  // Set up headers
  const headers = [
    'Timestamp',
    'Question 1',
    'Question 2', 
    'Question 3',
    'Question 4',
    'Question 5',
    'Question 6',
    'Question 7',
    'Question 8',
    'Question 9',
    'Question 10',
    'Feedback'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Format header row
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#4285f4');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  
  // Set column widths
  sheet.setColumnWidth(1, 150); // Timestamp
  for (let i = 2; i <= 11; i++) {
    sheet.setColumnWidth(i, 100); // Questions
  }
  sheet.setColumnWidth(12, 300); // Feedback
  
  // Freeze header row
  sheet.setFrozenRows(1);
  
  console.log('Spreadsheet setup completed');
  return sheet;
}

/**
 * Get survey results for display
 */
function getSurveyResults() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
  
  if (!sheet) {
    return {
      responses: [],
      totalCount: 0
    };
  }
  
  // Get all data
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) { // Only headers or empty
    return {
      responses: [],
      totalCount: 0
    };
  }
  
  // Remove headers
  const responses = data.slice(1);
  
  // Convert to structured format
  const formattedResponses = responses.map(row => {
    return {
      timestamp: row[0].toISOString(),
      answers: {
        question_1: row[1],
        question_2: row[2],
        question_3: row[3],
        question_4: row[4],
        question_5: row[5],
        question_6: row[6],
        question_7: row[7],
        question_8: row[8],
        question_9: row[9],
        question_10: row[10]
      },
      feedback: row[11] || ''
    };
  });
  
  return {
    responses: formattedResponses,
    totalCount: formattedResponses.length
  };
}

/**
 * Manual function to test the script
 */
function testScript() {
  // Test data
  const testData = {
    timestamp: new Date().toISOString(),
    answers: {
      question_1: 'yes',
      question_2: 'no',
      question_3: 'yes',
      question_4: 'yes',
      question_5: 'no',
      question_6: 'yes',
      question_7: 'no',
      question_8: 'yes',
      question_9: 'yes',
      question_10: 'no'
    },
    feedback: 'This is a test feedback message'
  };
  
  try {
    console.log('Testing data save...');
    saveSurveyResponse(testData);
    console.log('✓ Data save test passed');
    
    console.log('Testing data retrieval...');
    const results = getSurveyResults();
    console.log('✓ Data retrieval test passed');
    console.log('Total responses:', results.totalCount);
    
    return 'All tests passed!';
  } catch (error) {
    console.error('Test failed:', error);
    return 'Test failed: ' + error.toString();
  }
}

/**
 * Function to clear all data (use with caution!)
 */
function clearAllData() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
  
  if (sheet) {
    // Keep only the header row
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.deleteRows(2, lastRow - 1);
    }
    console.log('All survey data cleared');
  }
}

/**
 * Function to get summary statistics
 */
function getSummaryStats() {
  const results = getSurveyResults();
  
  if (results.totalCount === 0) {
    return { message: 'No data found' };
  }
  
  const stats = {
    totalResponses: results.totalCount,
    questionStats: {}
  };
  
  // Calculate stats for each question
  for (let i = 1; i <= 10; i++) {
    const questionKey = `question_${i}`;
    const answers = results.responses.map(r => r.answers[questionKey]).filter(a => a);
    
    const yesCount = answers.filter(a => a === 'yes').length;
    const noCount = answers.filter(a => a === 'no').length;
    const total = answers.length;
    
    stats.questionStats[questionKey] = {
      yesCount,
      noCount,
      total,
      yesPercentage: total > 0 ? Math.round((yesCount / total) * 100) : 0,
      noPercentage: total > 0 ? Math.round((noCount / total) * 100) : 0
    };
  }
  
  // Feedback stats
  const feedbacks = results.responses.map(r => r.feedback).filter(f => f && f.trim());
  stats.feedbackCount = feedbacks.length;
  
  console.log('Summary stats generated:', stats);
  return stats;
} 