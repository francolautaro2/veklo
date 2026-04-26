import styles from "@/app/landing.module.css";

const integrations = [
  { icon: "🔵", label: "Booking.com" },
  { icon: "🌸", label: "Airbnb" },
  { icon: "💳", label: "Pagos manuales" },
  { icon: "📧", label: "Email automático" },
  { icon: "📱", label: "Pre check-in digital" },
];

export default function IntegrationsCarousel() {
  return (
    <div className={styles.integrationsCarousel} aria-label="Integraciones disponibles">
      <div className={styles.integrationsTrack}>
        {[...integrations, ...integrations].map((integration, index) => (
          <span
            key={`${integration.label}-${index}`}
            className={styles.integrationSlide}
            aria-hidden={index >= integrations.length}
          >
            <span aria-hidden>{integration.icon}</span>
            {integration.label}
          </span>
        ))}
      </div>
    </div>
  );
}
