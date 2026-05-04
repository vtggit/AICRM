/**
 * Templates Data Source - Primary data access layer for templates.
 *
 * The backend API is the single source of truth for all template operations.
 * There is no localStorage fallback — when the backend fails, an error is
 * propagated to the UI so the user sees an honest failure.
 */
const TemplatesDataSource = {

    /**
     * Get templates from the backend.
     * Throws on failure so the caller can surface an error to the user.
     */
    async getTemplates() {
        const result = await ApiClient.getTemplatesFromApi();
        if (!result.ok) {
            throw this._apiError(result);
        }
        return result.data.map(t => this._normalizeTemplate(t));
    },

    /**
     * Create a template via the backend.
     * Throws on failure — no local fallback.
     */
    async createTemplate(template) {
        const result = await ApiClient.createTemplateInApi(template);
        if (!result.ok) {
            throw this._apiError(result);
        }
        return this._normalizeTemplate(result.data);
    },

    /**
     * Update a template via the backend.
     * Throws on failure — no local fallback.
     */
    async updateTemplate(id, template) {
        const result = await ApiClient.updateTemplateInApi(id, template);
        if (!result.ok) {
            throw this._apiError(result);
        }
        return this._normalizeTemplate(result.data);
    },

    /**
     * Delete a template via the backend.
     * Throws on failure — no local fallback.
     */
    async deleteTemplate(id) {
        const result = await ApiClient.deleteTemplateInApi(id);
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
     * Normalize a template object from the backend (snake_case → camelCase).
     */
    _normalizeTemplate(t) {
        if (!t) return t;
        return {
            ...t,
            body: t.content || t.body,
            createdAt: t.created_at || t.createdAt,
            updatedAt: t.updated_at || t.updatedAt,
        };
    },
};
