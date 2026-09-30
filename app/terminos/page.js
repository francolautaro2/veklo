import Link from "next/link";
import LegalPage, { LEGAL_ENTITY, LegalSection } from "@/app/_components/legal-page";
import { PLAN_LIMITS, TRIAL_DAYS } from "@/lib/subscription";

export const metadata = {
  title: "veklo - Términos y condiciones",
  description: "Condiciones de uso del servicio veklo.",
};

const priceFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export default function TermsPage() {
  return (
    <LegalPage title="Términos y condiciones" updatedAt="[COMPLETAR: fecha]">
      <LegalSection title="1. El servicio">
        <p>
          veklo es un software online para gestionar alojamientos
          (propiedades, habitaciones, reservas, pagos manuales, pre check-in y
          sincronización de calendarios iCal), provisto por {LEGAL_ENTITY.name},
          CUIT {LEGAL_ENTITY.cuit}, con domicilio en {LEGAL_ENTITY.address}. Al
          crear una cuenta aceptás estos términos y la{" "}
          <Link className="text-emerald-400 hover:underline" href="/privacidad">
            política de privacidad
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Tu cuenta">
        <p>
          Tenés que ser mayor de 18 años o actuar en representación de un
          negocio, cargar datos reales y cuidar tu contraseña. Sos responsable
          de lo que se haga desde tu cuenta y de contar con autorización para
          cargar los datos de tus huéspedes.
        </p>
      </LegalSection>

      <LegalSection title="3. Prueba gratuita, planes y pagos">
        <p>
          Las cuentas nuevas tienen {TRIAL_DAYS} días de prueba sin cargo. Después
          podés contratar uno de estos planes, con cobro mensual automático a
          través de Mercado Pago:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          {Object.values(PLAN_LIMITS).map((plan) => (
            <li key={plan.key}>
              {plan.label}: {priceFormatter.format(plan.monthlyPriceArs)} por mes.
            </li>
          ))}
        </ul>
        <p>
          Los precios están expresados en pesos argentinos e incluyen
          [COMPLETAR: IVA incluido / no incluido]. Podemos actualizarlos
          avisándote con al menos 30 días de anticipación; si no estás de
          acuerdo podés cancelar antes de que rija el nuevo precio.
        </p>
      </LegalSection>

      <LegalSection title="4. Cancelación y arrepentimiento">
        <p>
          Podés cancelar tu suscripción cuando quieras desde tu perfil. La
          cancelación detiene los cobros futuros.
        </p>
        <p>
          Si contrataste como consumidor, tenés derecho a revocar la
          contratación dentro de los 10 días corridos desde que la hiciste,
          sin costo ni necesidad de dar motivos (art. 34 de la Ley 24.240),
          escribiendo a{" "}
          <a className="text-emerald-400 hover:underline" href={`mailto:${LEGAL_ENTITY.email}`}>
            {LEGAL_ENTITY.email}
          </a>
          . En ese caso te reintegramos lo cobrado.
        </p>
      </LegalSection>

      <LegalSection title="5. Uso aceptable">
        <p>
          No podés usar veklo para actividades ilegales, para enviar spam,
          para intentar acceder a cuentas o datos ajenos, ni para sobrecargar o
          vulnerar el servicio. Podemos suspender cuentas que incumplan estas
          reglas.
        </p>
      </LegalSection>

      <LegalSection title="6. Integraciones con terceros">
        <p>
          La sincronización con Airbnb, Booking.com y otras plataformas se hace
          mediante calendarios iCal, que esas plataformas actualizan con
          demoras que no controlamos. veklo reduce el riesgo de reservas
          superpuestas, pero no puede garantizar que no ocurran: revisá tu
          disponibilidad en cada plataforma.
        </p>
        <p>
          Los cobros de señas mediante links de pago los procesa el proveedor
          que elijas; veklo no recibe ni administra ese dinero.
        </p>
      </LegalSection>

      <LegalSection title="7. Disponibilidad y responsabilidad">
        <p>
          Hacemos lo posible para que veklo funcione de forma continua y sin
          errores, pero el servicio se presta &quot;tal como está&quot; y puede
          tener interrupciones por mantenimiento o fallas de terceros. En la
          medida permitida por la ley, nuestra responsabilidad total frente a
          vos se limita al monto que nos pagaste en los últimos 3 meses.
        </p>
      </LegalSection>

      <LegalSection title="8. Tus datos">
        <p>
          Los datos que cargás son tuyos. Podés pedirnos una copia en cualquier
          momento. Si cerrás tu cuenta los eliminamos según lo indicado en la
          política de privacidad.
        </p>
      </LegalSection>

      <LegalSection title="9. Cambios en estos términos">
        <p>
          Si cambiamos estos términos de forma relevante te avisamos por email
          con al menos 15 días de anticipación. Si seguís usando veklo después
          de esa fecha, se entiende que aceptás los cambios.
        </p>
      </LegalSection>

      <LegalSection title="10. Ley aplicable">
        <p>
          Estos términos se rigen por las leyes de la República Argentina. Ante
          cualquier conflicto serán competentes los tribunales ordinarios de
          [COMPLETAR: jurisdicción], sin perjuicio de los derechos que la
          normativa de defensa del consumidor te otorgue.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
