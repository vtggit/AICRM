/**
 * Leads Data Source - Primary data access layer for leads.
 *
 * The backend API is the single source of truth for all lead operations.
 * There is no localStorage fallback — when the backend fails, an error is
 * propagated to the UI so the user sees an honest failure.
 */
const LeadsDataSource = {

    /**
     * Get leads from the backend.
     * Throws on failure so the caller can surface an error to the user.
     */
    async getLeads() {
        const result = await ApiClient.getLeadsFromApi();
        if (!result.ok) {
            throw this._apiError(result);
        }
        return result.data.map(l => this._normalizeLead(l));
    },

    /**
     * Get a single lead by ID from the backend.
     * Throws on failure — no local fallback.
     */
    async getLead(id) {
        const result = await ApiClient.get(`/leads/${id}`);
        if (!result.ok) {
            throw this._apiError(result);
        }
        return this._normalizeLead(result.data);
    },

    /**
     * Create a lead via the backend.
     * Throws on failure — no local fallback.
     */
    async createLead(lead) {
        const result = await ApiClient.createLeadInApi(lead);
        if (!result.ok) {
            throw this._apiError(result);
        }
        return this._normalizeLead(result.data);
    },

    /**
     * Update a lead via the backend.
     * Throws on failure — no local fallback.
     */
    async updateLead(id, lead) {
        const result = await ApiClient.updateLeadInApi(id, lead);
        if (!result.ok) {
            throw this._apiError(result);
        }
        return this._normalizeLead(result.data);
    },

    /**
     * Delete a lead via the backend.
     * Throws on failure — no local fallback.
     */
    async deleteLead(id) {
        const result = await ApiClient.deleteLeadInApi(id);
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
     * Normalize a lead object from the backend (snake_case → camelCase).
     */
    _normalizeLead(l) {
        if (!l) return l;
        return {
            ...l,
            createdAt: l.created_at || l.createdAt,
            updatedAt: l.updated_at || l.updatedAt,
        };
    },
};
