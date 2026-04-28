'use strict';

/**
 * Function to escape HTML to prevent XSS attacks
 * @param {string} unsafe - The unsafe string to escape
 * @returns {string} The escaped HTML string
 */
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') {
        console.warn('escapeHtml: Input must be a string');
        return '';
    }
    return unsafe.replace(/&/g, '&amp;')
                 .replace(/</g, '&lt;')
                 .replace(/>/g, '&gt;')
                 .replace(/"/g, '&quot;')
                 .replace(/'/g, '&#039;');
}

/**
 * Get default properties for a user object
 * @returns {Object} Default properties object
 */
function getDefaultProperties() {
    return {
        userId: null,
        desc: '',
        lat: 0.0,
        lng: 0.0,
        createdAt: new Date().toISOString()
    };
}

/**
 * Update the status label in the DOM
 * @param {string} status - The status to display
 * @returns {boolean} True if successful, false otherwise
 */
function updateStatusLabel(status) {
    try {
        const statusLabel = document.getElementById('status');
        if (statusLabel) {
            statusLabel.textContent = escapeHtml(status || 'Unknown');
            return true;
        } else {
            console.warn('Status label element not found in DOM');
            return false;
        }
    } catch (error) {
        console.error('Error updating status label:', error);
        return false;
    }
}

/**
 * Handle DOM element operations safely
 * @param {string} id - The element ID to handle
 * @returns {Element|null} The element or null if not found
 */
function handleDomElement(id) {
    if (!id || typeof id !== 'string') {
        console.warn('handleDomElement: ID must be a non-empty string');
        return null;
    }
    
    try {
        const element = document.getElementById(id);
        if (element) {
            return element;
        } else {
            console.warn(`Element with id "${id}" not found.`);
            return null;
        }
    } catch (error) {
        console.error('Error handling DOM element:', error);
        return null;
    }
}

/**
 * Safely remove media element from the DOM
 * @param {string} uniqueId - The unique ID of the media element
 * @returns {boolean} True if removed successfully, false otherwise
 */
function improveMediaRemoval(uniqueId) {
    if (!uniqueId || typeof uniqueId !== 'string') {
        console.warn('improveMediaRemoval: Unique ID must be a non-empty string');
        return false;
    }
    
    try {
        const mediaElement = document.getElementById(uniqueId);
        if (mediaElement) {
            mediaElement.remove();
            console.log(`Media element with id "${uniqueId}" removed successfully.`);
            return true;
        } else {
            console.warn(`Media element with id "${uniqueId}" not found.`);
            return false;
        }
    } catch (error) {
        console.error('Error removing media element:', error);
        return false;
    }
}

/**
 * Handle errors with appropriate logging and user notification
 * @param {Error|string} error - The error object or message
 * @param {boolean} showAlert - Whether to show user alert (default: true)
 */
function handleError(error, showAlert = true) {
    try {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('An error occurred:', errorMessage);
        
        if (showAlert) {
            alert('Something went wrong. Please try again.');
        }
    } catch (err) {
        console.error('Critical error in error handler:', err);
    }
}

/**
 * Update statistics for a given user
 * @param {string|null} userId - The user ID
 * @returns {boolean} True if stats updated, false otherwise
 */
function updateStats(userId) {
    if (!userId) {
        console.warn('User ID is null or invalid. Unable to update stats.');
        return false;
    }
    
    try {
        if (typeof userId !== 'string') {
            console.warn('updateStats: User ID must be a string');
            return false;
        }
        
        // TODO: Implement actual stats update logic
        console.log(`Updating stats for user: ${escapeHtml(userId)}`);
        return true;
    } catch (error) {
        console.error('Error updating stats:', error);
        return false;
    }
}

/**
 * Validate user input
 * @param {string} input - User input to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateUserInput(input) {
    if (!input || typeof input !== 'string') {
        return false;
    }
    // Remove whitespace and check length
    const trimmed = input.trim();
    return trimmed.length > 0 && trimmed.length <= 255;
}

/**
 * Initialize the application
 */
function initializeApp() {
    try {
        console.log('Application initialized successfully');
        // Add initialization logic here
    } catch (error) {
        handleError(error);
    }
}

// Initialize app on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}