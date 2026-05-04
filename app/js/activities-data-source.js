/**
 * Activities Data Source — primary data access layer for activities.
 *
 * The backend API is the single source of truth for all activity operations.
 * There is no localStorage fallback — when the backend fails, an error is
 * propagated to the UI so the user sees an honest failure.
 */
const ActivitiesDataSource = {

    /**
     * Get activities from the backend.
     * Throws on failure so the caller can surface an error to the user.
     */
    async getActivities() {
        const result = await ApiClient.getActivitiesFromApi();
        if (!result.ok) {
            throw this._apiError(result);
        }
        return (result.data || []).map(a => this._normalizeActivity(a));
    },

    /**
     * Create an activity via the backend.
     * Throws on failure — no local fallback.
     */
    async createActivity(activity) {
        const result = await ApiClient.createActivityInApi(activity);
        if (!result.ok) {
            throw this._apiError(result);
        }
        return this._normalizeActivity(result.data);
    },

    /**
     * Update an existing activity via the backend.
     * Throws on failure — no local fallback.
     */
    async updateActivity(id, activity) {
        const result = await ApiClient.updateActivityInApi(id, activity);
        if (!result.ok) {
            throw this._apiError(result);
        }
        return this._normalizeActivity(result.data);
    },

    /**
     * Delete an activity via the backend.
     * Throws on failure — no local fallback.
     */
    async deleteActivity(id) {
        const result = await ApiClient.deleteActivityInApi(id);
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
     * Normalize an activity object from the backend (snake_case → camelCase).
     */
    _normalizeActivity(a) {
        if (!a) return a;
        return {
            ...a,
            createdAt: a.created_at || a.createdAt,
            updatedAt: a.updated_at || a.updatedAt,
        };
    },
};
