/**
 * API Client - Centralizes HTTP calls to the AICRM backend.
 *
 * Wraps fetch so the rest of the app never calls fetch directly.
 * Returns { ok: true, data: ... } on success or { ok: false, error: string }
 * on failure so callers can surface meaningful error messages.
 *
 * Automatically attaches an Authorization header when Auth.isAuthenticated().
 */
const ApiClient = {
    BASE_URL: Config.API_BASE_URL,

    /**
     * Build common headers, including Authorization when available.
     */
    _headers(extra = {}) {
        const headers = { 'Content-Type': 'application/json', ...extra };
        const authHeader = Auth.getAuthorizationHeader();
        if (authHeader) {
            headers['Authorization'] = authHeader;
        }
        return headers;
    },

    /**
     * Generic GET helper.
     * Returns { ok: true, data } on success, { ok: false, error, status } on failure.
     */
    async get(path) {
        try {
            const response = await fetch(this.BASE_URL + path, {
                headers: this._headers(),
            });
            if (!response.ok) {
                const msg = await this._extractErrorMessage(response);
                return { ok: false, error: msg, status: response.status };
            }
            // 204 No Content — return empty
            if (response.status === 204) {
                return { ok: true, data: null };
            }
            return { ok: true, data: await response.json() };
        } catch (e) {
            console.warn(`API GET ${path} failed:`, e.message);
            return { ok: false, error: `Network error: ${e.message}` };
        }
    },

    /**
     * Generic POST helper.
     * Returns { ok: true, data } on success, { ok: false, error, status } on failure.
     */
    async post(path, body) {
        try {
            const response = await fetch(this.BASE_URL + path, {
                method: 'POST',
                headers: this._headers(),
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                const msg = await this._extractErrorMessage(response);
                return { ok: false, error: msg, status: response.status };
            }
            return { ok: true, data: await response.json() };
        } catch (e) {
            console.warn(`API POST ${path} failed:`, e.message);
            return { ok: false, error: `Network error: ${e.message}` };
        }
    },

    /**
     * Generic PUT helper.
     * Returns { ok: true, data } on success, { ok: false, error, status } on failure.
     */
    async put(path, body) {
        try {
            const response = await fetch(this.BASE_URL + path, {
                method: 'PUT',
                headers: this._headers(),
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                const msg = await this._extractErrorMessage(response);
                return { ok: false, error: msg, status: response.status };
            }
            return { ok: true, data: await response.json() };
        } catch (e) {
            console.warn(`API PUT ${path} failed:`, e.message);
            return { ok: false, error: `Network error: ${e.message}` };
        }
    },

    /**
     * Generic DELETE helper.
     * Returns { ok: true } on success, { ok: false, error, status } on failure.
     */
    async delete(path) {
        try {
            const response = await fetch(this.BASE_URL + path, {
                method: 'DELETE',
                headers: this._headers(),
            });
            if (response.ok || response.status === 204) {
                return { ok: true };
            }
            const msg = await this._extractErrorMessage(response);
            return { ok: false, error: msg, status: response.status };
        } catch (e) {
            console.warn(`API DELETE ${path} failed:`, e.message);
            return { ok: false, error: `Network error: ${e.message}` };
        }
    },

    /**
     * Extract a human-readable error message from an HTTP response.
     */
    async _extractErrorMessage(response) {
        try {
            const body = await response.json();
            if (body.detail) {
                // FastAPI validation errors come as an array
                if (Array.isArray(body.detail)) {
                    return body.detail.map(d => d.msg).join('; ');
                }
                return body.detail;
            }
            if (body.message) {
                return body.message;
            }
        } catch (_) {
            // Response body wasn't JSON
        }
        return `Server error (${response.status})`;
    },

    /**
     * Health check – returns true when the backend is reachable.
     */
    async isHealthy() {
        const result = await this.get('/health');
        return result.ok && result.data && result.data.status === 'ok';
    },

    // === Contacts ===

    /**
     * Fetch contacts from the backend API.
     * Returns { ok: true, data: items[] } or { ok: false, error }.
     */
    async getContactsFromApi() {
        const result = await this.get('/contacts');
        if (result.ok && Array.isArray(result.data.items)) {
            return { ok: true, data: result.data.items };
        }
        return { ok: false, error: result.error || 'Unexpected response from contacts endpoint.' };
    },

    /**
     * Create a contact via the backend API.
     * Returns { ok: true, data: contact } or { ok: false, error }.
     */
    async createContactInApi(contact) {
        const payload = {
            name: contact.name,
            email: contact.email || null,
            phone: contact.phone || null,
            company: contact.company || null,
            status: contact.status || 'active',
            notes: contact.notes || null,
        };
        return await this.post('/contacts', payload);
    },

    /**
     * Update a contact via the backend API.
     * Returns { ok: true, data: contact } or { ok: false, error }.
     */
    async updateContactInApi(id, contact) {
        const payload = {};
        for (const key of ['name', 'email', 'phone', 'company', 'status', 'notes']) {
            if (contact[key] !== undefined) {
                payload[key] = contact[key] || null;
            }
        }
        return await this.put(`/contacts/${id}`, payload);
    },

    /**
     * Delete a contact via the backend API.
     * Returns { ok: true } or { ok: false, error }.
     */
    async deleteContactInApi(id) {
        return await this.delete(`/contacts/${id}`);
    },

    // === Templates ===

    /**
     * Fetch templates from the backend API.
     * Returns { ok: true, data: items[] } or { ok: false, error }.
     */
    async getTemplatesFromApi() {
        const result = await this.get('/templates');
        if (result.ok && Array.isArray(result.data)) {
            return { ok: true, data: result.data };
        }
        return { ok: false, error: result.error || 'Unexpected response from templates endpoint.' };
    },

    /**
     * Create a template via the backend API.
     * Returns { ok: true, data: template } or { ok: false, error }.
     */
    async createTemplateInApi(template) {
        const payload = {
            name: template.name,
            category: template.category || 'other',
            subject: template.subject || null,
            content: template.body || template.content || '',
        };
        return await this.post('/templates', payload);
    },

    /**
     * Update a template via the backend API.
     * Returns { ok: true, data: template } or { ok: false, error }.
     */
    async updateTemplateInApi(id, template) {
        const payload = {};
        for (const key of ['name', 'category', 'subject']) {
            if (template[key] !== undefined) {
                payload[key] = template[key] || null;
            }
        }
        if (template.body !== undefined || template.content !== undefined) {
            payload.content = template.body || template.content || '';
        }
        return await this.put(`/templates/${id}`, payload);
    },

    /**
     * Delete a template via the backend API.
     * Returns { ok: true } or { ok: false, error }.
     */
    async deleteTemplateInApi(id) {
        return await this.delete(`/templates/${id}`);
    },

    // === Leads ===

    /**
     * Fetch leads from the backend API.
     * Returns { ok: true, data: items[] } or { ok: false, error }.
     */
    async getLeadsFromApi() {
        const result = await this.get('/leads');
        if (result.ok && Array.isArray(result.data)) {
            return { ok: true, data: result.data };
        }
        return { ok: false, error: result.error || 'Unexpected response from leads endpoint.' };
    },

    /**
     * Create a lead via the backend API.
     * Returns { ok: true, data: lead } or { ok: false, error }.
     */
    async createLeadInApi(lead) {
        const payload = {
            name: lead.name,
            company: lead.company || null,
            email: lead.email || null,
            phone: lead.phone || null,
            value: lead.value ? Number(lead.value) : null,
            stage: lead.stage || 'new',
            source: lead.source || null,
            notes: lead.notes || null,
        };
        return await this.post('/leads', payload);
    },

    /**
     * Update a lead via the backend API.
     * Returns { ok: true, data: lead } or { ok: false, error }.
     */
    async updateLeadInApi(id, lead) {
        const payload = {};
        for (const key of ['name', 'company', 'email', 'phone', 'stage', 'source', 'notes']) {
            if (lead[key] !== undefined) {
                payload[key] = lead[key] || null;
            }
        }
        if (lead.value !== undefined) {
            payload.value = lead.value ? Number(lead.value) : null;
        }
        return await this.put(`/leads/${id}`, payload);
    },

    /**
     * Delete a lead via the backend API.
     * Returns { ok: true } or { ok: false, error }.
     */
    async deleteLeadInApi(id) {
        return await this.delete(`/leads/${id}`);
    },

    // === Activities ===

    /**
     * Fetch activities from the backend API.
     * Returns { ok: true, data: items[] } or { ok: false, error }.
     */
    async getActivitiesFromApi() {
        const result = await this.get('/activities');
        if (result.ok && Array.isArray(result.data)) {
            return { ok: true, data: result.data };
        }
        return { ok: false, error: result.error || 'Unexpected response from activities endpoint.' };
    },

    /**
     * Create an activity via the backend API.
     * Returns { ok: true, data: activity } or { ok: false, error }.
     */
    async createActivityInApi(activity) {
        const payload = {
            type: activity.type || 'note',
            description: activity.description || '',
            contact_name: activity.contactName || activity.contact_name || null,
            occurred_at: activity.date || activity.occurred_at || null,
            due_date: activity.dueDate || activity.due_date || null,
            status: activity.status || 'pending',
        };
        return await this.post('/activities', payload);
    },

    /**
     * Update an activity via the backend API.
     * Returns { ok: true, data: activity } or { ok: false, error }.
     */
    async updateActivityInApi(id, activity) {
        const payload = {};
        if (activity.type !== undefined) payload.type = activity.type;
        if (activity.description !== undefined) payload.description = activity.description;
        if (activity.contactName !== undefined || activity.contact_name !== undefined) {
            payload.contact_name = activity.contactName || activity.contact_name || null;
        }
        if (activity.date !== undefined || activity.occurred_at !== undefined) {
            payload.occurred_at = activity.date || activity.occurred_at || null;
        }
        if (activity.dueDate !== undefined || activity.due_date !== undefined) {
            payload.due_date = activity.dueDate || activity.due_date || null;
        }
        if (activity.status !== undefined) payload.status = activity.status;
        return await this.put(`/activities/${id}`, payload);
    },

    /**
     * Delete an activity via the backend API.
     * Returns { ok: true } or { ok: false, error }.
     */
    async deleteActivityInApi(id) {
        return await this.delete(`/activities/${id}`);
    },

    // === Settings ===

    /**
     * Fetch current settings from the backend API.
     * Returns { ok: true, data: settings } or { ok: false, error }.
     */
    async getSettingsFromApi() {
        const result = await this.get('/settings');
        if (result.ok && result.data && typeof result.data === 'object') {
            return { ok: true, data: result.data };
        }
        return { ok: false, error: result.error || 'Unexpected response from settings endpoint.' };
    },

    /**
     * Update settings via the backend API (admin only).
     * Returns { ok: true, data: settings } or { ok: false, error }.
     */
    async updateSettingsInApi(payload) {
        return await this.put('/settings', { payload });
    },
};
