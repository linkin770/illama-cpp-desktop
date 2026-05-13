function renderCopyIcon() {
  return `
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <rect x="5" y="3" width="8" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.4"></rect>
      <rect x="2" y="6" width="8" height="8" rx="2" fill="none" stroke="currentColor" stroke-width="1.4"></rect>
    </svg>
  `
}

function renderModelChipIcon() {
  return `
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M8 1.4 13.2 4v8L8 14.6 2.8 12V4L8 1.4Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"></path>
      <path d="M8 1.8V6.1m0 0 5.1-2.1M8 6.1 2.9 4" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"></path>
    </svg>
  `
}

function renderSidebarToggleIcon() {
  return `
    <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <rect x="3" y="3.25" width="12" height="11.5" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.5"></rect>
      <path d="M7 3.75v10.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
    </svg>
  `
}

function renderGearIcon() {
  return `
    <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path d="m9 2.7 1 .3.5 1.4 1.3.5 1.2-.7.8.7-.7 1.2.5 1.3 1.4.5.3 1-.3 1-1.4.5-.5 1.3.7 1.2-.8.7-1.2-.7-1.3.5-.5 1.4-1 .3-1-.3-.5-1.4-1.3-.5-1.2.7-.8-.7.7-1.2-.5-1.3-1.4-.5-.3-1 .3-1 1.4-.5.5-1.3-.7-1.2.8-.7 1.2.7 1.3-.5.5-1.4 1-.3Z" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linejoin="round"></path>
      <circle cx="9" cy="9" r="2.25" fill="none" stroke="currentColor" stroke-width="1.4"></circle>
    </svg>
  `
}

function renderSettingsTabIcon(kind) {
  const icons = {
    overview: `
      <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false">
        <circle cx="9" cy="9" r="5.6" fill="none" stroke="currentColor" stroke-width="1.5"></circle>
        <path d="M9 5.2v3.9l2.4 1.7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
    `,
    display: `
      <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false">
        <rect x="2.6" y="3.4" width="12.8" height="9.2" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"></rect>
        <path d="M6.2 14.7h5.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
      </svg>
    `,
    sampling: `
      <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false">
        <path d="M4 4.3h10l-4.2 4.5v4.5l-1.6.8V8.8L4 4.3Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"></path>
      </svg>
    `,
    penalty: `
      <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false">
        <path d="m9 3.1 6 10.4H3L9 3.1Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"></path>
        <path d="M9 6.6v3.2M9 12.2h.01" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
      </svg>
    `,
    io: `
      <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false">
        <path d="M6 5.1H3.4v9.1h9.2v-2.4M12 12.9h2.6V3.8H5.4v2.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"></path>
        <path d="M7.1 9h4.1m0 0-1.8-1.8M11.2 9l-1.8 1.8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
    `,
    mcp: `
      <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false">
        <path d="M5.1 5.3 8 8.2m0 0 2.9-2.9M8 8.2l-2.9 2.9M8 8.2l2.9 2.9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
        <circle cx="4.2" cy="4.4" r="1.6" fill="none" stroke="currentColor" stroke-width="1.3"></circle>
        <circle cx="13.8" cy="4.4" r="1.6" fill="none" stroke="currentColor" stroke-width="1.3"></circle>
        <circle cx="4.2" cy="13.6" r="1.6" fill="none" stroke="currentColor" stroke-width="1.3"></circle>
        <circle cx="13.8" cy="13.6" r="1.6" fill="none" stroke="currentColor" stroke-width="1.3"></circle>
      </svg>
    `,
    developer: `
      <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false">
        <path d="m7.2 5.4-3 3.6 3 3.6M10.8 5.4l3 3.6-3 3.6M9.9 4.6 8.1 13.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
    `,
    logs: `
      <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false">
        <rect x="3.2" y="2.8" width="11.6" height="12.4" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"></rect>
        <path d="M6 6.4h6M6 9h6M6 11.6h4.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
      </svg>
    `,
  }

  return icons[kind] || icons.overview
}

export {
  renderCopyIcon,
  renderModelChipIcon,
  renderSidebarToggleIcon,
  renderGearIcon,
  renderSettingsTabIcon,
}
