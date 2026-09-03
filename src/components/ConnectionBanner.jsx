import './ConnectionBanner.css';

/**
 * Small top banner showing WebSocket connection status.
 * Always visible so the elder (or caretaker) knows if the system is online.
 */
export default function ConnectionBanner({ connectionState }) {
  let statusClass = '';
  let icon = '';
  let label = '';

  switch (connectionState) {
    case 'connected':
      statusClass = 'banner-connected';
      icon = '●';
      label = 'Connected to SHASTRA Cloud';
      break;
    case 'reconnecting':
      statusClass = 'banner-reconnecting';
      icon = '◌';
      label = 'Reconnecting...';
      break;
    case 'disconnected':
    default:
      statusClass = 'banner-disconnected';
      icon = '●';
      label = 'Disconnected — checking connection';
      break;
  }

  return (
    <div className={`connection-banner ${statusClass}`} role="status" aria-live="polite">
      <span className="banner-icon">{icon}</span>
      <span className="banner-label">{label}</span>
    </div>
  );
}
