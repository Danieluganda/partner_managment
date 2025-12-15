document.addEventListener('DOMContentLoaded', function () {
    const personnel = Array.isArray(window.personnelData) ? window.personnelData : [];
    const partners = Array.isArray(window.partnersData) ? window.partnersData : [];

    const elems = {
        tableBody: document.querySelector('#personnelTable tbody'),
        totalPersonnel: document.getElementById('totalPersonnel'),
        activePartners: document.getElementById('activePartners'),
        keyContacts: document.getElementById('keyContacts'),
        verifiedContacts: document.getElementById('verifiedContacts'),
        personnelSearch: document.getElementById('personnelSearch'),
        quickPersonnelSearch: document.getElementById('quickPersonnelSearch'),
        partnerFilter: document.getElementById('partnerPersonnelFilter'),
        roleFilter: document.getElementById('rolePersonnelFilter'),
        statusFilter: document.getElementById('statusPersonnelFilter'),
        refreshBtn: document.getElementById('refreshPersonnelBtn'),
        exportBtn: document.getElementById('exportPersonnelBtn'),
        showingCount: document.getElementById('showingPersonnelCount'),
        totalCountFooter: document.getElementById('totalPersonnelCount'),
        footerActiveCount: document.getElementById('footerActiveCount'),
        footerKeyContactCount: document.getElementById('footerKeyContactCount'),
        footerResponseRate: document.getElementById('footerResponseRate')
    };

    function renderStats(list) {
        const total = list.length;
        const activePartnersCount = new Set(list.filter(p => p.partnerName && p.workStatus === 'Active').map(p => p.partnerName)).size;
        const keyContacts = list.length; // adjust if you define key contact differently
        const verified = list.filter(p => p.emailAddress).length;
        if (elems.totalPersonnel) elems.totalPersonnel.textContent = total;
        if (elems.activePartners) elems.activePartners.textContent = activePartnersCount;
        if (elems.keyContacts) elems.keyContacts.textContent = keyContacts;
        if (elems.verifiedContacts) elems.verifiedContacts.textContent = verified;
        if (elems.totalCountFooter) elems.totalCountFooter.textContent = total;
    }

    function populateFilters() {
        // partners
        if (elems.partnerFilter && partners.length) {
            // clear existing (preserve first option)
            const first = elems.partnerFilter.querySelector('option');
            elems.partnerFilter.innerHTML = '';
            elems.partnerFilter.appendChild(first);
            const added = new Set();
            partners.forEach(p => {
                const id = p.id || p.partnerId || p.partnerId;
                const name = p.partnerName || p.name || id;
                if (!added.has(id)) {
                    const o = document.createElement('option');
                    o.value = id;
                    o.textContent = name;
                    elems.partnerFilter.appendChild(o);
                    added.add(id);
                }
            });
        }

        // roles
        if (elems.roleFilter) {
            const first = elems.roleFilter.querySelector('option');
            elems.roleFilter.innerHTML = '';
            elems.roleFilter.appendChild(first);
            const roles = [...new Set(personnel.map(p => p.jobTitle).filter(Boolean))].sort();
            roles.forEach(role => {
                const o = document.createElement('option');
                o.value = role;
                o.textContent = role;
                elems.roleFilter.appendChild(o);
            });
        }
    }

    function renderTable(list) {
        if (!elems.tableBody) return;
        elems.tableBody.innerHTML = '';
        if (!list.length) {
            const r = document.createElement('tr');
            r.innerHTML = '<td colspan="10" class="empty">No personnel found</td>';
            elems.tableBody.appendChild(r);
            if (elems.showingCount) elems.showingCount.textContent = 0;
            return;
        }
        const frag = document.createDocumentFragment();
        list.forEach(p => {
            const tr = document.createElement('tr');
            const lastContact = p.lastContact || (p.updatedAt ? new Date(p.updatedAt).toLocaleString() : '-');
            tr.innerHTML = [
                `<td>${escapeHtml(p.partnerId || (p.partner && p.partner.id) || '-' )}</td>`,
                `<td>${escapeHtml(p.partnerName || (p.partner && p.partner.partnerName) || '-')}</td>`,
                `<td>${escapeHtml(p.fullName || p.name || '-')}</td>`,
                `<td>${escapeHtml(p.jobTitle || p.role || '-')}</td>`,
                `<td>${escapeHtml(p.department || '-')}</td>`,
                `<td>${escapeHtml(p.emailAddress || p.email || '-')}</td>`,
                `<td>${escapeHtml(p.phoneNumber || p.phone || '-')}</td>`,
                `<td>${escapeHtml(p.workStatus || p.status || 'Unknown')}</td>`,
                `<td>${escapeHtml(lastContact)}</td>`,
                `<td class="actions-cell"><a href="/personnel/${p.id}" class="action-btn view-btn">View</a> <a href="/forms/personnel/${p.id}/edit" class="action-btn edit">Edit</a></td>`
            ].map(s => `<td>${s.replace(/^<td>|<\/td>$/g,'')}</td>`).join('');
            // simpler: set innerHTML directly
            tr.innerHTML = [
                `<td>${escapeHtml(p.partnerId || (p.partner && p.partner.id) || '-')}</td>`,
                `<td>${escapeHtml(p.partnerName || (p.partner && p.partner.partnerName) || '-')}</td>`,
                `<td>${escapeHtml(p.fullName || p.name || '-')}</td>`,
                `<td>${escapeHtml(p.jobTitle || p.role || '-')}</td>`,
                `<td>${escapeHtml(p.department || '-')}</td>`,
                `<td>${escapeHtml(p.emailAddress || p.email || '-')}</td>`,
                `<td>${escapeHtml(p.phoneNumber || p.phone || '-')}</td>`,
                `<td>${escapeHtml(p.workStatus || p.status || 'Unknown')}</td>`,
                `<td>${escapeHtml(lastContact)}</td>`,
                `<td class="actions-cell"><a href="/personnel/${p.id}" class="action-btn view-btn">View</a> <a href="/forms/personnel/${p.id}/edit" class="action-btn edit">Edit</a></td>`
            ].join('');
            frag.appendChild(tr);
        });
        elems.tableBody.appendChild(frag);
        if (elems.showingCount) elems.showingCount.textContent = list.length;
    }

    function escapeHtml(s) {
        if (s === null || s === undefined) return '';
        return String(s).replace(/[&<>"'`=\/]/g, function (c) {
            return ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
                '/': '&#x2F;',
                '`': '&#x60;',
                '=': '&#x3D;'
            })[c];
        });
    }

    function applyFilters() {
        const q = (elems.personnelSearch && elems.personnelSearch.value || elems.quickPersonnelSearch && elems.quickPersonnelSearch.value || '').trim().toLowerCase();
        const partnerId = elems.partnerFilter ? elems.partnerFilter.value : '';
        const role = elems.roleFilter ? elems.roleFilter.value : '';
        const status = elems.statusFilter ? elems.statusFilter.value : '';

        let out = personnel.filter(p => {
            if (partnerId && String(p.partnerId || (p.partner && p.partner.id)) !== String(partnerId)) return false;
            if (role && (p.jobTitle || '') !== role) return false;
            if (status && (p.workStatus || p.status || '') !== status) return false;
            if (q) {
                const hay = (
                    (p.fullName || '') + '|' +
                    (p.jobTitle || '') + '|' +
                    (p.emailAddress || '') + '|' +
                    (p.partnerName || '')
                ).toLowerCase();
                return hay.indexOf(q) !== -1;
            }
            return true;
        });
        renderTable(out);
        updateFooterCounts(out);
    }

    function updateFooterCounts(list) {
        if (elems.footerActiveCount) elems.footerActiveCount.textContent = list.filter(p => (p.workStatus || p.status) === 'Active').length;
        if (elems.footerKeyContactCount) elems.footerKeyContactCount.textContent = list.length; // adjust if needed
        if (elems.footerResponseRate) elems.footerResponseRate.textContent = `${Math.round((list.filter(p => p.emailAddress).length / Math.max(1, personnel.length)) * 100)}%`;
    }

    // export CSV
    function exportCsv(list) {
        if (!list || !list.length) return;
        const cols = ['partnerId','partnerName','fullName','jobTitle','department','emailAddress','phoneNumber','workStatus'];
        const rows = [cols.join(',')].concat(list.map(r => cols.map(c => `"${(r[c] || '').toString().replace(/"/g,'""')}"`).join(',')));
        const csv = rows.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `personnel-export-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    // Event bindings
    if (elems.personnelSearch) {
        elems.personnelSearch.addEventListener('keyup', debounce(function (e) { applyFilters(); }, 250));
    }
    if (elems.quickPersonnelSearch) {
        elems.quickPersonnelSearch.addEventListener('input', debounce(function () { applyFilters(); }, 150));
    }
    if (elems.partnerFilter) elems.partnerFilter.addEventListener('change', applyFilters);
    if (elems.roleFilter) elems.roleFilter.addEventListener('change', applyFilters);
    if (elems.statusFilter) elems.statusFilter.addEventListener('change', applyFilters);
    if (elems.refreshBtn) elems.refreshBtn.addEventListener('click', function () {
        // re-read global data (in case other scripts updated it) and re-init
        renderAll();
    });
    if (elems.exportBtn) elems.exportBtn.addEventListener('click', function () { exportCsv(personnel); });

    function debounce(fn, wait) {
        let t;
        return function () {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, arguments), wait);
        };
    }

    function renderAll() {
        populateFilters();
        renderStats(personnel);
        renderTable(personnel);
        updateFooterCounts(personnel);
    }

    // initial render
    renderAll();
});