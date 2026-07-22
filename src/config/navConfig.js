/**
 * navConfig.js — Single source of truth for all sidebar navigation.
 *
 * HOW TO ADD A NEW ROUTE:
 *  1. Add an entry to the correct role's `sections[].items` array below.
 *  2. That's it — the sidebar and the Settings label editor both auto-pick it up.
 *
 * Field reference:
 *  key          — unique string used as the settings key for this label
 *  defaultLabel — the label shown when no custom value has been saved
 *  path         — React Router path (sidebar link target)
 *  icon         — emoji/character shown as the sidebar icon
 *  description  — (shared-role items only) shown instead of a path chip
 */

export const NAV_CONFIG = [
    // ── SHARED ─────────────────────────────────────────────────────────────
    // Branding labels that apply across all roles (not sidebar routes)
    {
        role: 'shared',
        roleLabel: 'Shared',
        roleIcon: '◎',
        roleColor: '#6B7280',
        description: 'Sidebar branding text and page headings shared across all roles',
        sections: [
            {
                sectionKey: null,
                sectionDefault: 'SIDEBAR BRANDING',
                items: [
                    { key: 'logoText',      defaultLabel: 'DESHboard',   icon: '🏷', description: 'Top logo text — visible to all roles' },
                    { key: 'adminSubtitle', defaultLabel: 'Admin Panel', icon: '🔑', description: 'Subtitle below logo — shown to admins' },
                    { key: 'userSubtitle',  defaultLabel: 'DESH Professional Portal', icon: '👤', description: 'Subtitle below logo — shown to users & reviewers' },
                ],
            },
            {
                sectionKey: null,
                sectionDefault: 'PAGE HEADINGS',
                items: [
                    { key: 'adminDashboardHeading', defaultLabel: 'Deshboard', icon: '📋', description: 'H1 heading on the Admin Dashboard page' },
                ],
            },
        ],
    },

    // ── ADMIN ───────────────────────────────────────────────────────────────
    {
        role: 'admin',
        roleLabel: 'Admin',
        roleIcon: '🔑',
        roleColor: '#22A84B',
        description: 'Sidebar navigation items visible to administrators',
        sections: [
            {
                sectionKey: 'adminSection_OVERVIEW',
                sectionDefault: 'OVERVIEW',
                items: [
                    { key: 'adminNav_dashboard', defaultLabel: 'DESHboard', path: '/admin', icon: '⊞' },
                ],
            },
            {
                sectionKey: 'adminSection_CONTENT',
                sectionDefault: 'CONTENT',
                items: [
                    { key: 'adminNav_categories', defaultLabel: 'Categories',  path: '/admin/categories',  icon: '📁' },
                    { key: 'adminNav_tabs',       defaultLabel: 'Tabs',        path: '/admin/tabs',       icon: '◧' },
                    { key: 'adminNav_modules',    defaultLabel: 'Modules',     path: '/admin/modules',    icon: '◈' },
                    { key: 'adminNav_sections',   defaultLabel: 'Sections',    path: '/admin/sections',   icon: '▦' },
                    { key: 'adminNav_evaluation', defaultLabel: 'Leaf Levels', path: '/admin/evaluation', icon: '🍃' },
                    { key: 'adminNav_resources',  defaultLabel: 'Resources',   path: '/admin/resources',  icon: '📚' },
                ],
            },
            {
                sectionKey: 'adminSection_MANAGEMENT',
                sectionDefault: 'MANAGEMENT',
                items: [
                    { key: 'adminNav_users',       defaultLabel: 'DESH Professionals',       path: '/admin/users',       icon: '◉' },
                    { key: 'adminNav_submissions', defaultLabel: 'Submissions', path: '/admin/submissions', icon: '◫' },
                    { key: 'adminNav_tickets',     defaultLabel: 'Tickets',     path: '/admin/tickets',     icon: '🎫' },
                    { key: 'adminNav_notifications', defaultLabel: 'Notifications', path: '/notifications',    icon: '🔔' },
                    { key: 'adminNav_activity',    defaultLabel: 'Activity',    path: '/admin/activity',    icon: '⏱' },
                    { key: 'adminNav_chatbotRules', defaultLabel: 'DESH Ai Manager', path: '/admin/desh-ai-manager', icon: '🤖' },
                    { key: 'adminNav_supportChat',  defaultLabel: 'Support Chat',   path: '/admin/support-chat',   icon: '💬' },
                ],
            },
            {
                sectionKey: 'adminSection_TOOLS',
                sectionDefault: 'TOOLS',
                items: [
                    { key: 'adminNav_calcEngine',   defaultLabel: 'Calc Engine',   path: '/admin/calc-engine',   icon: '∑' },
                    { key: 'adminNav_formBuilder',  defaultLabel: 'Form Builder',  path: '/admin/form-builder',  icon: '📋' },
                ],
            },
            {
                sectionKey: 'adminSection_SYSTEM',
                sectionDefault: 'SYSTEM',
                items: [
                    { key: 'adminNav_settings',     defaultLabel: 'Settings',      path: '/admin/settings',      icon: '⚙' },
                    { key: 'adminNav_ticketConfig', defaultLabel: 'Ticket Settings', path: '/admin/ticket-config', icon: '🎫' },
                    { key: 'adminNav_importExport', defaultLabel: 'Import/Export', path: '/admin/import-export', icon: '⇅' },
                ],
            },
        ],
    },

    // ── USER ────────────────────────────────────────────────────────────────
    {
        role: 'user',
        roleLabel: 'DESH Professional',
        roleIcon: '👤',
        roleColor: '#3B82F6',
        description: 'Sidebar navigation items visible to regular users',
        sections: [
            {
                sectionKey: 'userSection_MAIN',
                sectionDefault: 'MAIN',
                items: [
                    { key: 'userNav_dashboard',  defaultLabel: 'DESHboard',   path: '/dashboard',    icon: '⊞' },
                    { key: 'userNav_projects',   defaultLabel: 'My Projects', path: '/projects',     icon: '◫' },
                    { key: 'userNav_newProject', defaultLabel: 'New Project', path: '/projects/new', icon: '+' },
                ],
            },
            {
                sectionKey: 'userSection_TOOLS',
                sectionDefault: 'TOOLS',
                items: [
                    { key: 'userNav_notes',        defaultLabel: 'My Notes',     path: '/notes',         icon: '✎' },
                    { key: 'userNav_manual',       defaultLabel: 'DESH Professional Manual',  path: '/manual',        icon: '?' },
                    { key: 'userNav_calculations', defaultLabel: 'Calculations', path: '/calculations',  icon: '∑' },
                ],
            },
            {
                sectionKey: 'userSection_ACCOUNT',
                sectionDefault: 'ACCOUNT',
                items: [
                    { key: 'userNav_notifications', defaultLabel: 'Notifications', path: '/notifications', icon: '🔔' },
                    { key: 'userNav_account', defaultLabel: 'My Account', path: '/account', icon: '👤' },
                ],
            },
        ],
    },

    // ── REVIEWER ────────────────────────────────────────────────────────────
    {
        role: 'reviewer',
        roleLabel: 'Reviewer',
        roleIcon: '👁',
        roleColor: '#F59E0B',
        description: 'Sidebar navigation items visible to reviewers',
        sections: [
            {
                sectionKey: 'reviewerSection_REVIEW',
                sectionDefault: 'REVIEW',
                items: [
                    { key: 'reviewerNav_submissions', defaultLabel: 'Submissions', path: '/reviewer/submissions', icon: '◫' },
                    { key: 'reviewerNav_tickets',     defaultLabel: 'Clarification Tickets', path: '/reviewer/tickets', icon: '🎫' },
                    { key: 'reviewerNav_notifications', defaultLabel: 'Notifications', path: '/notifications', icon: '🔔' },
                ],
            },
            {
                sectionKey: 'reviewerSection_TOOLS',
                sectionDefault: 'TOOLS',
                items: [
                    { key: 'reviewerNav_calculations', defaultLabel: 'Calculations', path: '/calculations', icon: '∑' },
                ],
            },
        ],
    },

    // ── MANAGER ────────────────────────────────────────────────────────────
    {
        role: 'manager',
        roleLabel: 'Manager',
        roleIcon: '💼',
        roleColor: '#0EA5E9',
        description: 'Sidebar navigation items visible to managers',
        sections: [
            {
                sectionKey: 'managerSection_MANAGEMENT',
                sectionDefault: 'MANAGEMENT',
                items: [
                    { key: 'managerNav_submissions', defaultLabel: 'Submissions', path: '/manager/submissions', icon: '◫' },
                    { key: 'managerNav_tickets',     defaultLabel: 'Clarification Tickets', path: '/manager/tickets', icon: '🎫' },
                    { key: 'managerNav_users',       defaultLabel: 'Manage DESH Professionals', path: '/manager/users',       icon: '👥' },
                    { key: 'managerNav_notifications', defaultLabel: 'Notifications', path: '/notifications', icon: '🔔' },
                ],
            },
        ],
    },
];

// Auto-derived flat defaults — used by useNavLabels hook and Settings state.
// Never edit this object manually; edit the NAV_CONFIG entries above instead.
export const NAV_LABEL_DEFAULTS = {};
NAV_CONFIG.forEach(roleGroup => {
    roleGroup.sections.forEach(section => {
        if (section.sectionKey) {
            NAV_LABEL_DEFAULTS[section.sectionKey] = section.sectionDefault;
        }
        section.items.forEach(item => {
            NAV_LABEL_DEFAULTS[item.key] = item.defaultLabel;
        });
    });
});
