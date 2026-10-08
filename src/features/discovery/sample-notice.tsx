export function SampleNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`sample-notice${compact ? ' sample-notice-compact' : ''}`}>
      <span className="sample-label">SAMPLE</span>
      <p>
        Fictional records for evaluation. No implementation has been validated.
      </p>
    </div>
  );
}
