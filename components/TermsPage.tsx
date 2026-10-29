import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-2">
    <h2 className="text-lg font-bold text-slate-900">{title}</h2>
    <div className="text-slate-600 text-[15px] leading-relaxed space-y-2">{children}</div>
  </section>
);

const TermsPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-5 py-8 space-y-8">
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/login'))}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={16} /> Volver
        </button>

        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Términos de uso y privacidad</h1>
          <p className="text-sm text-slate-500">Última actualización: octubre de 2026</p>
        </header>

        <Section title="1. Qué es DienteLink">
          <p>
            DienteLink es una herramienta para que clínicas dentales administren pacientes, agenda, odontograma y
            finanzas. El profesional de la salud es el responsable de la información clínica que registra y de las
            decisiones que toma con ella.
          </p>
        </Section>

        <Section title="2. Tu cuenta">
          <p>
            Entras con tu cuenta de Google. Eres responsable de esa cuenta y de la actividad hecha desde DienteLink.
            Debes ser un profesional habilitado para ejercer en tu país.
          </p>
        </Section>

        <Section title="3. Prueba gratis y pago">
          <p>
            Ofrecemos un período de prueba gratuito. Después, el servicio se paga por mes mediante transferencia
            bancaria y comprobante enviado desde la aplicación. Si no se renueva, el acceso a la aplicación se
            corta. Tus datos no se borran: puedes descargar tu respaldo desde la pantalla de suscripción.
          </p>
        </Section>

        <Section title="4. Tus datos y los de tus pacientes">
          <p>
            Los datos de tus pacientes son tuyos. Nosotros solo los almacenamos para prestarte el servicio. No los
            vendemos ni los compartimos con terceros, salvo los proveedores técnicos necesarios para operar la
            aplicación (alojamiento y correo).
          </p>
          <p>
            Eres responsable de contar con la autorización de tus pacientes para registrar sus datos, conforme a la
            normativa de tu país y al secreto profesional.
          </p>
        </Section>

        <Section title="5. Respaldos y conservación">
          <p>
            La aplicación permite descargar un respaldo completo de tu información en cualquier momento. Te
            recomendamos hacerlo con frecuencia y guardarlo en un lugar seguro: el expediente clínico debe
            conservarse el tiempo que exija la ley. Aunque cuidamos el servicio, no garantizamos que esté libre de
            interrupciones ni de pérdida de datos.
          </p>
        </Section>

        <Section title="6. Uso aceptable">
          <p>
            No uses la aplicación para fines ilegales, para intentar acceder a datos de otras clínicas ni para
            sobrecargar el servicio. Podemos suspender cuentas que incumplan estas reglas.
          </p>
        </Section>

        <Section title="7. Responsabilidad">
          <p>
            DienteLink es una herramienta de apoyo administrativo y no sustituye el criterio clínico. En la medida
            permitida por la ley, no respondemos por daños derivados de decisiones clínicas tomadas con la
            información registrada.
          </p>
        </Section>

        <Section title="8. Baja de la cuenta">
          <p>
            Puedes dejar de usar el servicio cuando quieras. Si necesitas que eliminemos tu cuenta y tus datos,
            escríbenos por WhatsApp al 9805-3628.
          </p>
        </Section>

        <Section title="9. Contacto">
          <p>Dudas o problemas: WhatsApp 9805-3628.</p>
        </Section>

        <p className="text-xs text-slate-400 pt-4 border-t border-slate-200">
          Este texto es una base general y puede actualizarse. Se recomienda que un abogado lo revise antes del
          lanzamiento comercial.
        </p>
      </div>
    </div>
  );
};

export default TermsPage;
