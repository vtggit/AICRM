/**
 * AICRM - Main Application Logic
 */
const App = {
    currentPage: 'dashboard',
    editId: null,
    editType: null,

    init() {
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
        this.loadTheme();
        this.renderDashboard();
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

    navigate(page) {
        this.currentPage = page;
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelector(`.nav-item[data-page="${page}"]`).classList.add('active');
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(`page-${page}`).classList.add('active');
        document.getElementById('page-title').textContent = this.getPageTitle(page);

        if (page === 'dashboard') this.renderDashboard();
        if (page === 'contacts') this.renderContacts();
        if (page === 'leads') this.renderLeads();
        if (page === 'activities') this.renderActivities();
        if (page === 'templates') this.renderTemplates();

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
        document.getElementById('theme-toggle').addEventListener('click', () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
            document.getElementById('theme-toggle').textContent = isDark ? '🌙' : '☀️';
            Storage.set(Storage.KEYS.SETTINGS, { theme: isDark ? 'light' : 'dark' });
        });
    },

    loadTheme() {
        const settings = Storage.get(Storage.KEYS.SETTINGS);
        if (settings.theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            document.getElementById('theme-toggle').textContent = '☀️';
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

    performSearch(query) {
        const contacts = Storage.get(Storage.KEYS.CONTACTS).filter(c =>
            c.name.toLowerCase().includes(query) ||
            (c.email || '').toLowerCase().includes(query) ||
            (c.company || '').toLowerCase().includes(query)
        );

        const leads = Storage.get(Storage.KEYS.LEADS).filter(l =>
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

    renderCurrentPage() {
        if (this.currentPage === 'contacts') this.renderContacts();
        if (this.currentPage === 'leads') this.renderLeads();
        if (this.currentPage === 'activities') this.renderActivities();
    },

    // === Dashboard ===
    renderDashboard() {
        const contacts = Storage.get(Storage.KEYS.CONTACTS);
        const leads = Storage.get(Storage.KEYS.LEADS);
        const activities = Storage.get(Storage.KEYS.ACTIVITIES);
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
        this.renderRecommendedActions();
    },

    // === AI-Powered Lead Recommendations ===
    getLeadRecommendations() {
        const leads = Storage.get(Storage.KEYS.LEADS);
        const activities = Storage.get(Storage.KEYS.ACTIVITIES);
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

    renderRecommendedActions() {
        const recommendations = this.getLeadRecommendations();
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
                        <span class="score-badge ${tier.class}" title="Score: ${score}/100">${score}</span>
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
    },

    renderContacts(contactsOverride) {
        let contacts = contactsOverride || Storage.get(Storage.KEYS.CONTACTS);
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

        const container = document.getElementById('contacts-list');
        if (contacts.length === 0) {
            container.innerHTML = '<div class="empty-state-card"><p>No contacts found.</p></div>';
            return;
        }

        container.innerHTML = contacts.map(c => `
            <div class="contact-card">
                <div class="card-header">
                    <h4>${this.escapeHtml(c.name)}</h4>
                    <div class="card-actions">
                        <button class="card-action-btn" onclick="App.editContact('${c.id}')" title="Edit">✏️</button>
                        <button class="card-action-btn" onclick="App.deleteContact('${c.id}')" title="Delete">🗑️</button>
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
        `).join('');
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

    saveContact(existing) {
        const data = {
            name: document.getElementById('contact-name').value.trim(),
            email: document.getElementById('contact-email').value.trim(),
            phone: document.getElementById('contact-phone').value.trim(),
            company: document.getElementById('contact-company').value.trim(),
            status: document.getElementById('contact-status').value,
            notes: document.getElementById('contact-notes').value.trim()
        };

        if (!data.name) return;

        const contacts = Storage.get(Storage.KEYS.CONTACTS);

        if (existing) {
            const idx = contacts.findIndex(c => c.id === existing.id);
            if (idx !== -1) {
                contacts[idx] = { ...contacts[idx], ...data };
            }
        } else {
            data.id = Storage.generateId();
            data.createdAt = new Date().toISOString();
            contacts.push(data);
        }

        Storage.set(Storage.KEYS.CONTACTS, contacts);
        this.closeModal();
        this.renderContacts();
        this.renderDashboard();
    },

    editContact(id) {
        const contacts = Storage.get(Storage.KEYS.CONTACTS);
        const contact = contacts.find(c => c.id === id);
        if (contact) this.showContactModal(contact);
    },

    deleteContact(id) {
        if (!confirm('Are you sure you want to delete this contact?')) return;
        const contacts = Storage.get(Storage.KEYS.CONTACTS).filter(c => c.id !== id);
        Storage.set(Storage.KEYS.CONTACTS, contacts);
        this.renderContacts();
        this.renderDashboard();
    },

    // === CSV Import/Export ===
    exportContactsCSV() {
        const contacts = Storage.get(Storage.KEYS.CONTACTS);
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

    importContactsCSV(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const lines = text.split('\n').filter(l => l.trim());
                if (lines.length < 2) {
                    this.showNotification('CSV file is empty or has no data rows.', 'error');
                    event.target.value = '';
                    return;
                }

                const existingContacts = Storage.get(Storage.KEYS.CONTACTS);
                let imported = 0;
                let skipped = 0;

                for (let i = 1; i < lines.length; i++) {
                    const values = this.parseCSVLine(lines[i]);
                    if (values.length < 2 || !values[0]) {
                        skipped++;
                        continue;
                    }

                    const contact = {
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                        name: values[0] || '',
                        email: values[1] || '',
                        phone: values[2] || '',
                        company: values[3] || '',
                        status: values[4] || 'active',
                        notes: values[5] || '',
                        createdAt: new Date().toISOString()
                    };

                    if (contact.name) {
                        existingContacts.push(contact);
                        imported++;
                    } else {
                        skipped++;
                    }
                }

                Storage.set(Storage.KEYS.CONTACTS, existingContacts);
                this.renderContacts();
                this.renderDashboard();
                this.showNotification(
                    `Imported ${imported} contacts${skipped > 0 ? ` (${skipped} skipped)` : ''}.`,
                    'success'
                );
            } catch (err) {
                this.showNotification('Error parsing CSV: ' + err.message, 'error');
            }
            event.target.value = '';
        };
        reader.readAsText(file);
    },

    // === Lead CSV Export/Import ===
    exportLeadsCSV() {
        const leads = Storage.get(Storage.KEYS.LEADS);
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

    importLeadsCSV(event) {
        const file = event.target.files[0];
        if (!file) return;

        const validStages = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];
        const validSources = ['website', 'referral', 'social media', 'cold call', 'event'];

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const lines = text.split('\n').filter(l => l.trim());
                if (lines.length < 2) {
                    this.showNotification('CSV file is empty or has no data rows.', 'error');
                    event.target.value = '';
                    return;
                }

                const existingLeads = Storage.get(Storage.KEYS.LEADS);
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

                    const lead = {
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                        name: values[0] || '',
                        company: values[1] || '',
                        email: values[2] || '',
                        phone: values[3] || '',
                        value: Number(values[4]) || 0,
                        stage: validStages.includes(stage) ? stage : 'new',
                        source: validSources.includes(source) ? source : '',
                        notes: values[7] || '',
                        createdAt: new Date().toISOString()
                    };

                    if (lead.name) {
                        existingLeads.push(lead);
                        imported++;
                    } else {
                        skipped++;
                    }
                }

                Storage.set(Storage.KEYS.LEADS, existingLeads);
                this.renderLeads();
                this.renderDashboard();
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

    renderLeads(leadsOverride) {
        let leads = leadsOverride || Storage.get(Storage.KEYS.LEADS);
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

    saveLead(existing) {
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

        const leads = Storage.get(Storage.KEYS.LEADS);

        if (existing) {
            const idx = leads.findIndex(l => l.id === existing.id);
            if (idx !== -1) {
                leads[idx] = { ...leads[idx], ...data };
            }
        } else {
            data.id = Storage.generateId();
            data.createdAt = new Date().toISOString();
            leads.push(data);
        }

        Storage.set(Storage.KEYS.LEADS, leads);
        this.closeModal();
        this.renderLeads();
        this.renderDashboard();
    },

    editLead(id) {
        const leads = Storage.get(Storage.KEYS.LEADS);
        const lead = leads.find(l => l.id === id);
        if (lead) this.showLeadModal(lead);
    },

    deleteLead(id) {
        if (!confirm('Are you sure you want to delete this lead?')) return;
        const leads = Storage.get(Storage.KEYS.LEADS).filter(l => l.id !== id);
        Storage.set(Storage.KEYS.LEADS, leads);
        this.renderLeads();
        this.renderDashboard();
    },

    // === Activities ===
    bindActivities() {
        document.getElementById('btn-add-activity').addEventListener('click', () => {
            this.showActivityModal();
        });

        document.getElementById('activity-filter-type').addEventListener('change', () => this.renderActivities());
    },

    renderActivities() {
        let activities = Storage.get(Storage.KEYS.ACTIVITIES);
        const filterType = document.getElementById('activity-filter-type').value;

        if (filterType) {
            activities = activities.filter(a => a.type === filterType);
        }

        activities.sort((a, b) => new Date(b.date) - new Date(a.date));

        const container = document.getElementById('activities-list');
        if (activities.length === 0) {
            container.innerHTML = '<div class="empty-state-card"><p>No activities found.</p></div>';
            return;
        }

        container.innerHTML = activities.map(a => `
            <div class="timeline-item">
                <div class="timeline-marker">
                    <div class="timeline-dot"></div>
                </div>
                <div class="timeline-content">
                    <div class="timeline-header">
                        <h4>${this.getActivityIcon(a.type)} ${this.escapeHtml(a.type.charAt(0).toUpperCase() + a.type.slice(1))}</h4>
                        <div class="card-actions">
                            <button class="card-action-btn" onclick="App.deleteActivity('${a.id}')" title="Delete">🗑️</button>
                        </div>
                    </div>
                    <p>${this.escapeHtml(a.description)}</p>
                    ${a.contactName ? `<p><small>Related: ${this.escapeHtml(a.contactName)}</small></p>` : ''}
                    <span class="timeline-date">${this.formatDate(a.date)}</span>
                </div>
            </div>
        `).join('');
    },

    showActivityModal(activity) {
        document.getElementById('modal-title').textContent = activity ? 'Edit Activity' : 'Add Activity';
        const contacts = Storage.get(Storage.KEYS.CONTACTS);
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

    saveActivity(existing) {
        const data = {
            type: document.getElementById('activity-type').value,
            description: document.getElementById('activity-description').value.trim(),
            contactName: document.getElementById('activity-contact').value,
            date: document.getElementById('activity-date').value ?
                new Date(document.getElementById('activity-date').value).toISOString() :
                new Date().toISOString()
        };

        if (!data.description) return;

        const activities = Storage.get(Storage.KEYS.ACTIVITIES);

        if (existing) {
            const idx = activities.findIndex(a => a.id === existing.id);
            if (idx !== -1) {
                activities[idx] = { ...activities[idx], ...data };
            }
        } else {
            data.id = Storage.generateId();
            activities.push(data);
        }

        Storage.set(Storage.KEYS.ACTIVITIES, activities);
        this.closeModal();
        this.renderActivities();
        this.renderDashboard();
    },

    deleteActivity(id) {
        if (!confirm('Are you sure you want to delete this activity?')) return;
        const activities = Storage.get(Storage.KEYS.ACTIVITIES).filter(a => a.id !== id);
        Storage.set(Storage.KEYS.ACTIVITIES, activities);
        this.renderActivities();
        this.renderDashboard();
    },

    // === Email Templates ===
    bindTemplates() {
        document.getElementById('btn-add-template').addEventListener('click', () => {
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

    renderTemplates() {
        let templates = Storage.get(Storage.KEYS.TEMPLATES);
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
                        <button class="btn-edit-template" onclick="App.editTemplate('${t.id}')">Edit</button>
                        <button class="btn-delete-template" onclick="App.deleteTemplate('${t.id}')">Delete</button>
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

    saveTemplate(existing) {
        const data = {
            name: document.getElementById('template-name').value.trim(),
            category: document.getElementById('template-category').value,
            subject: document.getElementById('template-subject').value.trim(),
            body: document.getElementById('template-body').value.trim()
        };

        if (!data.name || !data.body) return;

        const templates = Storage.get(Storage.KEYS.TEMPLATES);

        if (existing) {
            const idx = templates.findIndex(t => t.id === existing.id);
            if (idx !== -1) {
                templates[idx] = { ...templates[idx], ...data };
            }
        } else {
            data.id = Storage.generateId();
            data.createdAt = new Date().toISOString();
            templates.push(data);
        }

        Storage.set(Storage.KEYS.TEMPLATES, templates);
        this.closeModal();
        this.renderTemplates();
        this.showNotification(`Template "${data.name}" saved.`, 'success');
    },

    editTemplate(id) {
        const templates = Storage.get(Storage.KEYS.TEMPLATES);
        const template = templates.find(t => t.id === id);
        if (template) this.showTemplateModal(template);
    },

    deleteTemplate(id) {
        if (!confirm('Are you sure you want to delete this template?')) return;
        const templates = Storage.get(Storage.KEYS.TEMPLATES).filter(t => t.id !== id);
        Storage.set(Storage.KEYS.TEMPLATES, templates);
        this.renderTemplates();
        this.showNotification('Template deleted.', 'success');
    },

    // === Settings ===
    bindSettings() {
        document.getElementById('btn-export-data').addEventListener('click', () => this.exportData());
        document.getElementById('btn-import-data').addEventListener('click', () => {
            document.getElementById('import-file-input').click();
        });
        document.getElementById('import-file-input').addEventListener('change', (e) => this.importData(e));
        document.getElementById('btn-clear-data').addEventListener('click', () => this.clearData());
    },

    exportData() {
        const data = Storage.exportAll();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aicrm-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const count = Storage.importAll(e.target.result);
                alert(`Successfully imported data (${count} collections restored).`);
                this.renderCurrentPage();
                this.renderDashboard();
            } catch (err) {
                alert('Import failed: ' + err.message);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    },

    clearData() {
        if (!confirm('Are you sure you want to clear ALL data? This cannot be undone.')) return;
        if (!confirm('This will permanently delete all contacts, leads, and activities. Continue?')) return;
        Storage.clearAll();
        this.renderCurrentPage();
        this.renderDashboard();
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
        document.getElementById('modal-overlay').classList.remove('hidden');
    },

    closeModal() {
        document.getElementById('modal-overlay').classList.add('hidden');
        document.getElementById('modal-body').innerHTML = '';
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
