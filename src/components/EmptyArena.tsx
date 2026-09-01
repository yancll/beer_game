export function EmptyArena() {
  return (
    <div className="empty-arena" aria-live="polite">
      <span className="empty-arena-icon" aria-hidden="true">🐝</span>
      <strong>La carrera está lista</strong>
      <span>Añade el primer participante. Comenzará con una abeja.</span>
    </div>
  );
}
