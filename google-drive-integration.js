// Google Drive API Integration for Forex Weekly Planner
// This file handles authentication and data operations with Google Drive

// Client ID from Google Cloud Console
const CLIENT_ID = '861920609388-eu9f25n2igd0ja9081emi2qo5ccpi22r.apps.googleusercontent.com';
// API Key from Google Cloud Console
const API_KEY = 'AIzaSyDCHP3fQNywHnEZc4f7PWZWeY7TtY3ryDg';
// Discovery docs for the API
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
// Authorization scopes required by the API
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file';

// File name in Google Drive
const FOREX_JOURNAL_FILENAME = 'forex-journal-data.json';

// Variable to store file ID once found/created
let journalFileId = null;

// Load the auth2 library and API client library
function loadGoogleDriveAPI() {
    return new Promise((resolve, reject) => {
        // Load the JavaScript client library
        gapi.load('client:auth2', () => {
            // Initialize the client with API key and client ID
            gapi.client.init({
                apiKey: API_KEY,
                clientId: CLIENT_ID,
                discoveryDocs: DISCOVERY_DOCS,
                scope: SCOPES
            }).then(() => {
                // Listen for sign-in state changes
                gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
                
                // Handle the initial sign-in state
                updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
                
                resolve();
            }).catch(error => {
                console.error('Error initializing Google Drive API', error);
                showNotification('Error connecting to Google Drive. Please try again.', 'error');
                reject(error);
            });
        });
    });
}

// Update UI based on sign-in status
function updateSigninStatus(isSignedIn) {
    const authorizeButton = document.getElementById('authorize-button');
    const signoutButton = document.getElementById('signout-button');
    const syncStatusElement = document.getElementById('sync-status');
    
    if (isSignedIn) {
        authorizeButton.style.display = 'none';
        signoutButton.style.display = 'block';
        syncStatusElement.textContent = 'Connected to Google Drive';
        syncStatusElement.className = 'sync-status connected';
        
        // Find or create the journal file
        findOrCreateJournalFile();
    } else {
        authorizeButton.style.display = 'block';
        signoutButton.style.display = 'none';
        syncStatusElement.textContent = 'Not connected to Google Drive';
        syncStatusElement.className = 'sync-status disconnected';
    }
}

// Handle login
function handleAuthClick() {
    gapi.auth2.getAuthInstance().signIn();
}

// Handle logout
function handleSignoutClick() {
    gapi.auth2.getAuthInstance().signOut();
}

// Find the journal file in Google Drive or create it if it doesn't exist
function findOrCreateJournalFile() {
    // Search for the file
    gapi.client.drive.files.list({
        spaces: 'appDataFolder',
        fields: 'files(id, name)',
        q: `name='${FOREX_JOURNAL_FILENAME}'`
    }).then(response => {
        const files = response.result.files;
        
        if (files && files.length > 0) {
            // File exists, store its ID
            journalFileId = files[0].id;
            console.log('Journal file found with ID:', journalFileId);
            
            // Load data from the file
            loadDataFromDrive();
        } else {
            // File doesn't exist, create it
            createJournalFile();
        }
    }).catch(error => {
        console.error('Error searching for journal file', error);
        showNotification('Error accessing Google Drive. Please try again.', 'error');
    });
}

// Create a new journal file in Google Drive
function createJournalFile() {
    // Create an empty data structure
    const emptyData = {};
    
    // Create the file metadata
    const fileMetadata = {
        name: FOREX_JOURNAL_FILENAME,
        parents: ['appDataFolder'],
        mimeType: 'application/json'
    };
    
    // Create the file content
    const fileContent = JSON.stringify(emptyData);
    
    // Create a new file
    gapi.client.drive.files.create({
        resource: fileMetadata,
        media: {
            mimeType: 'application/json',
            body: fileContent
        },
        fields: 'id'
    }).then(response => {
        journalFileId = response.result.id;
        console.log('Journal file created with ID:', journalFileId);
        showNotification('New journal file created in Google Drive', 'success');
    }).catch(error => {
        console.error('Error creating journal file', error);
        showNotification('Error creating file in Google Drive. Please try again.', 'error');
    });
}

// Load data from Google Drive
function loadDataFromDrive() {
    if (!journalFileId) {
        console.error('No journal file ID available');
        return;
    }
    
    // Show loading indicator
    showSyncingIndicator(true);
    
    // Get the file content
    gapi.client.drive.files.get({
        fileId: journalFileId,
        alt: 'media'
    }).then(response => {
        // Parse the JSON data
        const driveData = response.result;
        
        // Update local storage with the data from Drive
        for (const key in driveData) {
            localStorage.setItem(key, JSON.stringify(driveData[key]));
        }
        
        // Reload the current week data
        loadWeekData();
        
        // Hide loading indicator
        showSyncingIndicator(false);
        
        // Show success message
        showNotification('Data loaded from Google Drive', 'success');
    }).catch(error => {
        console.error('Error loading data from Google Drive', error);
        showNotification('Error loading data from Google Drive. Please try again.', 'error');
        
        // Hide loading indicator
        showSyncingIndicator(false);
    });
}

// Save data to Google Drive
function saveDataToDrive() {
    if (!journalFileId) {
        console.error('No journal file ID available');
        return;
    }
    
    // Show loading indicator
    showSyncingIndicator(true);
    
    // Prepare data from localStorage
    const exportData = {};
    
    // Get all keys from localStorage that start with 'forex-journal-'
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('forex-journal-')) {
            exportData[key] = JSON.parse(localStorage.getItem(key));
        }
    }
    
    // Convert to JSON
    const fileContent = JSON.stringify(exportData);
    
    // Update the file content
    gapi.client.drive.files.update({
        fileId: journalFileId,
        media: {
            mimeType: 'application/json',
            body: fileContent
        }
    }).then(response => {
        // Hide loading indicator
        showSyncingIndicator(false);
        
        // Show success message
        showNotification('Data saved to Google Drive', 'success');
    }).catch(error => {
        console.error('Error saving data to Google Drive', error);
        showNotification('Error saving data to Google Drive. Please try again.', 'error');
        
        // Hide loading indicator
        showSyncingIndicator(false);
    });
}

// Show or hide syncing indicator
function showSyncingIndicator(isVisible) {
    const syncIndicator = document.getElementById('sync-indicator');
    
    if (isVisible) {
        syncIndicator.style.display = 'inline-block';
    } else {
        syncIndicator.style.display = 'none';
    }
}

// Check if user is signed in to Google Drive
function isSignedInToDrive() {
    return gapi.auth2 && gapi.auth2.getAuthInstance().isSignedIn.get();
}

// Save data to both localStorage and Google Drive
function saveAllData() {
    // First save to localStorage
    saveWeekData();
    
    // Then save to Google Drive if signed in
    if (isSignedInToDrive()) {
        saveDataToDrive();
    }
}

// Load data from Google Drive if signed in, otherwise from localStorage
function loadAllData() {
    if (isSignedInToDrive()) {
        loadDataFromDrive();
    } else {
        loadWeekData();
    }
}
