import { render, screen } from '@testing-library/react';

describe('sensibilidad del harness (bootstrap)', () => {
  it('renderiza el contenido recibido (control de sensibilidad)', () => {
    render(<p>Resumen operativo del día</p>);
    expect(screen.getByText('Resumen operativo del día')).toBeInTheDocument();
  });
});
