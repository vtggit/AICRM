/**
 * AICRM - Main Application Logic
 */
const App = {
    currentPage: 'dashboard',
    editId: null,
    editType: null,

    async init() {
        this.bindNavigation();
        this.bindThemeToggle();
        this.bindMenuToggle();
        this.bindSearch();
        this.bindContacts();
        this.bindLeads();
        this.bindActivities();
        this.bindTemplates();
        this.bindSettings();
        this.bindModal();
        this.bindKeyboardShortcuts();
        this.bindVersion();
        this.bindAuth();
        this.loadTheme();

        // Check backend availability before rendering
        const backendAvailable = await this._checkBackendAvailability();
        if (!backendAvailable) {
            this._showBackendUnavailableBanner(true);
        }

        this.renderDashboard();
        this.updateLastBackupDisplay();
        this.updateOverdueBadge();
    },

    /**
     * Check if the backend is available at startup.
     * Returns true if the backend responds to a health check.
     */
    async _checkBackendAvailability() {
        try {
            return await ApiClient.isHealthy();
        } catch (err) {
            console.warn('Backend health check failed at startup:', err.message);
            return false;
        }
    },

    // === Navigation ===
    bindNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                this.navigate(page);
            });
        });
    },

    async navigate(page) {
        this.currentPage = page;
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelector(`.nav-item[data-page="${page}"]`).classList.add('active');
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(`page-${page}`).classList.add('active');
        document.getElementById('page-title').textContent = this.getPageTitle(page);

        if (page === 'dashboard') await this.renderDashboard();
        if (page === 'contacts') await this.renderContacts();
        if (page === 'leads') await this.renderLeads();
        if (page === 'activities') await this.renderActivities();
        if (page === 'templates') this.renderTemplates();

        this.updateOverdueBadge();

        // Close mobile sidebar
        document.getElementById('sidebar').classList.remove('open');
    },

    getPageTitle(page) {
        const titles = {
            dashboard: 'Dashboard',
            contacts: 'Contacts',
            leads: 'Leads',
            activities: 'Activities',
            templates: 'Email Templates',
            settings: 'Settings'
        };
        return titles[page] || page;
    },

    // === Theme ===
    bindThemeToggle() {
        document.getElementById('theme-toggle').addEventListener('click', async () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const newTheme = isDark ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            document.getElementById('theme-toggle').textContent = isDark ? '🌙' : '☀️';
            // Persist theme change to backend
            try {
                await SettingsDataSource.updateSettings({ theme: newTheme });
            } catch (err) {
                this.showNotification(`Failed to save theme: ${err.message}`, 'error');
            }
        });
    },

    bindVersion() {
        const sidebarEl = document.getElementById('app-version-sidebar');
        const settingsEl = document.getElementById('app-version-settings');
        // APP_VERSION is now a Promise (fetched from backend at runtime).
        // Show initial placeholder, then update once resolved.
        if (sidebarEl) sidebarEl.textContent = `v${APP_VERSION_INITIAL}`;
        if (settingsEl) settingsEl.textContent = APP_VERSION_INITIAL;

        APP_VERSION.then(version => {
            if (sidebarEl) sidebarEl.textContent = `v${version}`;
            if (settingsEl) settingsEl.textContent = version;
        });
    },

    // === Authentication ===
    bindAuth() {
        const statusEl = document.getElementById('auth-status');
        if (!statusEl) return;

        // Clicking the status opens the login dialog when not authenticated
        statusEl.addEventListener('click', () => {
            if (Auth.isAuthenticated()) {
                // Logged in — offer logout
                if (confirm('Log out?')) {
                    Auth.logout();
                    this._updateAuthStatus();
                    this._showAuthBanner(true);
                    this._applyAdminOnlyVisibility();
                }
            } else {
                this._openLoginModal();
            }
        });

        // Initialize auth state asynchronously (don't block render)
        Auth.init().then(() => {
            this._updateAuthStatus();
            this._showAuthBanner(!Auth.isAuthenticated());
            this._applyAdminOnlyVisibility();
        });
    },

    /**
     * Hide or show elements marked with data-admin-only="true"
     * based on the current user's admin role.
     */
    _applyAdminOnlyVisibility() {
        document.querySelectorAll('[data-admin-only="true"]').forEach(el => {
            el.style.display = Auth.isAdmin() ? '' : 'none';
        });
    },

    /** Update the header auth indicator to reflect current state. */
    _updateAuthStatus() {
        const statusEl = document.getElementById('auth-status');
        if (!statusEl) return;

        if (Auth.isAuthenticated()) {
            const user = Auth.getCurrentUser();
            statusEl.innerHTML =
                `<span class="auth-indicator">🟢</span>` +
                `<span class="auth-username" title="${user.display_name || user.sub}">${user.display_name || user.sub}</span>`;
            statusEl.title = `Logged in as ${user.display_name || user.sub}`;
        } else {
            statusEl.innerHTML = `<span class="auth-indicator">🔴</span>`;
            statusEl.title = 'Not authenticated — click to log in';
        }
    },

    /** Show or hide the "authentication required" banner. */
    _showAuthBanner(show) {
        let banner = document.getElementById('auth-required-banner');
        if (show) {
            if (!banner) {
                banner = document.createElement('div');
                banner.id = 'auth-required-banner';
                banner.className = 'auth-required-banner active';
                banner.innerHTML =
                    '⚠️ Authentication required to access Contacts. ' +
                    '<button id="auth-banner-login-btn" style="margin-left:8px;cursor:pointer;">Log In</button>';
                const mainContent = document.getElementById('main-content');
                if (mainContent) {
                    mainContent.insertBefore(banner, mainContent.firstChild);
                }
                document.getElementById('auth-banner-login-btn').addEventListener('click', () => {
                    this._openLoginModal();
                });
            }
        } else if (banner) {
            banner.remove();
        }
    },

    /** Open the simple login modal (Step 8 placeholder). */
    _openLoginModal() {
        // Remove existing modal if any
        const existing = document.getElementById('login-modal');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'login-modal';
        overlay.className = 'modal-overlay active';
        overlay.innerHTML = `
            <div class="modal-box">
                <h3>🔐 Sign In</h3>
                <p>Enter your authentication token to access AICRM.</p>
                <div class="modal-error" id="login-error"></div>
                <input type="text" id="login-token" placeholder="Bearer token" autocomplete="off">
                <div class="modal-actions">
                    <button id="login-cancel">Cancel</button>
                    <button id="login-submit" class="primary">Sign In</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const tokenInput = document.getElementById('login-token');
        const errorEl = document.getElementById('login-error');

        // Focus the token input
        requestAnimationFrame(() => tokenInput.focus());

        const close = () => overlay.remove();

        document.getElementById('login-cancel').addEventListener('click', close);

        // Close on overlay click (not on the box)
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });

        const attemptLogin = async () => {
            const token = tokenInput.value.trim();
            if (!token) {
                errorEl.textContent = 'Please enter a token.';
                return;
            }
            errorEl.textContent = '';
            const result = await Auth.loginWithToken(token);
            if (result.ok) {
                close();
                this._updateAuthStatus();
                this._showAuthBanner(false);
                this._applyAdminOnlyVisibility();
                if (this._currentPage === 'contacts') {
                    await this.renderContacts();
                }
                this.notify('success', `Welcome, ${result.user.display_name || result.user.sub}`);
            } else {
                errorEl.textContent = result.error || 'Invalid token.';
            }
        };

        document.getElementById('login-submit').addEventListener('click', attemptLogin);
        tokenInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') attemptLogin();
        });
    },

    // === Theme ===
    loadTheme() {
        // Load theme from backend settings
        this._loadThemeFromBackend();
    },

    /**
     * Load theme preference from the backend settings.
     * Falls back to 'light' if the backend is unavailable.
     */
    async _loadThemeFromBackend() {
        try {
            const settings = await SettingsDataSource.getSettings();
            if (settings && settings.payload && settings.payload.theme === 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
                const toggle = document.getElementById('theme-toggle');
                if (toggle) toggle.textContent = '🌙';
            }
        } catch (err) {
            console.warn('Could not load theme from backend:', err.message);
            // Default to light theme
        }
    },

    // === Menu Toggle (Mobile) ===
    bindMenuToggle() {
        document.getElementById('menu-toggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
        });
    },

    // === Global Search ===
    bindSearch() {
        const searchInput = document.getElementById('global-search');
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const query = searchInput.value.toLowerCase().trim();
                if (!query) {
                    this.renderCurrentPage();
                    return;
                }
                this.performSearch(query);
            }, 300);
        });
    },

    async performSearch(query) {
        let allContacts;
        try {
            allContacts = await ContactsDataSource.getContacts();
        } catch (err) {
            console.error('Failed to load contacts for search:', err);
            allContacts = [];
        }
        const contacts = allContacts.filter(c =>
            c.name.toLowerCase().includes(query) ||
            (c.email || '').toLowerCase().includes(query) ||
            (c.company || '').toLowerCase().includes(query)
        );

        let allLeads;
        try {
            allLeads = await LeadsDataSource.getLeads();
        } catch (err) {
            console.error('Failed to load leads for search:', err);
            allLeads = [];
        }
        const leads = allLeads.filter(l =>
            l.name.toLowerCase().includes(query) ||
            (l.company || '').toLowerCase().includes(query) ||
            (l.source || '').toLowerCase().includes(query)
        );

        if (contacts.length > 0) {
            this.navigate('contacts');
            this.renderContacts(contacts);
        } else if (leads.length > 0) {
            this.navigate('leads');
            this.renderLeads(leads);
        }
    },

    async renderCurrentPage() {
        if (this.currentPage === 'contacts') await this.renderContacts();
        if (this.currentPage === 'leads') await this.renderLeads();
        if (this.currentPage === 'activities') await this.renderActivities();
    },

    // === Dashboard ===
    async renderDashboard() {
        let contacts;
        try {
            contacts = await ContactsDataSource.getContacts();
        } catch (err) {
            console.error('Failed to load contacts for dashboard:', err);
            contacts = [];
        }
        let leads;
        try {
            leads = await LeadsDataSource.getLeads();
        } catch (err) {
            console.error('Failed to load leads for dashboard:', err);
            leads = [];
        }
        let activities;
        try {
            activities = await ActivitiesDataSource.getActivities();
        } catch (err) {
            console.error('Failed to load activities for dashboard:', err);
            activities = [];
        }
        activities = this._normalizeActivities(activities);
        const today = new Date().toDateString();

        document.getElementById('stat-total-contacts').textContent = contacts.length;
        document.getElementById('stat-total-leads').textContent = leads.length;
        document.getElementById('stat-converted-leads').textContent = leads.filter(l => l.stage === 'won').length;
        document.getElementById('stat-today-activities').textContent = activities.filter(a =>
            new Date(a.date).toDateString() === today
        ).length;

        // Revenue calculations
        const activeLeads = leads.filter(l => l.stage !== 'lost' && l.stage !== 'won');
        const pipelineValue = activeLeads.reduce((sum, l) => sum + (Number(l.value) || 0), 0);
        const wonLeads = leads.filter(l => l.stage === 'won');
        const wonRevenue = wonLeads.reduce((sum, l) => sum + (Number(l.value) || 0), 0);

        document.getElementById('stat-pipeline-value').textContent = this.formatCurrency(pipelineValue);
        document.getElementById('stat-won-revenue').textContent = this.formatCurrency(wonRevenue);

        // Overdue activities
        const overdueCount = this.getOverdueCount();
        document.getElementById('stat-overdue-activities').textContent = overdueCount;

        // Pipeline counts + per-stage revenue
        const stages = ['new', 'contacted', 'qualified', 'proposal', 'won'];
        stages.forEach(stage => {
            const stageLeads = leads.filter(l => l.stage === stage);
            document.getElementById(`pipeline-${stage}`).textContent = stageLeads.length;
            const stageValue = stageLeads.reduce((sum, l) => sum + (Number(l.value) || 0), 0);
            const valueEl = document.getElementById(`pipeline-${stage}-value`);
            if (valueEl) {
                valueEl.textContent = stageValue > 0 ? this.formatCurrency(stageValue) : '';
            }
        });

        // Recent activities
        const recent = activities.slice(-5).reverse();
        const container = document.getElementById('recent-activities');
        if (recent.length === 0) {
            container.innerHTML = '<p class="empty-state">No recent activities</p>';
        } else {
            container.innerHTML = recent.map(a => `
                <div class="activity-item">
                    <span class="activity-type-icon">${this.getActivityIcon(a.type)}</span>
                    <div class="activity-details">
                        <p>${this.escapeHtml(a.description)}</p>
                        <small>${this.formatDate(a.date)}</small>
                    </div>
                </div>
            `).join('');
        }

        // Recommended Actions (AI-Powered Lead Recommendations)
        this.renderRecommendedActions(leads);
    },

    // === AI-Powered Lead Recommendations ===
    async getLeadRecommendations(leads) {
        let activities;
        try {
            activities = await ActivitiesDataSource.getActivities();
        } catch (err) {
            console.error('Failed to load activities for recommendations:', err);
            activities = [];
        }
        activities = this._normalizeActivities(activities);
        const now = new Date();

        // Only active leads (not won or lost)
        const activeLeads = leads.filter(l => l.stage !== 'won' && l.stage !== 'lost');
        if (activeLeads.length === 0) return [];

        // Calculate days since last activity for each lead
        const leadActivityMap = {};
        activities.forEach(a => {
            if (a.leadId) {
                const d = new Date(a.date);
                if (!leadActivityMap[a.leadId] || d > leadActivityMap[a.leadId]) {
                    leadActivityMap[a.leadId] = d;
                }
            }
        });

        // Score each lead for recommendation priority
        const scored = activeLeads.map(lead => {
            const baseScore = this.calculateLeadScore(lead);
            const value = Number(lead.value) || 0;
            const lastActivity = leadActivityMap[lead.id] || new Date(lead.createdAt);
            const daysSinceContact = Math.max(0, Math.floor((now - lastActivity) / 86400000));

            // Recency score: 30 points at day 0, drops to 0 at day 14+
            const recencyScore = Math.max(0, 30 - (daysSinceContact * 30 / 14));
            // Value score: normalize to 0-30 range (max $500k = 30 pts)
            const valueScore = Math.min(30, (value / 500000) * 30);
            // Stale penalty: add urgency for leads not contacted in 7+ days
            const staleBonus = daysSinceContact >= 7 ? 15 : 0;

            const priority = (baseScore * 0.4) + recencyScore + valueScore + staleBonus;

            return { lead, priority, daysSinceContact, value };
        });

        // Sort by priority descending, return top 3
        scored.sort((a, b) => b.priority - a.priority);
        return scored.slice(0, 3);
    },

    async renderRecommendedActions(leads) {
        const recommendations = await this.getLeadRecommendations(leads);
        const container = document.getElementById('recommended-actions');

        if (recommendations.length === 0) {
            container.innerHTML = '<p class="empty-state">No recommendations yet. Add leads to see AI-powered suggestions.</p>';
            return;
        }

        container.innerHTML = recommendations.map(r => {
            const { lead, daysSinceContact, value } = r;
            const score = this.calculateLeadScore(lead);
            const tier = this.getScoreTier(score);
            let suggestion = '';
            let urgency = '';

            if (daysSinceContact >= 7) {
                suggestion = `Follow up — last contacted ${daysSinceContact} days ago`;
                urgency = 'recommendation-urgent';
            } else if (lead.stage === 'new') {
                suggestion = 'Schedule initial outreach';
                urgency = 'recommendation-normal';
            } else if (lead.stage === 'contacted') {
                suggestion = 'Move to qualification stage';
                urgency = 'recommendation-normal';
            } else if (lead.stage === 'qualified') {
                suggestion = 'Prepare proposal';
                urgency = 'recommendation-high';
            } else if (lead.stage === 'proposal') {
                suggestion = 'Follow up on proposal';
                urgency = 'recommendation-urgent';
            } else {
                suggestion = 'Review and advance';
                urgency = 'recommendation-normal';
            }

            return `
                <div class="recommendation-item ${urgency}">
                    <div class="recommendation-header">
                        <span class="recommendation-name" onclick="App.navigate('leads')" style="cursor:pointer">${this.escapeHtml(lead.name)}</span>
                        <span class="score-badge ${tier.class}" title="Score: ${score}/100">${score} ${tier.label}</span>
                    </div>
                    <div class="recommendation-body">
                        <span class="recommendation-suggestion">${suggestion}</span>
                        ${value > 0 ? `<span class="recommendation-value">${this.formatCurrency(value)}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    // === Contacts ===
    bindContacts() {
        document.getElementById('btn-add-contact').addEventListener('click', () => {
            this.editId = null;
            this.editType = 'contact';
            this.showContactModal();
        });

        document.getElementById('contact-filter-status').addEventListener('change', () => this.renderContacts());
        document.getElementById('contact-sort').addEventListener('change', () => this.renderContacts());
        document.getElementById('btn-export-csv').addEventListener('click', () => this.exportContactsCSV());
        document.getElementById('btn-import-csv').addEventListener('click', () => {
            document.getElementById('csv-file-input').click();
        });
        document.getElementById('csv-file-input').addEventListener('change', (e) => this.importContactsCSV(e));
        document.getElementById('btn-find-duplicates').addEventListener('click', () => this.findDuplicates());
    },

    async renderContacts(contactsOverride) {
        let contacts;
        try {
            contacts = contactsOverride || await ContactsDataSource.getContacts();
        } catch (err) {
            console.error('Failed to load contacts:', err);
            document.getElementById('contacts-list').innerHTML =
                `<div class="empty-state-card"><p>⚠️ ${this.escapeHtml(err.message)}</p></div>`;
            return;
        }

        const filterStatus = document.getElementById('contact-filter-status').value;
        const sortMode = document.getElementById('contact-sort').value;

        if (filterStatus) {
            contacts = contacts.filter(c => c.status === filterStatus);
        }

        contacts.sort((a, b) => {
            if (sortMode === 'name-asc') return a.name.localeCompare(b.name);
            if (sortMode === 'name-desc') return b.name.localeCompare(a.name);
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        // Pre-compute duplicate groups for badge display
        let allContacts;
        try {
            allContacts = await ContactsDataSource.getContacts();
        } catch (err) {
            console.error('Failed to load contacts for duplicate check:', err);
            allContacts = contacts;
        }
        const duplicateGroups = this.getDuplicateGroups(allContacts);

        const container = document.getElementById('contacts-list');
        if (contacts.length === 0) {
            container.innerHTML = '<div class="empty-state-card"><p>No contacts found.</p></div>';
            return;
        }

        const isAdmin = Auth.isAdmin();
        container.innerHTML = contacts.map(c => {
            const isDuplicate = duplicateGroups.some(g => g.length > 1 && g.some(d => d.id === c.id));
            return `
            <div class="contact-card${isDuplicate ? ' contact-card-duplicate' : ''}">
                <div class="card-header">
                    <h4>${this.escapeHtml(c.name)}</h4>
                    <div class="card-actions">
                        ${isDuplicate ? '<span class="duplicate-badge" title="Duplicate contact detected">⚠️ Duplicate</span>' : ''}
                        ${isAdmin ? `<button class="card-action-btn" onclick="App.editContact('${c.id}')" title="Edit">✏️</button>` : ''}
                        ${isAdmin ? `<button class="card-action-btn" onclick="App.deleteContact('${c.id}')" title="Delete">🗑️</button>` : ''}
                    </div>
                </div>
                <div class="card-body">
                    ${c.email ? `<p>📧 ${this.escapeHtml(c.email)}</p>` : ''}
                    ${c.phone ? `<p>📱 ${this.escapeHtml(c.phone)}</p>` : ''}
                    ${c.company ? `<p>🏢 ${this.escapeHtml(c.company)}</p>` : ''}
                </div>
                <div class="card-meta">
                    <span class="badge badge-${c.status}">${c.status}</span>
                    <small class="text-secondary">${this.formatDate(c.createdAt)}</small>
                </div>
            </div>
        `}).join('');
    },

    showContactModal(contact) {
        const title = contact ? 'Edit Contact' : 'Add Contact';
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = `
            <form id="contact-form">
                <div class="form-group">
                    <label for="contact-name">Name *</label>
                    <input type="text" id="contact-name" value="${contact ? this.escapeHtml(contact.name) : ''}" required>
                </div>
                <div class="form-group">
                    <label for="contact-email">Email</label>
                    <input type="email" id="contact-email" value="${contact ? this.escapeHtml(contact.email || '') : ''}">
                </div>
                <div class="form-group">
                    <label for="contact-phone">Phone</label>
                    <input type="tel" id="contact-phone" value="${contact ? this.escapeHtml(contact.phone || '') : ''}">
                </div>
                <div class="form-group">
                    <label for="contact-company">Company</label>
                    <input type="text" id="contact-company" value="${contact ? this.escapeHtml(contact.company || '') : ''}">
                </div>
                <div class="form-group">
                    <label for="contact-status">Status</label>
                    <select id="contact-status">
                        <option value="active" ${contact && contact.status === 'active' ? 'selected' : ''}>Active</option>
                        <option value="inactive" ${contact && contact.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                        <option value="vip" ${contact && contact.status === 'vip' ? 'selected' : ''}>VIP</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="contact-notes">Notes</label>
                    <textarea id="contact-notes">${contact ? this.escapeHtml(contact.notes || '') : ''}</textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">${contact ? 'Update' : 'Create'}</button>
                </div>
            </form>
        `;

        document.getElementById('contact-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveContact(contact);
        });

        this.openModal();
    },

    async saveContact(existing) {
        const data = {
            name: document.getElementById('contact-name').value.trim(),
            email: document.getElementById('contact-email').value.trim(),
            phone: document.getElementById('contact-phone').value.trim(),
            company: document.getElementById('contact-company').value.trim(),
            status: document.getElementById('contact-status').value,
            notes: document.getElementById('contact-notes').value.trim()
        };

        if (!data.name) return;

        if (existing) {
            try {
                await ContactsDataSource.updateContact(existing.id, data);
                this.closeModal();
                await this.renderContacts();
                await this.renderDashboard();
                this.showNotification('Contact updated.', 'success');
            } catch (err) {
                console.error('Failed to update contact:', err);
                this.showNotification(this._handleApiError(err), 'error');
            }
        } else {
            // Check for duplicates before saving new contact
            try {
                const allContacts = await ContactsDataSource.getContacts();
                const duplicates = this.findDuplicateContacts(data.name, data.email, data.company, null, allContacts);
                if (duplicates.length > 0) {
                    this.showDuplicateWarning(data, duplicates);
                    return;
                }
            } catch (err) {
                console.error('Failed to load contacts for duplicate check:', err);
                // Continue with create — duplicate check is advisory
            }
            try {
                await ContactsDataSource.createContact(data);
                this.closeModal();
                await this.renderContacts();
                await this.renderDashboard();
                this.showNotification('Contact created.', 'success');
            } catch (err) {
                console.error('Failed to create contact:', err);
                this.showNotification(this._handleApiError(err), 'error');
            }
        }
    },

    async editContact(id) {
        try {
            const contacts = await ContactsDataSource.getContacts();
            const contact = contacts.find(c => c.id === id);
            if (contact) {
                this.showContactModal(contact);
            } else {
                this.showNotification('Contact not found.', 'error');
            }
        } catch (err) {
            console.error('Failed to load contact:', err);
            this.showNotification(this._handleApiError(err), 'error');
        }
    },

    async deleteContact(id) {
        if (!confirm('Are you sure you want to delete this contact?')) return;
        try {
            await ContactsDataSource.deleteContact(id);
            await this.renderContacts();
            await this.renderDashboard();
            this.showNotification('Contact deleted.', 'success');
        } catch (err) {
            console.error('Failed to delete contact:', err);
            this.showNotification(this._handleApiError(err), 'error');
        }
    },

    /**
     * Convert an API error into a user-friendly message.
     * Distinguishes between:
     *   - 401: Authentication required (no/invalid token)
     *   - 403: Forbidden (authenticated but insufficient permissions)
     *   - 422: Validation error (bad request data)
     *   - 503: Backend/database unavailable
     *   - 5xx: Internal server error
     *   - network: Backend unreachable
     *   - other: Pass through original message
     */
    _handleApiError(err) {
        if (!err) return 'An unexpected error occurred.';

        // Auth errors — distinguish unauthenticated vs forbidden
        if (err.status === 401) {
            return 'You must sign in to perform this action.';
        }
        if (err.status === 403) {
            return 'You do not have permission to perform this action.';
        }

        // Validation errors
        if (err.status === 422) {
            return err.message || 'The request contained invalid data. Please check your input.';
        }

        // Service unavailable (database down, etc.)
        if (err.status === 503) {
            return 'The service is temporarily unavailable. Please try again later.';
        }

        // Other server errors (5xx)
        if (err.status >= 500) {
            return 'An internal server error occurred. Please try again later.';
        }

        // Network errors (backend unreachable)
        if (err.type === 'network') {
            return 'Cannot reach the backend server. Please check your connection and try again.';
        }

        // Pass through original message for other cases
        return err.message || 'An unexpected error occurred.';
    },

    /**
     * Show or hide the backend-unavailable banner.
     * This is a persistent, non-dismissable banner shown when the backend
     * is unreachable during startup or when multiple requests fail.
     */
    _showBackendUnavailableBanner(show) {
        let banner = document.getElementById('backend-unavailable-banner');

        if (show) {
            if (!banner) {
                banner = document.createElement('div');
                banner.id = 'backend-unavailable-banner';
                banner.className = 'backend-unavailable-banner active';
                banner.innerHTML =
                    '⚠️ Backend server is unreachable. Some features may not work correctly. ' +
                    '<button id="backend-banner-retry-btn" style="margin-left:8px;cursor:pointer;">Retry</button>';
                const mainContent = document.getElementById('main-content');
                if (mainContent) {
                    mainContent.insertBefore(banner, mainContent.firstChild);
                }
                document.getElementById('backend-banner-retry-btn').addEventListener('click', async () => {
                    const healthy = await ApiClient.isHealthy();
                    if (healthy) {
                        banner.remove();
                        this.showNotification('Backend connection restored.', 'success');
                        await this.renderCurrentPage();
                    } else {
                        this.showNotification('Backend is still unreachable.', 'error');
                    }
                });
            }
        } else if (banner) {
            banner.remove();
        }
    },

    // === Duplicate Detection ===

    /**
     * Find contacts that match the given name/email/company.
     * Matches: exact email (case-insensitive) OR same name+company (both non-empty, case-insensitive).
     * excludeId: optional ID to exclude from results (e.g. when editing an existing contact).
     * contacts: optional contacts array; defaults to reading from data source.
     */
    findDuplicateContacts(name, email, company, excludeId, contacts) {
        if (!contacts) {
            // Caller must pass contacts array — don't block the UI with an await here.
            // This function is synchronous; the caller is responsible for providing the data.
            return [];
        }
        const searchEmail = email ? email.toLowerCase().trim() : '';
        const searchName = name ? name.toLowerCase().trim() : '';
        const searchCompany = company ? company.toLowerCase().trim() : '';

        return contacts.filter(c => {
            if (c.id === excludeId) return false;
            const cEmail = c.email ? c.email.toLowerCase().trim() : '';
            const cName = c.name ? c.name.toLowerCase().trim() : '';
            const cCompany = c.company ? c.company.toLowerCase().trim() : '';

            // Exact email match
            if (searchEmail && cEmail === searchEmail) return true;

            // Name + company match (both must be non-empty)
            if (searchName && searchCompany && cName === searchName && cCompany === searchCompany) return true;

            return false;
        });
    },

    /**
     * Get all duplicate groups from the contact list.
     * Returns an array of arrays, where each inner array contains contacts that are duplicates of each other.
     */
    getDuplicateGroups(contacts) {
        const groups = [];
        const processed = new Set();

        for (const c of contacts) {
            if (processed.has(c.id)) continue;
            const matches = this.findDuplicateContacts(c.name, c.email, c.company, c.id, contacts);
            if (matches.length > 0) {
                groups.push([c, ...matches]);
                processed.add(c.id);
                matches.forEach(m => processed.add(m.id));
            }
        }
        return groups;
    },

    /**
     * Show a warning modal when duplicates are detected during contact creation.
     */
    showDuplicateWarning(newData, duplicates) {
        const duplicateRows = duplicates.map(d => `
            <div class="duplicate-match-card">
                <strong>${this.escapeHtml(d.name)}</strong>
                ${d.email ? `<span>📧 ${this.escapeHtml(d.email)}</span>` : ''}
                ${d.company ? `<span>🏢 ${this.escapeHtml(d.company)}</span>` : ''}
                <div class="duplicate-match-actions">
                    <button class="btn btn-primary btn-sm" onclick="App.mergeWithExisting('${d.id}')">Merge</button>
                </div>
            </div>
        `).join('');

        document.getElementById('modal-title').textContent = '⚠️ Duplicate Contact Detected';
        document.getElementById('modal-body').innerHTML = `
            <p class="text-secondary">A contact with the same email or name+company already exists:</p>
            ${duplicateRows}
            <div class="form-actions" style="margin-top: 1rem;">
                <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
                <button type="button" class="btn btn-primary" id="btn-keep-both">Keep Both</button>
            </div>
        `;
        this._pendingContactData = newData;
        this.openModal();
        document.getElementById('btn-keep-both').addEventListener('click', () => this.saveContactAsNew());
    },

    /**
     * Save the pending contact as a new record (user chose "Keep Both").
     */
    async saveContactAsNew() {
        const data = this._pendingContactData;
        if (!data) return;
        try {
            await ContactsDataSource.createContact(data);
            delete this._pendingContactData;
            this.closeModal();
            await this.renderContacts();
            await this.renderDashboard();
            this.showNotification('Contact created (duplicate kept).', 'info');
        } catch (err) {
            console.error('Failed to create contact:', err);
            this.showNotification(err.message, 'error');
        }
    },

    /**
     * Merge the pending new contact data into an existing contact.
     */
    async mergeWithExisting(keepId) {
        const newData = this._pendingContactData;
        if (!newData) return;

        // Merge: update existing contact with new data where new fields are non-empty
        const updatePayload = {};
        for (const key of ['name', 'email', 'phone', 'company', 'status', 'notes']) {
            if (newData[key]) {
                updatePayload[key] = newData[key];
            }
        }

        try {
            // Get existing contact for notes merging
            const contacts = await ContactsDataSource.getContacts();
            const existing = contacts.find(c => c.id === keepId);
            if (!existing) {
                this.showNotification('Target contact not found.', 'error');
                return;
            }

            // Combine notes if both exist
            if (newData.notes && existing.notes) {
                updatePayload.notes = existing.notes + '\n---\n' + newData.notes;
            }

            await ContactsDataSource.updateContact(keepId, updatePayload);
            delete this._pendingContactData;
            this.closeModal();
            await this.renderContacts();
            await this.renderDashboard();
            this.showNotification(`Merged into "${newData.name}".`, 'success');
        } catch (err) {
            console.error('Failed to merge contact:', err);
            this.showNotification(err.message, 'error');
        }
    },

    /**
     * Scan all contacts for duplicates and show results.
     */
    async findDuplicates() {
        let contacts;
        try {
            contacts = await ContactsDataSource.getContacts();
        } catch (err) {
            console.error('Failed to load contacts:', err);
            this.showNotification(err.message, 'error');
            return;
        }
        const groups = this.getDuplicateGroups(contacts);
        const groupsWithDuplicates = groups.filter(g => g.length > 1);

        if (groupsWithDuplicates.length === 0) {
            this.showNotification('No duplicate contacts found.', 'info');
            return;
        }

        const totalDuplicates = groupsWithDuplicates.reduce((sum, g) => sum + g.length, 0);

        const groupRows = groupsWithDuplicates.map((group, gi) => `
            <div class="duplicate-group">
                <h4>Group ${gi + 1} (${group.length} contacts)</h4>
                ${group.map((c, ci) => `
                    <div class="duplicate-match-card">
                        <strong>${this.escapeHtml(c.name)}</strong>
                        ${c.email ? `<span>📧 ${this.escapeHtml(c.email)}</span>` : ''}
                        ${c.company ? `<span>🏢 ${this.escapeHtml(c.company)}</span>` : ''}
                        <span class="text-secondary">${this.formatDate(c.createdAt)}</span>
                        ${ci < group.length - 1 ? `<div class="duplicate-match-actions">
                            <button class="btn btn-primary btn-sm" onclick="App.mergeContacts('${group[0].id}', '${c.id}')">Merge into first</button>
                        </div>` : '<div class="text-secondary"><em>Keep</em></div>'}
                    </div>
                `).join('')}
            </div>
        `).join('');

        document.getElementById('modal-title').textContent = `🔍 Duplicate Contacts Found`;
        document.getElementById('modal-body').innerHTML = `
            <p class="text-secondary">${totalDuplicates} contacts in ${groupsWithDuplicates.length} group(s) appear to be duplicates:</p>
            ${groupRows}
            <div class="form-actions" style="margin-top: 1rem;">
                <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Close</button>
            </div>
        `;
        this.openModal();
    },

    /**
     * Merge two contacts: keep keepId, remove removeId, combine notes, transfer activities.
     */
    async mergeContacts(keepId, removeId) {
        if (!confirm('Merge the second contact into the first? The second contact will be deleted.')) return;

        try {
            const contacts = await ContactsDataSource.getContacts();
            const keepIdx = contacts.findIndex(c => c.id === keepId);
            const removeIdx = contacts.findIndex(c => c.id === removeId);
            if (keepIdx === -1 || removeIdx === -1) {
                this.showNotification('One or both contacts not found.', 'error');
                return;
            }

            const keep = contacts[keepIdx];
            const remove = contacts[removeIdx];

            // Combine notes
            if (remove.notes) {
                keep.notes = keep.notes
                    ? keep.notes + '\n---\n' + remove.notes
                    : remove.notes;
            }

            // Update kept contact with combined data
            await ContactsDataSource.updateContact(keepId, keep);
            // Delete removed contact
            await ContactsDataSource.deleteContact(removeId);

            // Transfer activities from removed contact to kept contact
            const activities = await ActivitiesDataSource.getActivities();
            activities.forEach(a => {
                if (a.contactName === remove.name) {
                    a.contactName = keep.name;
                }
            });
            // Update each changed activity via backend
            for (const a of activities) {
                if (a.contactName === keep.name) {
                    await ActivitiesDataSource.updateActivity(a.id, { contactName: keep.name });
                }
            }

            this.closeModal();
            await this.renderContacts();
            await this.renderDashboard();
            this.showNotification(`Merged "${remove.name}" into "${keep.name}".`, 'success');
        } catch (err) {
            console.error('Failed to merge contacts:', err);
            this.showNotification(err.message, 'error');
        }
    },

    // === CSV Import/Export ===
    async exportContactsCSV() {
        let contacts;
        try {
            contacts = await ContactsDataSource.getContacts();
        } catch (err) {
            console.error('Failed to load contacts for export:', err);
            this.showNotification(err.message, 'error');
            return;
        }
        if (contacts.length === 0) {
            this.showNotification('No contacts to export.', 'error');
            return;
        }

        const headers = ['Name', 'Email', 'Phone', 'Company', 'Status', 'Notes'];
        const rows = contacts.map(c => [
            `"${(c.name || '').replace(/"/g, '""')}"`,
            `"${(c.email || '').replace(/"/g, '""')}"`,
            `"${(c.phone || '').replace(/"/g, '""')}"`,
            `"${(c.company || '').replace(/"/g, '""')}"`,
            `"${(c.status || 'active').replace(/"/g, '""')}"`,
            `"${(c.notes || '').replace(/"/g, '""')}"`
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `contacts_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        this.showNotification(`Exported ${contacts.length} contacts to CSV.`, 'success');
    },

    async importContactsCSV(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target.result;
                const lines = text.split('\n').filter(l => l.trim());
                if (lines.length < 2) {
                    this.showNotification('CSV file is empty or has no data rows.', 'error');
                    event.target.value = '';
                    return;
                }

                let imported = 0;
                let skipped = 0;

                for (let i = 1; i < lines.length; i++) {
                    const values = this.parseCSVLine(lines[i]);
                    if (values.length < 2 || !values[0]) {
                        skipped++;
                        continue;
                    }

                    const contact = {
                        name: values[0] || '',
                        email: values[1] || '',
                        phone: values[2] || '',
                        company: values[3] || '',
                        status: values[4] || 'active',
                        notes: values[5] || ''
                    };

                    if (contact.name) {
                        try {
                            await ContactsDataSource.createContact(contact);
                            imported++;
                        } catch (err) {
                            console.error(`Failed to import contact "${contact.name}":`, err);
                            skipped++;
                        }
                    } else {
                        skipped++;
                    }
                }

                await this.renderContacts();
                await this.renderDashboard();
                this.showNotification(
                    `Imported ${imported} contacts${skipped > 0 ? ` (${skipped} skipped)` : ''}.`,
                    skipped > imported ? 'error' : 'success'
                );
            } catch (err) {
                this.showNotification('Error parsing CSV: ' + err.message, 'error');
            }
            event.target.value = '';
        };
        reader.readAsText(file);
    },

    // === Lead CSV Export/Import ===
    async exportLeadsCSV() {
        let leads;
        try {
            leads = await LeadsDataSource.getLeads();
        } catch (err) {
            console.error('Failed to load leads for export:', err);
            this.showNotification('Failed to load leads from server.', 'error');
            return;
        }
        if (leads.length === 0) {
            this.showNotification('No leads to export.', 'error');
            return;
        }

        const headers = ['Name', 'Company', 'Email', 'Phone', 'Value', 'Stage', 'Source', 'Notes'];
        const rows = leads.map(l => [
            `"${(l.name || '').replace(/"/g, '""')}"`,
            `"${(l.company || '').replace(/"/g, '""')}"`,
            `"${(l.email || '').replace(/"/g, '""')}"`,
            `"${(l.phone || '').replace(/"/g, '""')}"`,
            `"${(l.value || 0).replace(/"/g, '""')}"`,
            `"${(l.stage || 'new').replace(/"/g, '""')}"`,
            `"${(l.source || '').replace(/"/g, '""')}"`,
            `"${(l.notes || '').replace(/"/g, '""')}"`
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        this.showNotification(`Exported ${leads.length} leads to CSV.`, 'success');
    },

    async importLeadsCSV(event) {
        const file = event.target.files[0];
        if (!file) return;

        const validStages = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];
        const validSources = ['website', 'referral', 'social media', 'cold call', 'event'];

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target.result;
                const lines = text.split('\n').filter(l => l.trim());
                if (lines.length < 2) {
                    this.showNotification('CSV file is empty or has no data rows.', 'error');
                    event.target.value = '';
                    return;
                }

                let imported = 0;
                let skipped = 0;

                for (let i = 1; i < lines.length; i++) {
                    const values = this.parseCSVLine(lines[i]);
                    if (values.length < 2 || !values[0]) {
                        skipped++;
                        continue;
                    }

                    const stage = (values[5] || 'new').toLowerCase();
                    const source = (values[6] || '').toLowerCase();

                    const leadData = {
                        name: values[0] || '',
                        company: values[1] || '',
                        email: values[2] || '',
                        phone: values[3] || '',
                        value: Number(values[4]) || 0,
                        stage: validStages.includes(stage) ? stage : 'new',
                        source: validSources.includes(source) ? source : '',
                        notes: values[7] || '',
                    };

                    if (leadData.name) {
                        try {
                            await LeadsDataSource.createLead(leadData);
                            imported++;
                        } catch (err) {
                            console.error('Failed to import lead:', err);
                            skipped++;
                        }
                    } else {
                        skipped++;
                    }
                }

                await this.renderLeads();
                await this.renderDashboard();
                this.showNotification(
                    `Imported ${imported} leads${skipped > 0 ? ` (${skipped} skipped)` : ''}.`,
                    'success'
                );
            } catch (err) {
                this.showNotification('Error parsing CSV: ' + err.message, 'error');
            }
            event.target.value = '';
        };
        reader.readAsText(file);
    },

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (inQuotes) {
                if (char === '"') {
                    if (i + 1 < line.length && line[i + 1] === '"') {
                        current += '"';
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    current += char;
                }
            } else {
                if (char === '"') {
                    inQuotes = true;
                } else if (char === ',') {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
        }
        result.push(current.trim());
        return result;
    },

    showNotification(message, type) {
        const container = document.getElementById('notification-container');
        const notif = document.createElement('div');
        notif.className = `notification notification-${type || 'info'}`;
        notif.textContent = message;
        container.appendChild(notif);
        setTimeout(() => {
            notif.classList.add('fade-out');
            setTimeout(() => notif.remove(), 300);
        }, 3000);
    },

    // === Lead Scoring ===
    calculateLeadScore(lead) {
        let score = 0;
        const rules = this.getScoringRules();

        // Source scoring
        if (lead.source) {
            score += rules.source[lead.source] || 0;
        }

        // Stage scoring
        if (lead.stage) {
            score += rules.stage[lead.stage] || 0;
        }

        // Value scoring
        const value = Number(lead.value) || 0;
        if (value >= rules.valueThresholds[3]) score += rules.valueScores[3];
        else if (value >= rules.valueThresholds[2]) score += rules.valueScores[2];
        else if (value >= rules.valueThresholds[1]) score += rules.valueScores[1];
        else if (value > 0) score += rules.valueScores[0];

        // Engagement scoring (has contact info)
        if (lead.email) score += rules.engagement.email;
        if (lead.phone) score += rules.engagement.phone;
        if (lead.company) score += rules.engagement.company;
        if (lead.notes) score += rules.engagement.notes;

        return Math.min(score, 100);
    },

    getScoringRules() {
        return {
            source: { 'website': 5, 'referral': 15, 'social': 10, 'cold-call': 5, 'event': 10 },
            stage: { 'new': 0, 'contacted': 10, 'qualified': 25, 'proposal': 40, 'won': 50, 'lost': 0 },
            valueThresholds: [10000, 50000, 100000, Infinity],
            valueScores: [5, 15, 25, 35],
            engagement: { email: 5, phone: 5, company: 10, notes: 5 }
        };
    },

    getScoreTier(score) {
        if (score >= 70) return { label: 'Critical', class: 'score-critical' };
        if (score >= 45) return { label: 'Hot', class: 'score-hot' };
        if (score >= 25) return { label: 'Warm', class: 'score-warm' };
        return { label: 'Cold', class: 'score-cold' };
    },

    // === Leads ===
    bindLeads() {
        document.getElementById('btn-add-lead').addEventListener('click', () => {
            this.editId = null;
            this.editType = 'lead';
            this.showLeadModal();
        });

        document.getElementById('lead-filter-stage').addEventListener('change', () => this.renderLeads());
        document.getElementById('lead-sort').addEventListener('change', () => this.renderLeads());
        document.getElementById('lead-filter-score').addEventListener('change', () => this.renderLeads());
        document.getElementById('btn-export-leads-csv').addEventListener('click', () => this.exportLeadsCSV());
        document.getElementById('btn-import-leads-csv').addEventListener('click', () => {
            document.getElementById('leads-csv-file-input').click();
        });
        document.getElementById('leads-csv-file-input').addEventListener('change', (e) => this.importLeadsCSV(e));
    },

    async renderLeads(leadsOverride) {
        let leads;
        if (leadsOverride) {
            leads = leadsOverride;
        } else {
            try {
                leads = await LeadsDataSource.getLeads();
            } catch (err) {
                console.error('Failed to load leads:', err);
                document.getElementById('leads-list').innerHTML =
                    `<div class="empty-state-card"><p>⚠️ ${this.escapeHtml(err.message)}</p></div>`;
                return;
            }
        }
        const filterStage = document.getElementById('lead-filter-stage').value;
        const filterScore = document.getElementById('lead-filter-score').value;
        const sortMode = document.getElementById('lead-sort').value;

        if (filterStage) {
            leads = leads.filter(l => l.stage === filterStage);
        }

        if (filterScore) {
            leads = leads.filter(l => {
                const score = this.calculateLeadScore(l);
                const tier = this.getScoreTier(score);
                return tier.label.toLowerCase() === filterScore;
            });
        }

        leads.sort((a, b) => {
            if (sortMode === 'value-desc') return (b.value || 0) - (a.value || 0);
            if (sortMode === 'value-asc') return (a.value || 0) - (b.value || 0);
            if (sortMode === 'score-desc') return this.calculateLeadScore(b) - this.calculateLeadScore(a);
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        const container = document.getElementById('leads-list');
        if (leads.length === 0) {
            container.innerHTML = '<div class="empty-state-card"><p>No leads found.</p></div>';
            return;
        }

        container.innerHTML = leads.map(l => {
            const score = this.calculateLeadScore(l);
            const tier = this.getScoreTier(score);
            return `
            <div class="lead-card">
                <div class="card-header">
                    <h4>${this.escapeHtml(l.name)}</h4>
                    <div class="card-actions">
                        <button class="card-action-btn" onclick="App.editLead('${l.id}')" title="Edit">✏️</button>
                        <button class="card-action-btn" onclick="App.deleteLead('${l.id}')" title="Delete">🗑️</button>
                    </div>
                </div>
                <div class="card-body">
                    ${l.company ? `<p>🏢 ${this.escapeHtml(l.company)}</p>` : ''}
                    ${l.email ? `<p>📧 ${this.escapeHtml(l.email)}</p>` : ''}
                    ${l.value ? `<p class="lead-value">$${Number(l.value).toLocaleString()}</p>` : ''}
                </div>
                <div class="card-meta">
                    <span class="badge badge-${l.stage}">${l.stage}</span>
                    <span class="score-badge ${tier.class}" title="Score: ${score}/100">${score} ${tier.label}</span>
                    <small class="text-secondary">${this.formatDate(l.createdAt)}</small>
                </div>
            </div>
        `;}).join('');
    },

    showLeadModal(lead) {
        document.getElementById('modal-title').textContent = lead ? 'Edit Lead' : 'Add Lead';
        document.getElementById('modal-body').innerHTML = `
            <form id="lead-form">
                <div class="form-group">
                    <label for="lead-name">Name *</label>
                    <input type="text" id="lead-name" value="${lead ? this.escapeHtml(lead.name) : ''}" required>
                </div>
                <div class="form-group">
                    <label for="lead-company">Company</label>
                    <input type="text" id="lead-company" value="${lead ? this.escapeHtml(lead.company || '') : ''}">
                </div>
                <div class="form-group">
                    <label for="lead-email">Email</label>
                    <input type="email" id="lead-email" value="${lead ? this.escapeHtml(lead.email || '') : ''}">
                </div>
                <div class="form-group">
                    <label for="lead-phone">Phone</label>
                    <input type="tel" id="lead-phone" value="${lead ? this.escapeHtml(lead.phone || '') : ''}">
                </div>
                <div class="form-group">
                    <label for="lead-value">Estimated Value ($)</label>
                    <input type="number" id="lead-value" min="0" step="100" value="${lead ? (lead.value || '') : ''}">
                </div>
                <div class="form-group">
                    <label for="lead-stage">Stage</label>
                    <select id="lead-stage">
                        <option value="new" ${lead && lead.stage === 'new' ? 'selected' : ''}>New</option>
                        <option value="contacted" ${lead && lead.stage === 'contacted' ? 'selected' : ''}>Contacted</option>
                        <option value="qualified" ${lead && lead.stage === 'qualified' ? 'selected' : ''}>Qualified</option>
                        <option value="proposal" ${lead && lead.stage === 'proposal' ? 'selected' : ''}>Proposal</option>
                        <option value="won" ${lead && lead.stage === 'won' ? 'selected' : ''}>Won</option>
                        <option value="lost" ${lead && lead.stage === 'lost' ? 'selected' : ''}>Lost</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="lead-source">Source</label>
                    <select id="lead-source">
                        <option value="" ${lead && !lead.source ? 'selected' : ''}>Select source</option>
                        <option value="website" ${lead && lead.source === 'website' ? 'selected' : ''}>Website</option>
                        <option value="referral" ${lead && lead.source === 'referral' ? 'selected' : ''}>Referral</option>
                        <option value="social" ${lead && lead.source === 'social' ? 'selected' : ''}>Social Media</option>
                        <option value="cold-call" ${lead && lead.source === 'cold-call' ? 'selected' : ''}>Cold Call</option>
                        <option value="event" ${lead && lead.source === 'event' ? 'selected' : ''}>Event</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="lead-notes">Notes</label>
                    <textarea id="lead-notes">${lead ? this.escapeHtml(lead.notes || '') : ''}</textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">${lead ? 'Update' : 'Create'}</button>
                </div>
            </form>
        `;

        document.getElementById('lead-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveLead(lead);
        });

        this.openModal();
    },

    async saveLead(existing) {
        const data = {
            name: document.getElementById('lead-name').value.trim(),
            company: document.getElementById('lead-company').value.trim(),
            email: document.getElementById('lead-email').value.trim(),
            phone: document.getElementById('lead-phone').value.trim(),
            value: document.getElementById('lead-value').value || null,
            stage: document.getElementById('lead-stage').value,
            source: document.getElementById('lead-source').value,
            notes: document.getElementById('lead-notes').value.trim()
        };

        if (!data.name) return;

        try {
            if (existing) {
                await LeadsDataSource.updateLead(existing.id, data);
                this.showNotification('Lead updated.', 'success');
            } else {
                await LeadsDataSource.createLead(data);
                this.showNotification('Lead created.', 'success');
            }
        } catch (err) {
            this.showNotification(this._handleApiError(err), 'error');
            return;
        }

        this.closeModal();
        await this.renderLeads();
        await this.renderDashboard();
    },

    async editLead(id) {
        try {
            const leads = await LeadsDataSource.getLeads();
            const lead = leads.find(l => l.id === id);
            if (lead) this.showLeadModal(lead);
        } catch (err) {
            console.error('Failed to load lead for editing:', err);
            this.showNotification('Failed to load lead.', 'error');
        }
    },

    async deleteLead(id) {
        if (!confirm('Are you sure you want to delete this lead?')) return;
        try {
            await LeadsDataSource.deleteLead(id);
            this.showNotification('Lead deleted.', 'success');
            await this.renderLeads();
            await this.renderDashboard();
        } catch (err) {
            this.showNotification(this._handleApiError(err), 'error');
        }
    },

    // === Activities ===
    bindActivities() {
        document.getElementById('btn-add-activity').addEventListener('click', async () => {
            await this.showActivityModal();
        });

        document.getElementById('activity-filter-type').addEventListener('change', () => this.renderActivities());
        const statusFilter = document.getElementById('activity-filter-status');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.renderActivities());
        }
    },

    /**
     * Normalize backend activity field names to frontend field names.
     * Backend uses occurred_at, due_date, contact_name; frontend uses date, dueDate, contactName.
     */
    _normalizeActivities(activities) {
        return activities.map(a => ({
            ...a,
            date: a.date || a.occurred_at,
            dueDate: a.dueDate || a.due_date,
            contactName: a.contactName || a.contact_name,
            status: a.status || 'pending',
        }));
    },

    async renderActivities() {
        let activities;
        try {
            activities = await ActivitiesDataSource.getActivities();
        } catch (err) {
            console.error('Failed to load activities:', err);
            activities = [];
        }
        activities = this._normalizeActivities(activities);
        const filterType = document.getElementById('activity-filter-type').value;
        const filterStatus = document.getElementById('activity-filter-status') ? document.getElementById('activity-filter-status').value : '';

        if (filterType) {
            activities = activities.filter(a => a.type === filterType);
        }

        if (filterStatus === 'overdue') {
            activities = activities.filter(a => a.dueDate && a.status !== 'completed' && this.isOverdue(a.dueDate));
        } else if (filterStatus === 'completed') {
            activities = activities.filter(a => a.status === 'completed');
        } else if (filterStatus === 'active') {
            activities = activities.filter(a => a.status !== 'completed');
        }

        // Sort: overdue first, then by due date, then by date descending
        activities.sort((a, b) => {
            const aOverdue = a.dueDate && a.status !== 'completed' && this.isOverdue(a.dueDate) ? 0 : 1;
            const bOverdue = b.dueDate && b.status !== 'completed' && this.isOverdue(b.dueDate) ? 0 : 1;
            if (aOverdue !== bOverdue) return aOverdue - bOverdue;
            if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
            if (a.dueDate) return -1;
            if (b.dueDate) return 1;
            return new Date(b.date) - new Date(a.date);
        });

        const container = document.getElementById('activities-list');
        if (activities.length === 0) {
            container.innerHTML = '<div class="empty-state-card"><p>No activities found.</p></div>';
            return;
        }

        container.innerHTML = activities.map(a => {
            const isCompleted = a.status === 'completed';
            const isOverdue = a.dueDate && !isCompleted && this.isOverdue(a.dueDate);
            const overdueClass = isOverdue ? ' activity-overdue' : '';
            const completedClass = isCompleted ? ' activity-completed' : '';
            const dueDateHtml = a.dueDate ? `
                <span class="activity-due-date ${isOverdue ? 'due-overdue' : ''}">
                    ${isOverdue ? '⚠️ ' : '📅 '}Due: ${this.formatDateShort(a.dueDate)}
                </span>` : '';

            return `
            <div class="timeline-item${overdueClass}${completedClass}">
                <div class="timeline-marker">
                    <div class="timeline-dot"></div>
                </div>
                <div class="timeline-content">
                    <div class="timeline-header">
                        <h4>${this.getActivityIcon(a.type)} ${this.escapeHtml(a.type.charAt(0).toUpperCase() + a.type.slice(1))}</h4>
                        <div class="card-actions">
                            ${!isCompleted ? `<button class="card-action-btn btn-mark-complete" onclick="App.markActivityComplete('${a.id}')" title="Mark Complete">✅</button>` : ''}
                            <button class="card-action-btn" onclick="App.deleteActivity('${a.id}')" title="Delete">🗑️</button>
                        </div>
                    </div>
                    <p>${this.escapeHtml(a.description)}</p>
                    ${a.contactName ? `<p><small>Related: ${this.escapeHtml(a.contactName)}</small></p>` : ''}
                    <div class="activity-meta">
                        <span class="timeline-date">${this.formatDate(a.date)}</span>
                        ${dueDateHtml}
                    </div>
                </div>
            </div>
        `}).join('');
    },

    isOverdue(dueDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return new Date(dueDate) < today;
    },

    async getOverdueCount() {
        let activities;
        try {
            activities = await ActivitiesDataSource.getActivities();
        } catch (err) {
            console.error('Failed to load activities for overdue count:', err);
            return 0;
        }
        activities = this._normalizeActivities(activities);
        return activities.filter(a => a.dueDate && a.status !== 'completed' && this.isOverdue(a.dueDate)).length;
    },

    async markActivityComplete(id) {
        try {
            await ActivitiesDataSource.updateActivity(id, { status: 'completed' });
            await this.renderActivities();
            await this.renderDashboard();
            await this.updateOverdueBadge();
            this.showNotification('Activity marked as complete', 'success');
        } catch (err) {
            this.showNotification('Failed to update activity.', 'error');
        }
    },

    async updateOverdueBadge() {
        const count = await this.getOverdueCount();
        const badge = document.getElementById('overdue-badge');
        if (badge) {
            if (count > 0) {
                badge.textContent = count;
                badge.style.display = 'inline';
            } else {
                badge.style.display = 'none';
            }
        }
    },

    async showActivityModal(activity) {
        document.getElementById('modal-title').textContent = activity ? 'Edit Activity' : 'Add Activity';
        let contacts;
        try {
            contacts = await ContactsDataSource.getContacts();
        } catch (err) {
            console.error('Failed to load contacts for activity modal:', err);
            contacts = [];
        }
        // Normalize activity fields for display
        if (activity) {
            activity = this._normalizeActivities([activity])[0];
        }
        const contactOptions = contacts.map(c =>
            `<option value="${c.name}" ${activity && activity.contactName === c.name ? 'selected' : ''}>${this.escapeHtml(c.name)}</option>`
        ).join('');

        document.getElementById('modal-body').innerHTML = `
            <form id="activity-form">
                <div class="form-group">
                    <label for="activity-type">Type *</label>
                    <select id="activity-type" required>
                        <option value="call" ${activity && activity.type === 'call' ? 'selected' : ''}>📞 Call</option>
                        <option value="email" ${activity && activity.type === 'email' ? 'selected' : ''}>📧 Email</option>
                        <option value="meeting" ${activity && activity.type === 'meeting' ? 'selected' : ''}>🤝 Meeting</option>
                        <option value="note" ${activity && activity.type === 'note' ? 'selected' : ''}>📝 Note</option>
                        <option value="task" ${activity && activity.type === 'task' ? 'selected' : ''}>✅ Task</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="activity-description">Description *</label>
                    <textarea id="activity-description" required>${activity ? this.escapeHtml(activity.description || '') : ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="activity-contact">Related Contact</label>
                    <select id="activity-contact">
                        <option value="">None</option>
                        ${contactOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="activity-date">Date</label>
                    <input type="datetime-local" id="activity-date" value="${activity ? this.toLocalDatetime(activity.date) : this.toLocalDatetime(new Date().toISOString())}">
                </div>
                <div class="form-group">
                    <label for="activity-due-date">Due Date</label>
                    <input type="date" id="activity-due-date" value="${activity ? (activity.dueDate || '') : ''}">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">${activity ? 'Update' : 'Create'}</button>
                </div>
            </form>
        `;

        document.getElementById('activity-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveActivity(activity);
        });

        this.openModal();
    },

    async saveActivity(existing) {
        const data = {
            type: document.getElementById('activity-type').value,
            description: document.getElementById('activity-description').value.trim(),
            contactName: document.getElementById('activity-contact').value,
            date: document.getElementById('activity-date').value ?
                new Date(document.getElementById('activity-date').value).toISOString() :
                new Date().toISOString(),
            dueDate: document.getElementById('activity-due-date').value || null,
            status: existing ? (existing.status || 'pending') : 'pending',
        };

        if (!data.description) return;

        try {
            if (existing) {
                const updated = await ActivitiesDataSource.updateActivity(existing.id, data);
                if (!updated) {
                    this.showNotification('Failed to update activity. Admin access required.', 'error');
                    return;
                }
            } else {
                const created = await ActivitiesDataSource.createActivity(data);
                if (!created) {
                    this.showNotification('Failed to create activity. Admin access required.', 'error');
                    return;
                }
            }
            this.closeModal();
            await this.renderActivities();
            await this.renderDashboard();
            await this.updateOverdueBadge();
            this.showNotification(existing ? 'Activity updated.' : 'Activity created.', 'success');
        } catch (err) {
            this.showNotification('Failed to save activity.', 'error');
        }
    },

    async deleteActivity(id) {
        if (!confirm('Are you sure you want to delete this activity?')) return;
        try {
            await ActivitiesDataSource.deleteActivity(id);
            await this.renderActivities();
            await this.renderDashboard();
            await this.updateOverdueBadge();
            this.showNotification('Activity deleted.', 'success');
        } catch (err) {
            this.showNotification('Failed to delete activity.', 'error');
        }
    },

    // === Email Templates ===
    bindTemplates() {
        document.getElementById('btn-add-template').addEventListener('click', () => {
            if (!Auth.isAdmin()) {
                this.showNotification('Only administrators can create templates.', 'error');
                return;
            }
            this.showTemplateModal();
        });

        document.getElementById('template-filter-category').addEventListener('change', () => this.renderTemplates());

        // Variable help - click to insert
        document.querySelectorAll('#template-variable-help code').forEach(codeEl => {
            codeEl.addEventListener('click', () => {
                const textarea = document.getElementById('template-body');
                if (textarea && document.activeElement === textarea) {
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const text = textarea.value;
                    const varText = codeEl.textContent;
                    textarea.value = text.substring(0, start) + varText + text.substring(end);
                    textarea.selectionStart = textarea.selectionEnd = start + varText.length;
                    textarea.focus();
                }
            });
        });
    },

    async renderTemplates() {
        let templates;
        try {
            templates = await TemplatesDataSource.getTemplates();
        } catch (err) {
            console.error('Failed to load templates:', err);
            document.getElementById('templates-list').innerHTML =
                `<div class="empty-state-card"><p>⚠️ ${this.escapeHtml(err.message)}</p></div>`;
            return;
        }

        const filterCategory = document.getElementById('template-filter-category').value;
        if (filterCategory) {
            templates = templates.filter(t => t.category === filterCategory);
        }

        // Sort by most recently created
        templates.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const container = document.getElementById('templates-list');
        if (templates.length === 0) {
            container.innerHTML = '<div class="empty-state-card"><p>No templates found.</p></div>';
            return;
        }

        const isAdmin = Auth.isAdmin();
        container.innerHTML = templates.map(t => {
            const preview = (t.body || '').replace(/\{\{[^}]+\}\}/g, '[var]').slice(0, 150);
            return `
                <div class="template-card">
                    <div class="template-card-header">
                        <h4>${this.escapeHtml(t.name)}</h4>
                        <span class="template-category-badge ${t.category}">${this.escapeHtml(t.category)}</span>
                    </div>
                    <div class="template-subject">${this.escapeHtml(t.subject || 'No subject')}</div>
                    <div class="template-preview">${this.escapeHtml(preview)}</div>
                    <div class="template-actions">
                        ${isAdmin ? `<button class="btn-edit-template" onclick="App.editTemplate('${t.id}')">Edit</button>` : ''}
                        ${isAdmin ? `<button class="btn-delete-template" onclick="App.deleteTemplate('${t.id}')">Delete</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    showTemplateModal(template) {
        document.getElementById('modal-title').textContent = template ? 'Edit Template' : 'Add Template';
        const categories = ['follow-up', 'introduction', 'proposal', 'thank-you', 'meeting', 'other'];

        document.getElementById('modal-body').innerHTML = `
            <form id="template-form" class="template-form">
                <div class="form-row">
                    <div class="form-group">
                        <label for="template-name">Template Name *</label>
                        <input type="text" id="template-name" value="${template ? this.escapeHtml(template.name) : ''}" required placeholder="e.g. Welcome Email">
                    </div>
                    <div class="form-group">
                        <label for="template-category">Category</label>
                        <select id="template-category">
                            ${categories.map(cat => `<option value="${cat}" ${template && template.category === cat ? 'selected' : ''}>${cat.charAt(0).toUpperCase() + cat.slice(1)}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label for="template-subject">Email Subject</label>
                    <input type="text" id="template-subject" value="${template ? this.escapeHtml(template.subject || '') : ''}" placeholder="e.g. Welcome to {{contact_company}}!">
                </div>
                <div class="form-group">
                    <label for="template-body">Email Body *</label>
                    <textarea id="template-body" required placeholder="Dear {{contact_name}},

Thank you for your interest...">${template ? this.escapeHtml(template.body || '') : ''}</textarea>
                    <div class="variable-chips">
                        <span class="variable-chip" onclick="App.insertVariable('{{contact_name}}')">{{contact_name}}</span>
                        <span class="variable-chip" onclick="App.insertVariable('{{contact_email}}')">{{contact_email}}</span>
                        <span class="variable-chip" onclick="App.insertVariable('{{contact_phone}}')">{{contact_phone}}</span>
                        <span class="variable-chip" onclick="App.insertVariable('{{contact_company}}')">{{contact_company}}</span>
                        <span class="variable-chip" onclick="App.insertVariable('{{lead_name}}')">{{lead_name}}</span>
                        <span class="variable-chip" onclick="App.insertVariable('{{lead_company}}')">{{lead_company}}</span>
                        <span class="variable-chip" onclick="App.insertVariable('{{lead_value}}')">{{lead_value}}</span>
                    </div>
                </div>
                <div class="template-form-actions">
                    <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">${template ? 'Update' : 'Create'}</button>
                </div>
            </form>
        `;

        document.getElementById('template-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTemplate(template);
        });

        this.openModal();
    },

    insertVariable(variable) {
        const textarea = document.getElementById('template-body');
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        textarea.value = text.substring(0, start) + variable + text.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + variable.length;
        textarea.focus();
    },

    async saveTemplate(existing) {
        const data = {
            name: document.getElementById('template-name').value.trim(),
            category: document.getElementById('template-category').value,
            subject: document.getElementById('template-subject').value.trim(),
            body: document.getElementById('template-body').value.trim()
        };

        if (!data.name || !data.body) return;

        try {
            if (existing) {
                await TemplatesDataSource.updateTemplate(existing.id, data);
            } else {
                await TemplatesDataSource.createTemplate(data);
            }
            this.closeModal();
            await this.renderTemplates();
            this.showNotification(`Template "${data.name}" saved.`, 'success');
        } catch (err) {
            console.error('Failed to save template:', err);
            this.showNotification(this._handleApiError(err), 'error');
        }
    },

    async editTemplate(id) {
        if (!Auth.isAdmin()) {
            this.showNotification('Only administrators can edit templates.', 'error');
            return;
        }
        try {
            const templates = await TemplatesDataSource.getTemplates();
            const template = templates.find(t => t.id === id);
            if (template) {
                this.showTemplateModal(template);
            } else {
                this.showNotification('Template not found.', 'error');
            }
        } catch (err) {
            console.error('Failed to load template:', err);
            this.showNotification(this._handleApiError(err), 'error');
        }
    },

    async deleteTemplate(id) {
        if (!Auth.isAdmin()) {
            this.showNotification('Only administrators can delete templates.', 'error');
            return;
        }
        if (!confirm('Are you sure you want to delete this template?')) return;
        try {
            await TemplatesDataSource.deleteTemplate(id);
            await this.renderTemplates();
            this.showNotification('Template deleted.', 'success');
        } catch (err) {
            console.error('Failed to delete template:', err);
            this.showNotification(this._handleApiError(err), 'error');
        }
    },

    // === Settings ===
    bindSettings() {
        document.getElementById('btn-clear-data').addEventListener('click', () => this.clearData());
        document.getElementById('btn-create-backup').addEventListener('click', () => this.createBackup());
        document.getElementById('btn-restore-backup').addEventListener('click', () => {
            document.getElementById('backup-file-input').click();
        });
        document.getElementById('backup-file-input').addEventListener('change', (e) => this.restoreBackup(e));
    },

    /**
     * Reset settings to defaults via the backend.
     * Only affects Settings — all other business data remains intact.
     */
    async clearData() {
        if (!confirm('Reset settings to defaults?\n\nThis will clear all current settings on the backend. Business data (Contacts, Templates, Leads, Activities) will not be affected.')) return;
        try {
            await SettingsDataSource.updateSettings({});
            this.showNotification('Settings reset to defaults on the backend.', 'success');
            this.renderCurrentPage();
            this.renderDashboard();
        } catch (err) {
            this.showNotification(`Failed to reset settings: ${err.message}`, 'error');
        }
    },

    // === Settings Backup and Restore ===
    /**
     * Create a settings backup from the backend.
     * This is a client-side convenience export — not a full system backup.
     */
    async createBackup() {
        try {
            const settings = await SettingsDataSource.getSettings();
            const version = await APP_VERSION;
            const backup = {
                metadata: {
                    appName: 'AICRM',
                    version: version,
                    createdAt: new Date().toISOString(),
                    scope: 'backend-managed',
                    note: 'This backup contains settings from the backend. All AICRM data is backend-managed.',
                    summary: {}
                },
                data: { SETTINGS: settings.payload }
            };
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `aicrm_backup_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            // Update last backup timestamp on backend
            await SettingsDataSource.updateSettings({ lastBackup: new Date().toISOString() });
            this.updateLastBackupDisplay(settings);
            this.showNotification('Backup created from backend settings.', 'success');
        } catch (err) {
            this.showNotification(`Backup failed: ${err.message}`, 'error');
        }
    },

    restoreBackup(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const backup = JSON.parse(e.target.result);
                // Validate backup structure
                if (!backup.metadata || !backup.data) {
                    throw new Error('Invalid backup file: missing metadata or data sections');
                }
                // Show merge/replace dialog
                this._showRestoreDialog(backup);
            } catch (err) {
                this.showNotification('Restore failed: ' + err.message, 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    },

    _showRestoreDialog(backup) {
        const modalBody = document.getElementById('modal-body');
        document.getElementById('modal-title').textContent = 'Restore Settings Backup';
        modalBody.innerHTML = `
            <div class="restore-dialog">
                <div class="restore-info">
                    <p><strong>Backup date:</strong> ${new Date(backup.metadata.createdAt).toLocaleString()}</p>
                    <p><strong>Version:</strong> ${backup.metadata.version || 'Unknown'}</p>
                    <p><strong>Contents:</strong> Settings</p>
                </div>
                <p>How would you like to restore this backup?</p>
                <div class="restore-actions">
                    <button id="btn-restore-replace" class="btn btn-primary">Replace Settings</button>
                    <button id="btn-restore-merge" class="btn btn-secondary">Merge with Existing</button>
                    <button id="btn-restore-cancel" class="btn btn-danger">Cancel</button>
                </div>
            </div>
        `;
        this.openModal();
        // Store backup data for the restore action
        this._pendingBackup = backup;
        document.getElementById('btn-restore-replace').addEventListener('click', () => {
            this._executeRestore(backup, 'replace');
            this.closeModal();
        });
        document.getElementById('btn-restore-merge').addEventListener('click', () => {
            this._executeRestore(backup, 'merge');
            this.closeModal();
        });
        document.getElementById('btn-restore-cancel').addEventListener('click', () => {
            this.closeModal();
        });
    },

    /**
     * Execute restore by pushing settings to the backend.
     */
    async _executeRestore(backup, mode) {
        const data = backup.data || backup;
        const backupSettings = data.SETTINGS || {};

        try {
            if (mode === 'replace') {
                await SettingsDataSource.updateSettings(backupSettings);
            } else {
                // Merge: get current backend settings, merge, push back
                const current = await SettingsDataSource.getSettings();
                const merged = { ...current.payload, ...backupSettings };
                await SettingsDataSource.updateSettings(merged);
            }

            this.renderCurrentPage();
            this.renderDashboard();
            const modeLabel = mode === 'replace' ? 'Replaced' : 'Merged';
            this.showNotification(`${modeLabel} settings on the backend.`, 'success');
        } catch (err) {
            this.showNotification(`Restore failed: ${err.message}`, 'error');
        }
    },

    updateLastBackupDisplay(settings) {
        const el = document.getElementById('last-backup-date');
        if (!el) return;
        // If settings object passed in, use it; otherwise load from backend
        const payload = settings ? settings.payload : null;
        if (payload && payload.lastBackup) {
            el.textContent = new Date(payload.lastBackup).toLocaleString();
        } else {
            // Load from backend asynchronously
            this._loadLastBackupFromBackend();
        }
    },

    async _loadLastBackupFromBackend() {
        const el = document.getElementById('last-backup-date');
        if (!el) return;
        try {
            const settings = await SettingsDataSource.getSettings();
            if (settings && settings.payload && settings.payload.lastBackup) {
                el.textContent = new Date(settings.payload.lastBackup).toLocaleString();
            } else {
                el.textContent = 'Never';
            }
        } catch (err) {
            console.warn('Could not load last backup date from backend:', err.message);
            el.textContent = 'N/A';
        }
    },

    // === Modal ===
    bindModal() {
        document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
        document.getElementById('modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeModal();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
        });
    },

    openModal() {
        const overlay = document.getElementById('modal-overlay');
        overlay.classList.remove('hidden');
        overlay.classList.add('active');
    },

    closeModal() {
        const overlay = document.getElementById('modal-overlay');
        overlay.classList.add('hidden');
        overlay.classList.remove('active');
        document.getElementById('modal-body').innerHTML = '';
    },

    // === Keyboard Shortcuts ===
    bindKeyboardShortcuts() {
        // Bind the shortcuts help button
        document.getElementById('shortcuts-toggle').addEventListener('click', () => this.showShortcutsModal());

        // Global keyboard listener
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in inputs (except special keys)
            const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);

            // ? (Shift+/) opens shortcuts help - check BEFORE /
            if (e.key === '?' && !isInput) {
                e.preventDefault();
                this.showShortcutsModal();
                return;
            }

            // / focuses search bar
            if (e.key === '/' && !isInput) {
                e.preventDefault();
                document.getElementById('global-search').focus();
                return;
            }

            // If user is typing in a text field, only handle Escape
            if (isInput) return;

            // Number keys for navigation (1-5)
            if (e.key >= '1' && e.key <= '5' && !e.ctrlKey && !e.metaKey) {
                const pages = ['dashboard', 'contacts', 'leads', 'activities', 'templates'];
                const idx = parseInt(e.key) - 1;
                if (idx < pages.length) {
                    e.preventDefault();
                    this.navigate(pages[idx]);
                }
                return;
            }

            // Ctrl/Cmd shortcuts
            if (e.ctrlKey || e.metaKey) {
                if (e.key.toLowerCase() === 'n') {
                    e.preventDefault();
                    this.showContactModal();
                } else if (e.key.toLowerCase() === 'l') {
                    e.preventDefault();
                    this.showLeadModal();
                } else if (e.key.toLowerCase() === 'e') {
                    e.preventDefault();
                    this.exportCurrentPageCSV();
                }
            }
        });
    },

    showShortcutsModal() {
        document.getElementById('modal-title').textContent = 'Keyboard Shortcuts';
        document.getElementById('modal-body').innerHTML = `
            <div class="shortcuts-help">
                <div class="shortcut-section">
                    <h4>Navigation</h4>
                    <div class="shortcut-row"><kbd>1</kbd><span>Dashboard</span></div>
                    <div class="shortcut-row"><kbd>2</kbd><span>Contacts</span></div>
                    <div class="shortcut-row"><kbd>3</kbd><span>Leads</span></div>
                    <div class="shortcut-row"><kbd>4</kbd><span>Activities</span></div>
                    <div class="shortcut-row"><kbd>5</kbd><span>Templates</span></div>
                </div>
                <div class="shortcut-section">
                    <h4>Actions</h4>
                    <div class="shortcut-row"><kbd>/</kbd><span>Focus search bar</span></div>
                    <div class="shortcut-row"><kbd>Ctrl</kbd>+<kbd>N</kbd><span>New Contact</span></div>
                    <div class="shortcut-row"><kbd>Ctrl</kbd>+<kbd>L</kbd><span>New Lead</span></div>
                    <div class="shortcut-row"><kbd>Ctrl</kbd>+<kbd>E</kbd><span>Export CSV</span></div>
                    <div class="shortcut-row"><kbd>Esc</kbd><span>Close modal</span></div>
                    <div class="shortcut-row"><kbd>?</kbd><span>Show this help</span></div>
                </div>
            </div>
        `;
        this.openModal();
    },

    exportCurrentPageCSV() {
        if (this.currentPage === 'contacts') {
            this.exportContactsCSV();
        } else if (this.currentPage === 'leads') {
            this.exportLeadsCSV();
        } else {
            this.showNotification('CSV export is available on Contacts and Leads pages.', 'info');
        }
    },

    // === Helpers ===
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    formatDate(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    },

    formatDateShort(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    },

    toLocalDatetime(isoStr) {
        const d = new Date(isoStr);
        const offset = d.getTimezoneOffset();
        const local = new Date(d.getTime() - offset * 60000);
        return local.toISOString().slice(0, 16);
    },

    getActivityIcon(type) {
        const icons = {
            call: '📞',
            email: '📧',
            meeting: '🤝',
            note: '📝',
            task: '✅'
        };
        return icons[type] || '📋';
    },

    formatCurrency(value) {
        return '$' + Number(value || 0).toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
