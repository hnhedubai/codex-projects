const VIEW_ICONS = Object.freeze({
  table: ['▦', 'Table view'],
  kanban: ['▤', 'Kanban view'],
});

/**
 * Owns the portal-wide view-control placement and icon contract.
 * Page modules keep ownership of view state and rendering; this module only
 * provides one stable interface for placement, labels, and iconography.
 */
export class PortalViewControls {
  constructor(root = document) {
    this.root = root;
    this.groups = [];
  }

  mount() {
    this.groups = [...this.root.querySelectorAll('[data-portal-view-controls]')];
    this.groups.forEach(group => {
      group.classList.add('portal-view-controls', 'portal-sidebar-views');
      group.setAttribute('role', 'group');
      const board = this.root.querySelector('.agent-board-link');
      if (board) board.before(group);
      else this.root.querySelector('#tracker-sidebar')?.before(group);
      group.querySelectorAll('button[data-view]').forEach(button => {
        const [icon, label] = VIEW_ICONS[button.dataset.view] || [button.textContent, button.textContent];
        button.textContent = icon;
        button.title = label;
        button.setAttribute('aria-label', label);
      });
    });
    return this;
  }
}

export function mountPortalViewControls(root = document) {
  return new PortalViewControls(root).mount();
}
