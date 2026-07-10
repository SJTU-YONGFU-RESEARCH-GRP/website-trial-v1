interface EmptyStateProps {
  message?: string;
  icon?: string;
}

export function EmptyState({
  message = "No data available",
  icon = "📭",
}: EmptyStateProps): JSX.Element {
  return (
    <div className="flow-empty">
      <span className="flow-empty__icon">{icon}</span>
      <span className="flow-empty__text">{message}</span>
    </div>
  );
}
