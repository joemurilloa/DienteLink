import { sileo } from 'sileo';

/** El aviso se queda hasta que alguien lo cierra. */
export function stickyError(title: string, description: string): void {
  let id = '';
  id = sileo.error({
    title,
    description,
    duration: null,
    button: {
      title: 'Cerrar',
      onClick: () => sileo.dismiss(id),
    },
  });
}
