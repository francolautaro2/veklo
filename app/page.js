import Link from "next/link";
import BrandLogo from "@/app/_components/brand-logo";
import styles from "./landing.module.css";

const features = [
  {
    icon: "📅",
    title: "Reservas sin solapamiento",
    description:
      "Creá y gestioná reservas con validación automática. Nunca más dos huéspedes en la misma habitación el mismo día.",
  },
  {
    icon: "✅",
    title: "Pre check-in digital",
    description:
      "Mandás un link al huésped antes de que llegue. Él carga sus datos y vos los ves en el panel, sin papeles ni demoras.",
  },
  {
    icon: "📊",
    title: "Dashboard en tiempo real",
    description:
      "Ocupación, check-ins del día, tendencias y resumen general. Todo de un vistazo y siempre actualizado.",
  },
  {
    icon: "💳",
    title: "Cobros con MercadoPago",
    description:
      "Aceptá pagos y señas directamente desde la plataforma con integración nativa y gestión centralizada.",
  },
  {
    icon: "🔗",
    title: "Sync con Booking y Airbnb",
    description:
      "Sincronizá disponibilidad vía iCal con Booking.com y Airbnb para evitar overbooking entre plataformas.",
  },
  {
    icon: "📩",
    title: "Emails automáticos",
    description:
      "Confirmaciones de reserva, recordatorios de pre check-in y avisos claves enviados de forma automática.",
  },
];

const plans = [
  {
    name: "Pro",
    amount: "49.900",
    period: "ARS / mes",
    description:
      "Ideal para propietarios con una sola propiedad que quieren ordenar su operación.",
    items: [
      "1 propiedad",
      "Habitaciones ilimitadas",
      "Reservas ilimitadas",
      "Pre check-in digital",
      "Dashboard con métricas",
      "Emails automáticos",
      "Integración MercadoPago",
      "Soporte por email",
    ],
    href: "/auth/register?plan=pro",
    cta: "Empezar prueba gratis",
  },
  {
    name: "Plus",
    amount: "89.000",
    period: "ARS / mes",
    description:
      "Para quienes gestionan múltiples propiedades y necesitan todo centralizado.",
    items: [
      "Hasta 5 propiedades",
      "Habitaciones ilimitadas",
      "Reservas ilimitadas",
      "Pre check-in digital",
      "Dashboard avanzado + exportar",
      "Emails automáticos",
      "Integración MercadoPago",
      "Sync iCal con Booking y Airbnb",
      "Reportes de ingresos",
      "Soporte prioritario por WhatsApp",
    ],
    href: "/auth/register?plan=plus",
    cta: "Empezar prueba gratis →",
    featured: true,
  },
];

const testimonials = [
  {
    quote:
      "Antes usaba planillas y WhatsApp para todo. Con veklo tardé una semana en ordenar la operación.",
    name: "Marcela R.",
    role: "Complejo de cabañas · Bariloche",
  },
  {
    quote:
      "Tengo 3 propiedades y era un caos coordinar todo. Ahora veo todo desde un solo lugar y sin sobreventas.",
    name: "Javier M.",
    role: "Apart-hotel · Mendoza",
  },
  {
    quote:
      "El sistema es intuitivo y el soporte responde rápido. En dos días ya lo tenía funcionando.",
    name: "Carolina P.",
    role: "Hostería boutique · Salta",
  },
];

export default function Home() {
  return (
    <main className={styles.page}>
      <header className={styles.nav}>
        <div className={styles.container}>
          <div className={styles.navInner}>
            <Link href="/" aria-label="Ir al inicio de veklo">
              <BrandLogo size="sm" className={styles.brandText} textClassName={styles.brandText} />
            </Link>

            <nav>
              <ul className={styles.navLinks}>
                <li>
                  <a href="#features">Funciones</a>
                </li>
                <li>
                  <a href="#como-funciona">Cómo funciona</a>
                </li>
                <li>
                  <a href="#precios">Precios</a>
                </li>
              </ul>
            </nav>

            <div className={styles.navActions}>
              <Link href="/auth/login" className={styles.linkGhost}>
                Iniciar sesión
              </Link>
              <a href="#precios" className={styles.btnNav}>
                Empezar gratis →
              </a>
            </div>
          </div>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.heroGrid}>
            <div>
              <span className={styles.tag}>Nuevo en Argentina</span>
              <h1 className={styles.heroTitle}>
                Tu alojamiento,
                <br />
                <span className={styles.accent}>sin el caos</span>
                <br />
                de siempre.
              </h1>
              <p className={styles.heroSub}>
                Gestioná reservas, check-ins y habitaciones desde un solo panel.
                Sin Excel, sin WhatsApp desbordado y sin errores.
              </p>

              <div className={styles.heroCta}>
                <Link href="/auth/register" className={styles.btnPrimary}>
                  Probalo gratis 14 días
                  <span aria-hidden>→</span>
                </Link>
                <a href="#como-funciona" className={styles.btnGhost}>
                  Ver cómo funciona ↓
                </a>
              </div>

              <p className={styles.heroNote}>
                Sin tarjeta de crédito. Cancelá cuando quieras.
              </p>
            </div>

            <div className={styles.heroVisual}>
              <div className={styles.dashboardMockup}>
                <div className={styles.mockTopbar}>
                  <span className={`${styles.mockDot} ${styles.mockDotRed}`} />
                  <span className={`${styles.mockDot} ${styles.mockDotAmber}`} />
                  <span className={`${styles.mockDot} ${styles.mockDotGreen}`} />
                  <span className={styles.mockTitle}>veklo · dashboard</span>
                </div>

                <div className={styles.mockBody}>
                  <div className={styles.mockStats}>
                    <div className={styles.mockStat}>
                      <p className={styles.mockStatLabel}>Ocupación</p>
                      <p
                        className={`${styles.mockStatValue} ${styles.mockStatValueAccent}`}
                      >
                        87%
                      </p>
                    </div>
                    <div className={styles.mockStat}>
                      <p className={styles.mockStatLabel}>Check-ins hoy</p>
                      <p className={styles.mockStatValue}>4</p>
                    </div>
                    <div className={styles.mockStat}>
                      <p className={styles.mockStatLabel}>Reservas</p>
                      <p className={styles.mockStatValue}>12</p>
                    </div>
                  </div>

                  <div className={styles.mockTable}>
                    <div className={`${styles.mockRow} ${styles.mockRowHeader}`}>
                      <span>Huésped</span>
                      <span>Hab.</span>
                      <span>Estado</span>
                    </div>
                    <div className={styles.mockRow}>
                      <span>Martínez, L.</span>
                      <span className={styles.mockMuted}>Hab. 3</span>
                      <span className={`${styles.badge} ${styles.badgeCheckin}`}>
                        Check-in
                      </span>
                    </div>
                    <div className={styles.mockRow}>
                      <span>Rodríguez, P.</span>
                      <span className={styles.mockMuted}>Cabaña 1</span>
                      <span className={`${styles.badge} ${styles.badgeReservada}`}>
                        Reservada
                      </span>
                    </div>
                    <div className={styles.mockRow}>
                      <span>González, A.</span>
                      <span className={styles.mockMuted}>Suite</span>
                      <span className={`${styles.badge} ${styles.badgeCheckout}`}>
                        Check-out
                      </span>
                    </div>
                    <div className={styles.mockRow}>
                      <span>López, F.</span>
                      <span className={styles.mockMuted}>Hab. 7</span>
                      <span className={`${styles.badge} ${styles.badgeCheckin}`}>
                        Check-in
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.floatCard}>
                <p className={styles.floatCardTitle}>Pre check-in recibido</p>
                <p className={styles.floatCardBody}>✓ Martínez, L.</p>
                <p className={styles.floatCardSub}>Datos completos · hace 2 min</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.logosBar}>
        <div className={styles.container}>
          <div className={styles.logosInner}>
            <span className={styles.logosLabel}>Integrado con</span>
            <span className={styles.platformBadge}>🔵 Booking.com</span>
            <span className={styles.platformBadge}>🌸 Airbnb</span>
            <span className={styles.platformBadge}>💳 MercadoPago</span>
            <span className={styles.platformBadge}>📧 Email automático</span>
            <span className={styles.platformBadge}>📱 Pre check-in digital</span>
          </div>
        </div>
      </div>

      <section className={`${styles.section} ${styles.features}`} id="features">
        <div className={styles.container}>
          <div className={styles.featuresHeader}>
            <div className={styles.sectionTag}>
              <span className={styles.tag}>Funciones</span>
            </div>
            <h2 className={styles.sectionTitle}>
              Todo lo que necesitás,
              <br />
              en un solo lugar.
            </h2>
            <p className={styles.sectionSub}>
              Diseñado para hoteles, cabañas y alquileres temporarios en
              Argentina, con foco en operación real y velocidad.
            </p>
          </div>

          <div className={styles.featuresGrid}>
            {features.map((feature) => (
              <article key={feature.title} className={styles.featureCard}>
                <div className={styles.featureIcon}>{feature.icon}</div>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureDesc}>{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.how}`} id="como-funciona">
        <div className={styles.container}>
          <div className={styles.howInner}>
            <div>
              <div className={styles.sectionTag}>
                <span className={styles.tag}>Así funciona</span>
              </div>
              <h2 className={styles.sectionTitle}>
                De la reserva
                <br />
                al check-out.
                <br />
                <span className={styles.accent}>En minutos.</span>
              </h2>

              <div className={styles.steps}>
                <article className={`${styles.step} ${styles.stepActive}`}>
                  <span className={styles.stepNum}>1</span>
                  <div>
                    <h4 className={styles.stepTitle}>Cargás la reserva</h4>
                    <p className={styles.stepDesc}>
                      En menos de 30 segundos tenés la reserva creada, habitación
                      asignada y la seña registrada.
                    </p>
                  </div>
                </article>

                <article className={styles.step}>
                  <span className={styles.stepNum}>2</span>
                  <div>
                    <h4 className={styles.stepTitle}>
                      El huésped hace el pre check-in
                    </h4>
                    <p className={styles.stepDesc}>
                      Le enviás un link y completa sus datos desde el celular.
                      Cuando llega, ya tenés todo listo en panel.
                    </p>
                  </div>
                </article>

                <article className={styles.step}>
                  <span className={styles.stepNum}>3</span>
                  <div>
                    <h4 className={styles.stepTitle}>
                      Gestionás el día desde el dashboard
                    </h4>
                    <p className={styles.stepDesc}>
                      Check-ins, check-outs, ocupación y novedades en una vista
                      limpia, sin buscar en chats ni planillas.
                    </p>
                  </div>
                </article>
              </div>
            </div>

            <div className={styles.howVisual}>
              <div className={styles.checkinHeader}>
                <span className={styles.checkinAvatar}>M</span>
                <div>
                  <p className={styles.checkinInfoTitle}>
                    Pre check-in · Cabaña del Bosque
                  </p>
                  <p className={styles.checkinInfoSub}>
                    Llegada: Sáb 18 de mayo · 15:00 hs
                  </p>
                </div>
              </div>

              <div className={styles.checkinField}>
                <label>Nombre completo</label>
                <div className={styles.checkinInput}>Martínez, Lucía Andrea</div>
              </div>
              <div className={styles.checkinField}>
                <label>DNI / Pasaporte</label>
                <div className={styles.checkinInput}>38.422.917</div>
              </div>
              <div className={styles.checkinField}>
                <label>Cantidad de personas</label>
                <div className={styles.checkinInput}>2 adultos · 1 menor</div>
              </div>
              <div className={styles.checkinField}>
                <label>Teléfono de contacto</label>
                <div className={styles.checkinInput}>+54 9 11 5544 3322</div>
              </div>

              <button type="button" className={styles.checkinBtn}>
                Confirmar pre check-in ✓
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.pricing}`} id="precios">
        <div className={styles.container}>
          <div className={styles.pricingHeader}>
            <div className={styles.sectionTag}>
              <span className={styles.tag}>Precios</span>
            </div>
            <h2 className={styles.sectionTitle}>Simple. Sin sorpresas.</h2>
            <p className={styles.sectionSub}>
              14 días de prueba gratis en cualquier plan. Sin tarjeta de crédito.
            </p>
          </div>

          <div className={styles.pricingGrid}>
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={`${styles.planCard} ${plan.featured ? styles.planFeatured : ""}`}
              >
                <p className={styles.planName}>{plan.name}</p>
                <div className={styles.planPrice}>
                  <span className={styles.planCurrency}>$</span>
                  <span className={styles.planAmount}>{plan.amount}</span>
                  <span className={styles.planPeriod}>{plan.period}</span>
                </div>
                <p className={styles.planDesc}>{plan.description}</p>

                <hr className={styles.planDivider} />

                <ul className={styles.planFeatures}>
                  {plan.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={plan.featured ? styles.btnPlanPrimary : styles.btnPlan}
                >
                  {plan.cta}
                </Link>
              </article>
            ))}
          </div>

          <p className={styles.pricingNote}>
            Precios en pesos argentinos · IVA no incluido · Podés cancelar cuando
            quieras.
          </p>
        </div>
      </section>

      <section className={`${styles.section} ${styles.testimonials}`}>
        <div className={styles.container}>
          <div className={styles.testimonialsHeader}>
            <div className={styles.sectionTag}>
              <span className={styles.tag}>Testimonios</span>
            </div>
            <h2 className={styles.sectionTitle}>
              Lo que dicen
              <br />
              nuestros clientes.
            </h2>
          </div>

          <div className={styles.testimonialsGrid}>
            {testimonials.map((testimonial) => (
              <article key={testimonial.name} className={styles.testimonialCard}>
                <p className={styles.testimonialStars}>★★★★★</p>
                <p className={styles.testimonialQuote}>“{testimonial.quote}”</p>
                <div className={styles.testimonialAuthor}>
                  <span className={styles.testimonialAvatar}>
                    {testimonial.name.charAt(0)}
                  </span>
                  <div>
                    <p className={styles.testimonialName}>{testimonial.name}</p>
                    <p className={styles.testimonialRole}>{testimonial.role}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.finalCta}`}>
        <div className={styles.container}>
          <div className={styles.finalCtaInner}>
            <h2 className={styles.finalTitle}>
              Dejá de gestionar
              <br />
              con <span className={styles.accent}>WhatsApp y Excel.</span>
            </h2>
            <p className={styles.finalSub}>
              Probalo 14 días gratis. Sin tarjeta. Sin compromiso.
            </p>
            <Link href="/auth/register" className={styles.btnPrimary}>
              Empezar ahora →
            </Link>
            <p className={styles.finalNote}>
              ✓ Setup en menos de 5 minutos · ✓ Soporte en español · ✓ Hecho en
              Argentina
            </p>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerInner}>
            <div>
              <BrandLogo size="sm" className={styles.brandText} textClassName={styles.brandText} />
              <p className={styles.footerBrandText}>
                Software de gestión para alojamientos argentinos. Simple, rápido y
                sin excusas.
              </p>
            </div>

            <div className={styles.footerLinks}>
              <h4>Producto</h4>
              <ul>
                <li>
                  <a href="#features">Funciones</a>
                </li>
                <li>
                  <a href="#precios">Precios</a>
                </li>
                <li>
                  <Link href="/dashboard">Demo</Link>
                </li>
              </ul>
            </div>

            <div className={styles.footerLinks}>
              <h4>Cuenta</h4>
              <ul>
                <li>
                  <Link href="/auth/register">Crear cuenta</Link>
                </li>
                <li>
                  <Link href="/auth/login">Iniciar sesión</Link>
                </li>
                <li>
                  <a href="mailto:hola@veklo.app">Contacto</a>
                </li>
              </ul>
            </div>

            <div className={styles.footerLinks}>
              <h4>Legal</h4>
              <ul>
                <li>
                  <a href="#">Términos</a>
                </li>
                <li>
                  <a href="#">Privacidad</a>
                </li>
              </ul>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <span>© {new Date().getFullYear()} veklo. Hecho en Argentina.</span>
            <span>Todos los precios en ARS.</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
