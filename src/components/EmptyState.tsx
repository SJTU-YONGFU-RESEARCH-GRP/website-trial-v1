interface EmptyStateProps {
  message?: string;
  icon?: string;
}

export function EmptyState({
  message = "No data available",
  icon = "📭",
}: EmptyStateProps): JSX.Element {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">{icon}</span>
      <span className="empty-state__text">{message}</span>
    </div>
  );
}
