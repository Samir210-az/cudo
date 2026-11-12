export default function GroupPicker({ groups, value, onChange, allLabel = 'Hamısı' }) {
  if (!groups.length) return null;
  return (
    <div className="tabs" role="tablist" aria-label="Qrup" style={{ marginBottom: 12 }}>
      {['', ...groups].map((g) => (
        <button key={g || 'all'} type="button" role="tab" className="tab" aria-selected={value === g} onClick={() => onChange(g)}>
          {g || allLabel}
        </button>
      ))}
    </div>
  );
}
