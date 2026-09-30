import LegalPage, { LegalSection } from "@/app/_components/legal-page";
import RevocationForm from "./revocation-form";

export const metadata = {
  title: "veklo - Botón de arrepentimiento",
  description:
    "Revocá la contratación de veklo dentro de los 10 días corridos.",
};

export default function RevocationPage() {
  return (
    <LegalPage title="Botón de arrepentimiento" updatedAt="[COMPLETAR: fecha]">
      <LegalSection title="Revocar la contratación">
        <p>
          Si contrataste veklo como consumidor, podés revocar la contratación
          dentro de los 10 días corridos desde que la hiciste, sin costo ni
          necesidad de explicar el motivo (art. 34 de la Ley 24.240 y
          Resolución 424/2020).
        </p>
        <p>
          Completá el formulario: te damos un código de trámite en el momento,
          cancelamos la suscripción y te reintegramos lo cobrado.
        </p>
      </LegalSection>

      <RevocationForm />
    </LegalPage>
  );
}
