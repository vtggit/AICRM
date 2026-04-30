/**
 * Storage Manager - Handles localStorage operations for AICRM data
 */
const Storage = {
    KEYS: {
        CONTACTS: 'aicrm_contacts',
        LEADS: 'aicrm_leads',
        ACTIVITIES: 'aicrm_activities',
        SETTINGS: 'aicrm_settings',
        TEMPLATES: 'aicrm_templates'
    },

    get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error(`Storage get error for key ${key}:`, e);
            return [];
        }
    },

    set(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error(`Storage set error for key ${key}:`, e);
            return false;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error(`Storage remove error for key ${key}:`, e);
            return false;
        }
    },

    clearAll() {
        Object.values(this.KEYS).forEach(key => this.remove(key));
    },

    exportAll() {
        const data = {};
        Object.entries(this.KEYS).forEach(([name, key]) => {
            data[name] = this.get(key);
        });
        return JSON.stringify(data, null, 2);
    },

    importAll(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            let imported = 0;
            Object.entries(this.KEYS).forEach(([name, key]) => {
                if (Array.isArray(data[name])) {
                    this.set(key, data[name]);
                    imported++;
                }
            });
            return imported;
        } catch (e) {
            console.error('Import error:', e);
            throw new Error('Invalid data format');
        }
    },

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }
};
