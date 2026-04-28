// app.js

const sanitizeInput = (input) => {
    return input.trim().replace(/<[^>]*>/g, ''); // Basic sanitization
};

const updateStatusLabel = (status) => {
    if (status === 'active') {
        return 'User is Active';
    } else if (status === 'inactive') {
        return 'User is Inactive';
    } else {
        return 'Status Unknown';
    }
};

// Usage example
const userId = sanitizeInput('user123');
const desc = sanitizeInput('<script>alert("XSS")</script>');
const statusLabel = updateStatusLabel('active');

console.log({ userId, desc, statusLabel });