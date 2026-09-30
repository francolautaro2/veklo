import LegalPage, { LEGAL_ENTITY, LegalSection } from "@/app/_components/legal-page";

export const metadata = {
  title: "veklo - Política de privacidad",
  description: "Cómo veklo trata los datos personales de usuarios y huéspedes.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de privacidad" updatedAt="[COMPLETAR: fecha]">
      <LegalSection title="1. Quiénes somos">
        <p>
          veklo es un servicio de gestión de alojamientos operado por{" "}
          {LEGAL_ENTITY.name}, CUIT {LEGAL_ENTITY.cuit}, con domicilio en{" "}
          {LEGAL_ENTITY.address} (en adelante, &quot;veklo&quot;). Esta política
          explica qué datos personales tratamos, para qué y cuáles son tus
          derechos, conforme a la Ley 25.326 de Protección de Datos Personales.
        </p>
      </LegalSection>

      <LegalSection title="2. Datos de los usuarios de veklo">
        <p>
          Cuando creás una cuenta tratamos tu nombre, email, teléfono, documento
          (si lo cargás), contraseña (guardada cifrada, nunca en texto plano) y
          los datos de tu suscripción. Si ingresás con Google, recibimos tu
          nombre y email verificado.
        </p>
        <p>
          Los usamos para darte acceso al servicio, enviarte emails
          operativos (verificación, recuperación de contraseña, avisos de tus
          reservas), gestionar tu suscripción y darte soporte. No vendemos tus
          datos ni los usamos para publicidad de terceros.
        </p>
      </LegalSection>

      <LegalSection title="3. Datos de los huéspedes">
        <p>
          Los alojamientos que usan veklo cargan datos de sus huéspedes
          (nombre, email, teléfono, fechas de estadía y pagos) y pueden pedirles
          completar un pre check-in con su documento, notas y otras preguntas.
        </p>
        <p>
          Respecto de esos datos, el alojamiento es el responsable de la base de
          datos y veklo actúa como encargado del tratamiento: los guardamos y
          procesamos únicamente para prestarle el servicio al alojamiento, según
          sus instrucciones. Si sos huésped y querés acceder, rectificar o
          suprimir tus datos, podés pedírselo al alojamiento o escribirnos y le
          derivaremos el pedido.
        </p>
      </LegalSection>

      <LegalSection title="4. Con quién compartimos datos">
        <p>
          Solo con proveedores que necesitamos para operar el servicio, que
          tratan los datos por cuenta nuestra: hosting e infraestructura
          [COMPLETAR: proveedor de hosting y de base de datos], envío de emails
          (Resend), cobro de suscripciones (Mercado Pago) e inicio de sesión con
          Google. Algunos de estos proveedores pueden almacenar datos fuera de
          Argentina; en esos casos exigimos niveles de protección adecuados.
        </p>
        <p>
          También podemos entregar datos cuando lo exija una autoridad
          competente conforme a la ley.
        </p>
      </LegalSection>

      <LegalSection title="5. Cuánto tiempo los guardamos">
        <p>
          Mientras tu cuenta esté activa. Si la cerrás, eliminamos o
          anonimizamos tus datos y los de tus huéspedes dentro de los 90 días,
          salvo los que debamos conservar por obligaciones legales o
          contables.
        </p>
      </LegalSection>

      <LegalSection title="6. Seguridad">
        <p>
          Usamos conexiones cifradas (HTTPS), contraseñas hasheadas, límites de
          intentos en el acceso y aislamiento de los datos de cada cuenta.
          Ningún sistema es 100% infalible; si detectamos un incidente que
          afecte tus datos, te vamos a avisar.
        </p>
      </LegalSection>

      <LegalSection title="7. Tus derechos">
        <p>
          Podés pedir acceso, rectificación, actualización o supresión de tus
          datos escribiendo a{" "}
          <a className="text-emerald-400 hover:underline" href={`mailto:${LEGAL_ENTITY.email}`}>
            {LEGAL_ENTITY.email}
          </a>
          . Respondemos los pedidos de acceso dentro de los 10 días corridos y
          los de rectificación o supresión dentro de los 5 días hábiles.
        </p>
        <p>
          La Agencia de Acceso a la Información Pública, en su carácter de
          Órgano de Control de la Ley 25.326, tiene la atribución de atender
          las denuncias y reclamos que interpongan quienes resulten afectados
          en sus derechos por incumplimiento de las normas vigentes en materia
          de protección de datos personales.
        </p>
      </LegalSection>

      <LegalSection title="8. Cookies">
        <p>
          Usamos una cookie propia y necesaria para mantener tu sesión
          iniciada, y guardamos en tu navegador la preferencia de tema
          claro/oscuro. No usamos cookies de publicidad ni de seguimiento de
          terceros.
        </p>
      </LegalSection>

      <LegalSection title="9. Cambios">
        <p>
          Si modificamos esta política de forma relevante, te lo vamos a
          avisar por email o dentro de la app antes de que entre en vigencia.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
