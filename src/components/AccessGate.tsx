import { useState } from 'react';

interface AccessGateProps {
  accessCode: string;
  onUnlock: () => void;
}

export function AccessGate({ accessCode, onUnlock }: AccessGateProps) {
  const [code, setCode] = useState('');
  const [invalid, setInvalid] = useState(false);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (code === accessCode) {
      onUnlock();
      return;
    }
    setInvalid(true);
  };

  return (
    <main className="access-shell">
      <section className="access-card" aria-labelledby="access-title">
        <div className="access-mark" aria-hidden="true">🐝</div>
        <span className="eyebrow">beer_game</span>
        <h1 id="access-title">Acceso al juego</h1>
        <p>Introduce el código para abrir el panel de control y el jardín.</p>

        <form className="access-form" onSubmit={submit}>
          <label htmlFor="access-code">Código de acceso</label>
          <input
            id="access-code"
            className="access-input"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            autoComplete="current-password"
            autoFocus
            value={code}
            aria-invalid={invalid}
            aria-describedby={invalid ? 'access-error' : undefined}
            onChange={(event) => {
              setCode(event.target.value.replace(/\D/g, ''));
              setInvalid(false);
            }}
          />
          {invalid && (
            <p className="access-error" id="access-error" role="alert">
              Código incorrecto. Inténtalo de nuevo.
            </p>
          )}
          <button className="access-button" type="submit">Entrar</button>
        </form>
      </section>
    </main>
  );
}
