// Function to escape HTML to prevent XSS attacks
function escapeHtml(unsafe) {
    return unsafe.replace(/&/g, '\u0026')
                 .replace(/</g, '\u003C')
                 .replace(/>/g, '\u003E')
                 .replace(/"/g, '\u0022')
                 .replace(/'/g, '\u0027');
}

function getDefaultProperties() {
    return {
        userId: null,  // Added userId
        desc: '',  // Added description
        lat: 0.0,  // Added latitude
        lng: 0.0,  // Added longitude
    };
}

function updateStatusLabel(status) {
    const statusLabel = document.getElementById('status');
    if (statusLabel) {
        statusLabel.textContent = status || 'Unknown';
        // Fixed condition to handle proper status values
    }
}

function handleDomElement(id) {
    const element = document.getElementById(id);
    if (element) {
        // Perform operations on element
    } else {
        console.warn(`Element with id ${id} not found.`);
    }
}

function improveMediaRemoval(uniqueId) {
    const mediaElement = document.getElementById(uniqueId);
    if (mediaElement) {
        mediaElement.remove();
    }
}

function handleError(error) {
    console.error('An error occurred:', error);
    alert('Something went wrong. Please try again.');
}

function updateStats(userId) {
    if (!userId) {
        console.warn('User ID is null. Unable to update stats.');
        return;
    }
    // Proceed with updating stats
}
