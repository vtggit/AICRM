/**
 * Contacts Data Source - Primary data access layer for contacts.
 *
 * The backend API is the single source of truth for all contact operations.
 * There is no localStorage fallback — when the backend fails, an error is
 * propagated to the UI so the user sees an honest failure.
 */
const ContactsDataSource = {

    /**
     * Get contacts from the backend.
     * Throws on failure so the caller can surface an error to the user.
     */
    async getContacts() {
        const result = await ApiClient.getContactsFromApi();
        if (!result.ok) {
            throw this._apiError(result);
        }
        return result.data.map(c => this._normalizeContact(c));
    },

    /**
     * Create a contact via the backend.
     * Throws on failure — no local fallback.
     */
    async createContact(contact) {
        const result = await ApiClient.createContactInApi(contact);
        if (!result.ok) {
            throw this._apiError(result);
        }
        return this._normalizeContact(result.data);
    },

    /**
     * Update a contact via the backend.
     * Throws on failure — no local fallback.
     */
    async updateContact(id, contact) {
        const result = await ApiClient.updateContactInApi(id, contact);
        if (!result.ok) {
            throw this._apiError(result);
        }
        return this._normalizeContact(result.data);
    },

    /**
     * Delete a contact via the backend.
     * Throws on failure — no local fallback.
     */
    async deleteContact(id) {
        const result = await ApiClient.deleteContactInApi(id);
        if (!result.ok) {
            throw this._apiError(result);
        }
        return true;
    },

    /**
     * Build an Error from an API failure result, preserving the HTTP status.
     */
    _apiError(result) {
        const err = new Error(result.error || "An unexpected error occurred.");
        err.status = result.status;
        return err;
    },

    /**
     * Normalize a contact object from the backend (snake_case → camelCase).
     */
    _normalizeContact(c) {
        if (!c) return c;
        return {
            ...c,
            createdAt: c.created_at || c.createdAt,
            updatedAt: c.updated_at || c.updatedAt,
        };
    },
};
