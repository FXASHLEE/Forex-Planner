// Global variables
let currentWeekDate = new Date();
let pairsData = {};
let currentPairId = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Set the current week
    updateWeekDisplay();
    
    // Load data for the current week
    loadWeekData();
    
    // Add event listeners
    setupEventListeners();
});

// Update the week display
function updateWeekDisplay() {
    // Get the start of the week (Sunday)
    const startOfWeek = new Date(currentWeekDate);
    startOfWeek.setDate(currentWeekDate.getDate() - currentWeekDate.getDay());
    
    // Format the date
    const options = { month: 'long', day: 'numeric', year: 'numeric' };
    document.getElementById('week-date').textContent = startOfWeek.toLocaleDateString('en-US', options);
}

// Load data for the current week
function loadWeekData() {
    // Get the week key
    const weekKey = getWeekKey(currentWeekDate);
    
    // Load data from localStorage
    const storedData = localStorage.getItem(`forex-journal-${weekKey}`);
    
    if (storedData) {
        const data = JSON.parse(storedData);
        pairsData = data.pairs || {};
        
        // Load market overview
        document.getElementById('market-bias').value = data.marketBias || 'neutral';
        document.getElementById('key-events').value = data.keyEvents || '';
        document.getElementById('weekly-notes').value = data.weeklyNotes || '';
        
        // Render pairs
        renderPairs();
    } else {
        // Initialize empty data
        pairsData = {};
        document.getElementById('market-bias').value = 'neutral';
        document.getElementById('key-events').value = '';
        document.getElementById('weekly-notes').value = '';
        
        // Show no pairs message
        renderPairs();
    }
    
    // Update stats
    updateStats();
}

// Save data for the current week
function saveWeekData() {
    // Get the week key
    const weekKey = getWeekKey(currentWeekDate);
    
    // Prepare data
    const data = {
        pairs: pairsData,
        marketBias: document.getElementById('market-bias').value,
        keyEvents: document.getElementById('key-events').value,
        weeklyNotes: document.getElementById('weekly-notes').value
    };
    
    // Save to localStorage
    localStorage.setItem(`forex-journal-${weekKey}`, JSON.stringify(data));
    
    // Show success message
    showNotification('Data saved successfully!', 'success');
}

// Get the week key (YYYY-WW format)
function getWeekKey(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay()); // Start of week (Sunday)
    
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    
    return `${d.getFullYear()}-${weekNumber.toString().padStart(2, '0')}`;
}

// Generate a unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Render pairs in the list
function renderPairs() {
    const pairsList = document.getElementById('pairs-list');
    const noPairsMessage = document.getElementById('no-pairs-message');
    
    // Clear the list
    pairsList.innerHTML = '';
    
    // Check if there are pairs
    const pairIds = Object.keys(pairsData);
    
    if (pairIds.length === 0) {
        noPairsMessage.style.display = 'block';
        return;
    }
    
    // Hide no pairs message
    noPairsMessage.style.display = 'none';
    
    // Sort pairs by name
    pairIds.sort((a, b) => pairsData[a].pair.localeCompare(pairsData[b].pair));
    
    // Render each pair
    pairIds.forEach(id => {
        const pair = pairsData[id];
        
        const pairItem = document.createElement('div');
        pairItem.className = 'pair-item';
        
        // Calculate risk-reward ratio if entry, stop loss, and take profit are provided
        let riskReward = '';
        if (pair.entryPrice && pair.stopLoss && pair.takeProfit) {
            const entryPrice = parseFloat(pair.entryPrice);
            const stopLoss = parseFloat(pair.stopLoss);
            const takeProfit = parseFloat(pair.takeProfit);
            
            if (!isNaN(entryPrice) && !isNaN(stopLoss) && !isNaN(takeProfit)) {
                const risk = Math.abs(entryPrice - stopLoss);
                const reward = Math.abs(takeProfit - entryPrice);
                
                if (risk > 0) {
                    riskReward = (reward / risk).toFixed(2) + ':1';
                }
            }
        }
        
        // Create pair item HTML
        pairItem.innerHTML = `
            <div class="pair-name">${pair.pair}</div>
            <div><span class="pair-bias ${pair.bias}">${pair.bias.charAt(0).toUpperCase() + pair.bias.slice(1)}</span></div>
            <div>${formatSetupType(pair.setupType)}</div>
            <div>${pair.timeframe}</div>
            <div>${pair.entryPrice || '-'}</div>
            <div>${pair.stopLoss || '-'}</div>
            <div>${pair.takeProfit || '-'}</div>
            <div>${riskReward || '-'}</div>
            <div class="pair-notes" title="${pair.notes || ''}">${pair.notes || '-'}</div>
            <div class="pair-actions">
                <button class="action-btn edit-btn" data-id="${id}"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete-btn" data-id="${id}"><i class="fas fa-trash"></i></button>
            </div>
        `;
        
        pairsList.appendChild(pairItem);
    });
    
    // Add event listeners to edit and delete buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            openEditModal(id);
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            openDeleteModal(id);
        });
    });
    
    // Update stats
    updateStats();
}

// Format setup type for display
function formatSetupType(setupType) {
    if (!setupType) return '-';
    
    return setupType
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Update statistics
function updateStats() {
    const pairIds = Object.keys(pairsData);
    
    // Count total pairs
    document.getElementById('total-pairs').textContent = pairIds.length;
    
    // Count by bias
    let bullishCount = 0;
    let bearishCount = 0;
    let neutralCount = 0;
    
    pairIds.forEach(id => {
        const pair = pairsData[id];
        if (pair.bias === 'bullish') bullishCount++;
        else if (pair.bias === 'bearish') bearishCount++;
        else neutralCount++;
    });
    
    document.getElementById('bullish-count').textContent = bullishCount;
    document.getElementById('bearish-count').textContent = bearishCount;
    document.getElementById('neutral-count').textContent = neutralCount;
}

// Open the add pair modal
function openAddModal() {
    const modal = document.getElementById('add-pair-modal');
    modal.style.display = 'block';
    
    // Reset form
    document.getElementById('add-pair-form').reset();
    document.getElementById('custom-pair').style.display = 'none';
    document.getElementById('risk-reward').value = '';
    
    // Calculate risk-reward when entry, stop loss, or take profit changes
    setupRiskRewardCalculation('entry-price', 'stop-loss', 'take-profit', 'risk-reward');
}

// Open the edit pair modal
function openEditModal(id) {
    const modal = document.getElementById('edit-pair-modal');
    modal.style.display = 'block';
    
    // Get pair data
    const pair = pairsData[id];
    
    // Set form values
    document.getElementById('edit-pair-id').value = id;
    
    if (pair.pair.includes('/')) {
        // Standard pair
        document.getElementById('edit-pair-select').value = pair.pair;
        document.getElementById('edit-custom-pair').style.display = 'none';
    } else {
        // Custom pair
        document.getElementById('edit-pair-select').value = 'custom';
        document.getElementById('edit-custom-pair').style.display = 'block';
        document.getElementById('edit-custom-pair').value = pair.pair;
    }
    
    document.getElementById('edit-bias-select').value = pair.bias;
    document.getElementById('edit-setup-select').value = pair.setupType;
    document.getElementById('edit-timeframe-select').value = pair.timeframe;
    document.getElementById('edit-entry-price').value = pair.entryPrice || '';
    document.getElementById('edit-stop-loss').value = pair.stopLoss || '';
    document.getElementById('edit-take-profit').value = pair.takeProfit || '';
    document.getElementById('edit-pair-notes').value = pair.notes || '';
    
    // Calculate risk-reward
    calculateRiskReward('edit-entry-price', 'edit-stop-loss', 'edit-take-profit', 'edit-risk-reward');
    
    // Setup risk-reward calculation
    setupRiskRewardCalculation('edit-entry-price', 'edit-stop-loss', 'edit-take-profit', 'edit-risk-reward');
}

// Open the delete confirmation modal
function openDeleteModal(id) {
    const modal = document.getElementById('confirm-delete-modal');
    modal.style.display = 'block';
    
    // Store the current pair ID
    currentPairId = id;
}

// Close all modals
function closeModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
    
    // Reset current pair ID
    currentPairId = null;
}

// Add a new pair
function addPair(event) {
    event.preventDefault();
    
    // Get form values
    let pairValue;
    if (document.getElementById('pair-select').value === 'custom') {
        pairValue = document.getElementById('custom-pair').value.trim();
    } else {
        pairValue = document.getElementById('pair-select').value;
    }
    
    const bias = document.getElementById('bias-select').value;
    const setupType = document.getElementById('setup-select').value;
    const timeframe = document.getElementById('timeframe-select').value;
    const entryPrice = document.getElementById('entry-price').value.trim();
    const stopLoss = document.getElementById('stop-loss').value.trim();
    const takeProfit = document.getElementById('take-profit').value.trim();
    const notes = document.getElementById('pair-notes').value.trim();
    
    // Validate pair
    if (!pairValue) {
        showNotification('Please select or enter a currency pair', 'error');
        return;
    }
    
    // Generate ID and add pair
    const id = generateId();
    pairsData[id] = {
        pair: pairValue,
        bias,
        setupType,
        timeframe,
        entryPrice,
        stopLoss,
        takeProfit,
        notes
    };
    
    // Render pairs and save data
    renderPairs();
    saveWeekData();
    
    // Close modal
    closeModals();
    
    // Show success message
    showNotification(`${pairValue} added to your watchlist`, 'success');
}

// Update an existing pair
function updatePair(event) {
    event.preventDefault();
    
    // Get form values
    const id = document.getElementById('edit-pair-id').value;
    
    let pairValue;
    if (document.getElementById('edit-pair-select').value === 'custom') {
        pairValue = document.getElementById('edit-custom-pair').value.trim();
    } else {
        pairValue = document.getElementById('edit-pair-select').value;
    }
    
    const bias = document.getElementById('edit-bias-select').value;
    const setupType = document.getElementById('edit-setup-select').value;
    const timeframe = document.getElementById('edit-timeframe-select').value;
    const entryPrice = document.getElementById('edit-entry-price').value.trim();
    const stopLoss = document.getElementById('edit-stop-loss').value.trim();
    const takeProfit = document.getElementById('edit-take-profit').value.trim();
    const notes = document.getElementById('edit-pair-notes').value.trim();
    
    // Validate pair
    if (!pairValue) {
        showNotification('Please select or enter a currency pair', 'error');
        return;
    }
    
    // Update pair
    pairsData[id] = {
        pair: pairValue,
        bias,
        setupType,
        timeframe,
        entryPrice,
        stopLoss,
        takeProfit,
        notes
    };
    
    // Render pairs and save data
    renderPairs();
    saveWeekData();
    
    // Close modal
    closeModals();
    
    // Show success message
    showNotification(`${pairValue} updated successfully`, 'success');
}

// Delete a pair
function deletePair() {
    if (currentPairId && pairsData[currentPairId]) {
        const pairName = pairsData[currentPairId].pair;
        
        // Delete pair
        delete pairsData[currentPairId];
        
        // Render pairs and save data
        renderPairs();
        saveWeekData();
        
        // Close modal
        closeModals();
        
        // Show success message
        showNotification(`${pairName} removed from your watchlist`, 'success');
    }
}

// Calculate risk-reward ratio
function calculateRiskReward(entryId, stopId, targetId, resultId) {
    const entryPrice = parseFloat(document.getElementById(entryId).value);
    const stopLoss = parseFloat(document.getElementById(stopId).value);
    const takeProfit = parseFloat(document.getElementById(targetId).value);
    
    if (!isNaN(entryPrice) && !isNaN(stopLoss) && !isNaN(takeProfit)) {
        const risk = Math.abs(entryPrice - stopLoss);
        const reward = Math.abs(takeProfit - entryPrice);
        
        if (risk > 0) {
            document.getElementById(resultId).value = (reward / risk).toFixed(2) + ':1';
        } else {
            document.getElementById(resultId).value = '';
        }
    } else {
        document.getElementById(resultId).value = '';
    }
}

// Setup risk-reward calculation
function setupRiskRewardCalculation(entryId, stopId, targetId, resultId) {
    const entryInput = document.getElementById(entryId);
    const stopInput = document.getElementById(stopId);
    const targetInput = document.getElementById(targetId);
    
    const updateRiskReward = () => {
        calculateRiskReward(entryId, stopId, targetId, resultId);
    };
    
    entryInput.addEventListener('input', updateRiskReward);
    stopInput.addEventListener('input', updateRiskReward);
    targetInput.addEventListener('input', updateRiskReward);
}

// Show notification
function showNotification(message, type = 'info') {
    // Check if notification container exists
    let container = document.querySelector('.notification-container');
    
    if (!container) {
        container = document.createElement('div');
        container.className = 'notification-container';
        document.body.appendChild(container);
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .notification-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
            }
            
            .notification {
                padding: 15px 20px;
                margin-bottom: 10px;
                border-radius: 4px;
                color: white;
                font-weight: 600;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                display: flex;
                align-items: center;
                animation: slideIn 0.3s ease-out forwards;
            }
            
            .notification.success {
                background-color: #2ecc71;
            }
            
            .notification.error {
                background-color: #e74c3c;
            }
            
            .notification.info {
                background-color: #3498db;
            }
            
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add to container
    container.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease-out forwards';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Export data
function exportData() {
    // Prepare data for all weeks
    const exportData = {};
    
    // Get all keys from localStorage that start with 'forex-journal-'
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('forex-journal-')) {
            exportData[key] = JSON.parse(localStorage.getItem(key));
        }
    }
    
    // Convert to JSON
    const jsonData = JSON.stringify(exportData, null, 2);
    
    // Create download link
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'forex-journal-export.json';
    a.click();
    
    // Clean up
    URL.revokeObjectURL(url);
    
    // Show success message
    showNotification('Data exported successfully', 'success');
}

// Import data
function importData() {
    const fileInput = document.getElementById('import-file');
    
    if (fileInput.files.length === 0) {
        showNotification('Please select a file to import', 'error');
        return;
    }
    
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // Validate data structure
            let isValid = true;
            for (const key in importedData) {
                if (!key.startsWith('forex-journal-')) {
                    isValid = false;
                    break;
                }
            }
            
            if (!isValid) {
                showNotification('Invalid data format', 'error');
                return;
            }
            
            // Import data
            for (const key in importedData) {
                localStorage.setItem(key, JSON.stringify(importedData[key]));
            }
            
            // Reload current week data
            loadWeekData();
            
            // Show success message
            showNotification('Data imported successfully', 'success');
            
            // Reset file input
            fileInput.value = '';
        } catch (error) {
            showNotification('Error importing data: ' + error.message, 'error');
        }
    };
    
    reader.readAsText(file);
}

// Setup event listeners
function setupEventListeners() {
    // Week navigation
    document.getElementById('prev-week').addEventListener('click', function() {
        currentWeekDate.setDate(currentWeekDate.getDate() - 7);
        updateWeekDisplay();
        loadWeekData();
    });
    
    document.getElementById('next-week').addEventListener('click', function() {
        currentWeekDate.setDate(currentWeekDate.getDate() + 7);
        updateWeekDisplay();
        loadWeekData();
    });
    
    // Add pair button
    document.getElementById('add-pair').addEventListener('click', openAddModal);
    
    // Save all button
    document.getElementById('save-all').addEventListener('click', saveWeekData);
    
    // Export data button
    document.getElementById('export-data').addEventListener('click', exportData);
    
    // Import data button
    document.getElementById('import-data').addEventListener('click', function() {
        document.getElementById('import-file').click();
    });
    
    // Import file change
    document.getElementById('import-file').addEventListener('change', importData);
    
    // Add pair form
    document.getElementById('add-pair-form').addEventListener('submit', addPair);
    
    // Edit pair form
    document.getElementById('edit-pair-form').addEventListener('submit', updatePair);
    
    // Delete confirmation
    document.getElementById('confirm-delete').addEventListener('click', deletePair);
    
    // Cancel buttons
    document.getElementById('cancel-add-pair').addEventListener('click', closeModals);
    document.getElementById('cancel-edit-pair').addEventListener('click', closeModals);
    document.getElementById('cancel-delete').addEventListener('click', closeModals);
    
    // Close buttons
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            closeModals();
        }
    });
    
    // Custom pair selection
    document.getElementById('pair-select').addEventListener('change', function() {
        if (this.value === 'custom') {
            document.getElementById('custom-pair').style.display = 'block';
        } else {
            document.getElementById('custom-pair').style.display = 'none';
        }
    });
    
    document.getElementById('edit-pair-select').addEventListener('change', function() {
        if (this.value === 'custom') {
            document.getElementById('edit-custom-pair').style.display = 'block';
        } else {
            document.getElementById('edit-custom-pair').style.display = 'none';
        }
    });
    
    // Market overview changes
    document.getElementById('market-bias').addEventListener('change', saveWeekData);
    document.getElementById('key-events').addEventListener('input', debounce(saveWeekData, 1000));
    document.getElementById('weekly-notes').addEventListener('input', debounce(saveWeekData, 1000));
}

// Debounce function to limit how often a function can be called
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}
document.addEventListener("DOMContentLoaded", function () {
  const authorizeButton = document.getElementById("authorize-button");
  const signoutButton = document.getElementById("signout-button");

  authorizeButton.addEventListener("click", handleAuthClick);
  signoutButton.addEventListener("click", handleSignoutClick);
});

function handleAuthClick() {
  if (gapi.auth2) {
    gapi.auth2.getAuthInstance().signIn().then(() => {
      console.log("Signed in!");
      document.getElementById("authorize-button").style.display = "none";
      document.getElementById("signout-button").style.display = "inline-block";
      document.getElementById("sync-status").textContent = "Connected to Google Drive";
      document.getElementById("sync-status").classList.remove("disconnected");
      document.getElementById("sync-status").classList.add("connected");
    });
  } else {
    console.error("Google API is not ready yet.");
  }
}
function handleSignoutClick() {
  if (gapi.auth2) {
    gapi.auth2.getAuthInstance().signOut().then(() => {
      console.log("Signed out!");
      document.getElementById("authorize-button").style.display = "inline-block";
      document.getElementById("signout-button").style.display = "none";
      document.getElementById("sync-status").textContent = "Not connected to Google Drive";
      document.getElementById("sync-status").classList.remove("connected");
      document.getElementById("sync-status").classList.add("disconnected");
    });
  }
}

