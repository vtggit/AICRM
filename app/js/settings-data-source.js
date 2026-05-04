/**
 * Settings Data Source — primary data access layer for application settings.
 *
 * The backend API is the single source of truth for all settings operations.
 * There is no localStorage fallback — when the backend fails, an error is
 * propagated to the UI so the user sees an honest failure.
 */
const SettingsDataSource = {

    /**
     * Get current settings from the backend.
     * Throws on failure so the caller can surface an error to the user.
     */
    async getSettings() {
        const result = await ApiClient.getSettingsFromApi();
        if (!result.ok) {
            throw this._apiError(result);
        }
        return result.data;
    },

    /**
     * Update settings via the backend (admin only).
     * Throws on failure — no local fallback.
     */
    async updateSettings(payload) {
        const result = await ApiClient.updateSettingsInApi(payload);
        if (!result.ok) {
            throw this._apiError(result);
        }
        return result.data;
    },

    /**
     * Build an Error from an API failure result, preserving the HTTP status.
     */
    _apiError(result) {
        const err = new Error(result.error || "An unexpected error occurred.");
        err.status = result.status;
        return err;
    },
};
