// Integrated Ejaari Application - Enhanced Class-Based Architecture

class EjaariApp {
    constructor() {
        this.properties = [];
        this.users = {};
        this.chats = {};
        this.currentUser = null;
        this.newPropertyVisibility = false;
        this.initializeStorage();
    }

    // Initialize data from localStorage
    initializeStorage() {
        const savedProperties = localStorage.getItem('ejaari_properties');
        const savedUsers = localStorage.getItem('ejaari_users');
        const savedChats = localStorage.getItem('ejaari_chats');
        const savedUser = localStorage.getItem('ejaari_user');

        this.properties = savedProperties ? JSON.parse(savedProperties) : this.getDefaultProperties();
        this.users = savedUsers ? JSON.parse(savedUsers) : {};
        this.chats = savedChats ? JSON.parse(savedChats) : {};
        this.currentUser = savedUser ? JSON.parse(savedUser) : null;
        this.updateVisibility();
    }

    // Get default properties dataset
    getDefaultProperties() {
        return [
            { 
                id: 1, 
                title: 'شقة فاخرة - حي النرجس', 
                type: 'شقة', 
                location: 'حي النرجس، الرياض', 
                price: 5500, 
                rooms: 3, 
                baths: 2, 
                area: 120, 
                icon: '🏢', 
                phone: '201001234567', 
                desc: 'شقة حديثة وفخمة مع إطلالة رائعة', 
                media: [], 
                lat: 24.7136, 
                lng: 46.6753, 
                userId: 'admin', 
                createdAt: Date.now() 
            },
            { 
                id: 2, 
                title: 'فيلا عصرية مع مسبح', 
                type: 'فيلا', 
                location: 'حي الملقا، الرياض', 
                price: 18000, 
                rooms: 5, 
                baths: 4, 
                area: 400, 
                icon: '🏡', 
                phone: '201002345678', 
                desc: 'فيلا فخمة بمسبح وحديقة', 
                media: [], 
                lat: 24.8050, 
                lng: 46.6941, 
                userId: 'admin', 
                createdAt: Date.now() 
            },
        ];
    }

    // Add new property
    addProperty(property) {
        if (!property.title || !property.location || !property.price) {
            console.error('Missing required property fields');
            return false;
        }

        const newId = Math.max(...this.properties.map(p => p.id), 0) + 1;
        const newProperty = {
            id: newId,
            ...property,
            userId: this.currentUser?.email || 'admin',
            createdAt: Date.now(),
            media: property.media || [],
            lat: property.lat || 24.7136,
            lng: property.lng || 46.6753
        };

        this.properties.push(newProperty);
        this.updateVisibility();
        this.saveToStorage();
        return newProperty;
    }

    // Update existing property
    updateProperty(id, updates) {
        const property = this.properties.find(p => p.id === id);
        if (!property) return false;

        const isOwner = property.userId === this.currentUser?.email || this.currentUser?.type === 'admin';
        if (!isOwner) {
            console.error('Unauthorized: You can only update your own properties');
            return false;
        }

        Object.assign(property, updates);
        this.saveToStorage();
        return property;
    }

    // Delete property
    deleteProperty(id) {
        const property = this.properties.find(p => p.id === id);
        if (!property) return false;

        const isOwner = property.userId === this.currentUser?.email || this.currentUser?.type === 'admin';
        if (!isOwner) {
            console.error('Unauthorized: You can only delete your own properties');
            return false;
        }

        const index = this.properties.indexOf(property);
        this.properties.splice(index, 1);
        this.updateVisibility();
        this.saveToStorage();
        return true;
    }

    // Get properties by filter
    filterProperties(filters = {}) {
        let results = [...this.properties];

        if (filters.type) {
            results = results.filter(p => p.type === filters.type);
        }

        if (filters.minPrice) {
            results = results.filter(p => p.price >= filters.minPrice);
        }

        if (filters.maxPrice) {
            results = results.filter(p => p.price <= filters.maxPrice);
        }

        if (filters.location) {
            results = results.filter(p => 
                p.location.toLowerCase().includes(filters.location.toLowerCase())
            );
        }

        if (filters.rooms) {
            results = results.filter(p => p.rooms >= filters.rooms);
        }

        if (filters.sort === 'price-asc') {
            results.sort((a, b) => a.price - b.price);
        } else if (filters.sort === 'price-desc') {
            results.sort((a, b) => b.price - a.price);
        } else if (filters.sort === 'newest') {
            results.sort((a, b) => b.createdAt - a.createdAt);
        }

        return results;
    }

    // Get user properties
    getUserProperties(userEmail) {
        return this.properties.filter(p => p.userId === userEmail);
    }

    // Register user
    registerUser(userData) {
        if (this.users[userData.email]) {
            console.error('User already exists');
            return false;
        }

        this.users[userData.email] = {
            email: userData.email,
            name: userData.name,
            phone: userData.phone,
            type: userData.type, // 'landlord' or 'tenant'
            createdAt: Date.now()
        };

        this.saveToStorage();
        return this.users[userData.email];
    }

    // Login user
    loginUser(email) {
        if (!this.users[email]) {
            console.error('User not found');
            return false;
        }

        this.currentUser = this.users[email];
        localStorage.setItem('ejaari_user', JSON.stringify(this.currentUser));
        return this.currentUser;
    }

    // Logout user
    logoutUser() {
        this.currentUser = null;
        localStorage.removeItem('ejaari_user');
    }

    // Send chat message
    sendChatMessage(propertyId, fromUserEmail, toUserEmail, messageText) {
        const chatKey = `${propertyId}_${fromUserEmail}_${toUserEmail}`;
        
        if (!this.chats[chatKey]) {
            this.chats[chatKey] = [];
        }

        const message = {
            from: fromUserEmail,
            to: toUserEmail,
            propertyId,
            text: messageText,
            timestamp: Date.now(),
            read: false
        };

        this.chats[chatKey].push(message);
        this.saveToStorage();
        return message;
    }

    // Get chat history
    getChatHistory(propertyId, user1Email, user2Email) {
        const chatKey = `${propertyId}_${user1Email}_${user2Email}`;
        return this.chats[chatKey] || [];
    }

    // Get all chats for user
    getUserChats(userEmail) {
        const userChats = {};

        Object.keys(this.chats).forEach(key => {
            const messages = this.chats[key];
            const participants = messages.some(m => m.from === userEmail || m.to === userEmail);
            
            if (participants) {
                userChats[key] = messages;
            }
        });

        return userChats;
    }

    // Mark chat message as read
    markChatAsRead(chatKey) {
        if (this.chats[chatKey]) {
            this.chats[chatKey].forEach(msg => {
                if (msg.to === this.currentUser?.email) {
                    msg.read = true;
                }
            });
            this.saveToStorage();
        }
    }

    // Update property visibility
    updateVisibility() {
        this.newPropertyVisibility = this.properties.length > 0;
    }

    // Get property by ID
    getPropertyById(id) {
        return this.properties.find(p => p.id === id);
    }

    // Get statistics
    getStatistics() {
        return {
            totalProperties: this.properties.length,
            totalUsers: Object.keys(this.users).length,
            averagePrice: this.properties.length > 0 
                ? Math.round(this.properties.reduce((sum, p) => sum + p.price, 0) / this.properties.length)
                : 0,
            propertyTypes: this.getPropertyTypeDistribution(),
            recentProperties: this.properties.slice(-5).reverse()
        };
    }

    // Get property type distribution
    getPropertyTypeDistribution() {
        const distribution = {};
        this.properties.forEach(p => {
            distribution[p.type] = (distribution[p.type] || 0) + 1;
        });
        return distribution;
    }

    // Search properties
    searchProperties(query) {
        const lowerQuery = query.toLowerCase();
        return this.properties.filter(p =>
            p.title.toLowerCase().includes(lowerQuery) ||
            p.location.toLowerCase().includes(lowerQuery) ||
            p.desc.toLowerCase().includes(lowerQuery)
        );
    }

    // Get nearby properties (by coordinates)
    getNearbyProperties(lat, lng, radiusKm = 10) {
        const toRad = Math.PI / 180;
        const R = 6371; // Earth's radius in km

        return this.properties.filter(p => {
            const dLat = (p.lat - lat) * toRad;
            const dLng = (p.lng - lng) * toRad;
            const a = Math.sin(dLat / 2) ** 2 + 
                     Math.cos(lat * toRad) * Math.cos(p.lat * toRad) * Math.sin(dLng / 2) ** 2;
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c;
            return distance <= radiusKm;
        });
    }

    // Save all data to localStorage
    saveToStorage() {
        localStorage.setItem('ejaari_properties', JSON.stringify(this.properties));
        localStorage.setItem('ejaari_users', JSON.stringify(this.users));
        localStorage.setItem('ejaari_chats', JSON.stringify(this.chats));
    }

    // Render app (logging info)
    render() {
        console.log('=== EJAARI APP STATE ===');
        console.log('Total Properties:', this.properties.length);
        console.log('Visible:', this.newPropertyVisibility);
        console.log('Current User:', this.currentUser?.name || 'Not logged in');
        console.log('Properties:', this.properties);
        console.log('Statistics:', this.getStatistics());
    }

    // Add location input support
    addLocationInput() {
        console.log('Location input feature enabled');
    }
}

// Global app instance
const ejaariApp = new EjaariApp();

// Usage examples
ejaariApp.render();

// Export for use in HTML
window.EjaariApp = EjaariApp;
window.ejaariApp = ejaariApp;