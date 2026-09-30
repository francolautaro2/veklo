import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import BrandLogo from "@/app/_components/brand-logo";
import LandingThemeToggle from "@/app/_components/landing-theme-toggle";
import Icon from "@/app/_components/icon";
import { PLAN_LIMITS, TRIAL_DAYS } from "@/lib/subscription";
import styles from "./landing.module.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-landing-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-landing-mono" });

export const metadata = {
  title: "veklo · Sistema de reservas para cabañas, hosterías y alquileres temporarios",
  description:
    "Calendario por habitación, pre check-in online, control de señas y sincronización con Airbnb y Booking.com. Probalo gratis 14 días.",
  openGraph: {
    title: "veklo · Sistema de reservas para tu alojamiento",
    description:
      "Calendario por habitación, pre check-in online, control de señas y sincronización con Airbnb y Booking.com.",
    type: "website",
    locale: "es_AR",
  },
};

/* ---------- Contenido ---------- */

const plus = PLAN_LIMITS.plus;
const pro = PLAN_LIMITS.pro;
const formatArs = (value) => `$${value.toLocaleString("es-AR")}`;

const TIMELINE_DAYS = [
  ["L", 12], ["M", 13], ["M", 14], ["J", 15], ["V", 16], ["S", 17], ["D", 18],
  ["L", 19], ["M", 20], ["M", 21], ["J", 22], ["V", 23], ["S", 24], ["D", 25],
];
const TODAY_INDEX = 3;
// En pantallas chicas el calendario muestra solo la primera semana.
const MOBILE_DAYS = 7;

// [inicio (índice de día), noches, texto, detalle, tipo]
const TIMELINE_ROOMS = [
  {
    name: "Cabaña 1",
    detail: "4 pax",
    bookings: [
      [0, 3, "Martínez", "3 noches", "confirmed"],
      [3, 4, "Airbnb", "Importada", "airbnb"],
      [8, 3, "Gómez", "Seña pendiente", "pending"],
      [11, 3, "Ruiz", "3 noches", "confirmed"],
    ],
  },
  {
    name: "Cabaña 2",
    detail: "6 pax",
    bookings: [
      [1, 4, "Lucía Martínez", "Pre check-in listo", "confirmed"],
      [6, 2, "Booking.com", "Importada", "booking"],
      [9, 4, "Fernández", "4 noches", "confirmed"],
    ],
  },
  {
    name: "Suite Río",
    detail: "2 pax",
    bookings: [
      [0, 2, "Pereyra", "2 noches", "confirmed"],
      [2, 5, "Díaz", "Seña pendiente", "pending"],
      [10, 3, "Airbnb", "Importada", "airbnb"],
    ],
  },
  {
    name: "Loft Sur",
    detail: "3 pax",
    bookings: [
      [1, 3, "Booking.com", "Importada", "booking"],
      [5, 4, "Sosa", "4 noches", "confirmed"],
      [12, 2, "Luna", "Seña pendiente", "pending"],
    ],
  },
  {
    name: "Domo",
    detail: "2 pax",
    bookings: [
      [0, 1, "Vera", "1 noche", "confirmed"],
      [4, 3, "Romero", "3 noches", "confirmed"],
      [8, 5, "Airbnb", "Importada", "airbnb"],
    ],
  },
];

const BAR_CLASS = {
  confirmed: styles.barConfirmed,
  pending: styles.barPending,
  airbnb: styles.barAirbnb,
  booking: styles.barBooking,
};

const EXTRAS = [
  {
    icon: "calendar",
    title: "Calendario por habitación",
    text: "Todas tus habitaciones en una vista mensual, con el estado de pago de cada reserva.",
  },
  {
    icon: "layers",
    title: "Sin reservas superpuestas",
    text: "veklo no te deja cargar dos reservas en la misma habitación y las mismas fechas.",
  },
  {
    icon: "mail",
    title: "Emails automáticos",
    text: "Confirmación al huésped con su link de pre check-in, y un aviso para vos cuando lo completa.",
  },
  {
    icon: "gauge",
    title: "El día de un vistazo",
    text: "Check-ins, check-outs, ocupación e ingresos del período en un solo panel.",
  },
  {
    icon: "building",
    title: "Varias propiedades",
    text: `Hasta ${plus.maxProperties} propiedades desde una sola cuenta con el plan ${plus.label}.`,
  },
  {
    icon: "download",
    title: "Tus datos, exportables",
    text: `Descargá todas tus reservas en un CSV que abre directo en Excel (plan ${plus.label}).`,
  },
];

const STEPS = [
  {
    title: "Creá tu cuenta",
    text: `${TRIAL_DAYS} días gratis, sin cargar tarjeta. Entrás con tu email o con Google.`,
  },
  {
    title: "Cargá tu alojamiento",
    text: "Tu propiedad, sus habitaciones con capacidad y precio, y las preguntas del pre check-in.",
  },
  {
    title: "Empezá a trabajar",
    text: `Cargá reservas, mandá los links de pre check-in y, con ${plus.label}, conectá Airbnb y Booking.com.`,
  },
];

const TESTIMONIALS = [
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

const PLANS = [
  {
    key: "pro",
    name: pro.label,
    price: formatArs(pro.monthlyPriceArs),
    description: "Para ordenar la operación de una propiedad.",
    listTitle: "Incluye",
    items: [
      "1 propiedad",
      "Habitaciones y reservas ilimitadas",
      "Pre check-in digital con preguntas propias",
      "Calendario y panel con métricas",
      "Control de pagos y señas",
      "Emails automáticos",
      "Soporte por email",
    ],
    href: "/auth/register?plan=pro",
  },
  {
    key: "plus",
    name: plus.label,
    price: formatArs(plus.monthlyPriceArs),
    description: "Para quienes venden en Airbnb o Booking.com, o tienen más de una propiedad.",
    listTitle: `Todo lo de ${pro.label}, y además`,
    items: [
      `Hasta ${plus.maxProperties} propiedades`,
      "Sincronización con Airbnb y Booking.com",
      "Exportación de reservas a CSV",
      "Soporte prioritario por WhatsApp",
    ],
    href: "/auth/register?plan=plus",
    featured: true,
  },
];

const FAQ = [
  {
    q: "¿Necesito tarjeta para la prueba gratis?",
    a: `No. Creás tu cuenta y usás veklo ${TRIAL_DAYS} días sin cargar ningún medio de pago. Al terminar la prueba elegís un plan y lo pagás con Mercado Pago.`,
  },
  {
    q: "¿Funciona con Airbnb y Booking.com?",
    a: `Sí, en el plan ${plus.label}. Usamos los calendarios iCal que ofrecen las dos plataformas: sus reservas bloquean tus fechas en veklo y tu disponibilidad se exporta para que no te reserven dos veces.`,
  },
  {
    q: "¿Cuántas habitaciones puedo cargar?",
    a: `Ilimitadas en los dos planes. Lo que cambia es la cantidad de propiedades: 1 en ${pro.label} y hasta ${plus.maxProperties} en ${plus.label}.`,
  },
  {
    q: "¿El huésped tiene que descargar una app?",
    a: "No. El pre check-in es un link que se abre en el navegador del celular y se completa en un par de minutos.",
  },
  {
    q: "¿Puedo cobrarles a los huéspedes desde veklo?",
    a: "veklo no procesa pagos de huéspedes. Registrás cada cobro con su método y podés sumar tu propio link de pago, por ejemplo de Mercado Pago, que le llega al huésped en el email de confirmación.",
  },
  {
    q: "¿Puedo cancelar cuando quiera?",
    a: "Sí, desde tu perfil y sin permanencia mínima. Si contrataste como consumidor, además tenés 10 días para arrepentirte y te devolvemos lo cobrado.",
  },
];

/* ---------- Maquetas del producto ---------- */

function CalendarMock() {
  return (
    <div
      className={styles.app}
      role="img"
      aria-label="Calendario de reservas de veklo con cinco habitaciones y reservas propias, de Airbnb y de Booking.com"
    >
      <div className={styles.appBar}>
        <div className={styles.appBarTitle}>
          <strong>Calendario</strong>
          <span>12 – 25 de octubre</span>
        </div>
        <div className={styles.appBarActions}>
          <span className={styles.segmented}>
            <span>Semana</span>
            <span className={styles.segOn}>Quincena</span>
            <span>Mes</span>
          </span>
          <span className={styles.appPrimary}>
            <Icon name="plus" size={14} strokeWidth={2} />
            Nueva reserva
          </span>
        </div>
      </div>

      <div className={styles.appBody}>
        <div className={styles.appSide}>
          <span><Icon name="gauge" size={16} />Resumen</span>
          <span><Icon name="list" size={16} />Reservas</span>
          <span className={styles.sideOn}><Icon name="calendar" size={16} />Calendario</span>
          <span><Icon name="home" size={16} />Propiedades</span>
          <span><Icon name="door" size={16} />Habitaciones</span>
        </div>

        <div className={styles.timeline}>
          <div className={`${styles.tlRow} ${styles.tlHead}`}>
            <span className={styles.tlLabel}>
              <span className={styles.tlHide}>Unidades</span>
            </span>
            {TIMELINE_DAYS.map(([weekday, day], index) => (
              <span
                key={day}
                className={[
                  styles.tlDay,
                  index === TODAY_INDEX ? styles.tlToday : "",
                  index >= MOBILE_DAYS ? styles.tlHide : "",
                ].join(" ")}
              >
                {weekday}
                <b>{day}</b>
              </span>
            ))}
          </div>

          {TIMELINE_ROOMS.map((room) => (
            <div key={room.name} className={`${styles.tlRow} ${styles.tlRoom}`}>
              <span className={styles.tlLabel}>
                {room.name}
                <small>{room.detail}</small>
              </span>
              {room.bookings.map(([start, nights, label, detail, kind]) => (
                <span
                  key={start}
                  className={[
                    styles.bar,
                    BAR_CLASS[kind],
                    start >= MOBILE_DAYS ? styles.tlHide : "",
                  ].join(" ")}
                  style={{
                    "--start": start + 2,
                    "--span": nights,
                    // En celular se ven 7 días: la barra se recorta al borde.
                    "--span-sm": Math.max(1, Math.min(nights, MOBILE_DAYS - start)),
                  }}
                >
                  {label}
                  {nights > 1 && <small>{detail}</small>}
                </span>
              ))}
            </div>
          ))}

          <div className={styles.tlLegend}>
            <span><i className={`${styles.swatch} ${styles.barConfirmed}`} />Confirmada</span>
            <span><i className={`${styles.swatch} ${styles.barPending}`} />Seña pendiente</span>
            <span><i className={`${styles.swatch} ${styles.barAirbnb}`} />Airbnb</span>
            <span><i className={`${styles.swatch} ${styles.barBooking}`} />Booking.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreCheckInMock() {
  return (
    <div
      className={styles.phone}
      role="img"
      aria-label="Formulario de pre check-in en el celular del huésped"
    >
      <div className={styles.phoneScreen}>
        <div className={styles.phoneNotch} />
        <p className={styles.phoneTitle}>Cabañas del Bosque</p>
        <p className={styles.phoneSub}>Cabaña 2 · llegada sáb 17 de octubre</p>

        <div className={styles.field}>
          <span>Nombre y apellido</span>
          <div>Lucía Martínez</div>
        </div>
        <div className={styles.field}>
          <span>DNI o pasaporte</span>
          <div>38.422.917</div>
        </div>
        <div className={styles.field}>
          <span>¿A qué hora llegás?</span>
          <div>Entre las 15 y las 17 hs</div>
        </div>
        <div className={styles.checkField}>
          <span className={styles.checkBox}>
            <Icon name="check" size={12} strokeWidth={2.4} />
          </span>
          Desayuno
          <em>+ $6.000</em>
        </div>
        <div className={styles.phoneBtn}>Confirmar pre check-in</div>
      </div>
    </div>
  );
}

function PaymentsMock() {
  const rows = [
    ["Gómez", "Cabaña 1 · 20 al 23 oct", "$96.000", "Vence hoy", styles.chipWarn],
    ["Díaz", "Suite Río · 14 al 19 oct", "$145.000", "Vencido", styles.chipDanger],
    ["Luna", "Loft Sur · 24 al 26 oct", "$58.000", "Vence el 20", styles.chipWarn],
    ["Fernández", "Cabaña 2 · 21 al 25 oct", "$0", "Pagado", styles.chipOk],
  ];

  return (
    <div
      className={styles.card}
      role="img"
      aria-label="Resumen de pagos pendientes con saldos y vencimientos"
    >
      <div className={styles.statGrid}>
        <div className={styles.stat}>
          <span>Por cobrar</span>
          <strong>$299.000</strong>
        </div>
        <div className={styles.stat}>
          <span>Cobrado en octubre</span>
          <strong>$1.284.500</strong>
        </div>
      </div>
      {rows.map(([guest, detail, amount, status, chipClass]) => (
        <div key={guest} className={styles.payRow}>
          <div>
            <strong>{guest}</strong>
            <small>{detail}</small>
          </div>
          <span className={styles.amount}>{amount}</span>
          <span className={`${styles.chip} ${chipClass}`}>{status}</span>
        </div>
      ))}
    </div>
  );
}

function ChannelsMock() {
  const channels = [
    ["A", styles.channelAirbnb, "Airbnb", "6 reservas importadas"],
    ["B", styles.channelBooking, "Booking.com", "3 reservas importadas"],
  ];

  return (
    <div
      className={styles.card}
      role="img"
      aria-label="Calendarios de Airbnb y Booking.com sincronizados en una habitación"
    >
      <div className={styles.cardHead}>
        <strong>Cabaña 1 · Calendarios</strong>
        <span>Sincronización automática</span>
      </div>
      {channels.map(([initial, logoClass, name, detail]) => (
        <div key={name} className={styles.channel}>
          <span className={`${styles.channelLogo} ${logoClass}`}>{initial}</span>
          <div>
            <strong>{name}</strong>
            <small>{detail}</small>
          </div>
          <span className={styles.syncState}>
            <i className={styles.syncDot} />
            Al día
          </span>
        </div>
      ))}
      <div className={styles.channel}>
        <span className={`${styles.channelLogo} ${styles.channelExport}`}>
          <Icon name="link" size={16} />
        </span>
        <div>
          <strong>Tu disponibilidad</strong>
          <small className={styles.mono}>veklo.app/api/ical/export/9f3c…</small>
        </div>
        <span className={styles.copyBtn}>Copiar</span>
      </div>
    </div>
  );
}

function CheckList({ items }) {
  return (
    <ul className={styles.checkList}>
      {items.map((item) => (
        <li key={item}>
          <Icon name="check" size={16} strokeWidth={2} />
          {item}
        </li>
      ))}
    </ul>
  );
}

function FeatureRow({ kicker, title, badge, text, items, reverse, children }) {
  return (
    <div className={`${styles.featureRow} ${reverse ? styles.featureRowReverse : ""}`}>
      <div className={styles.featureCopy}>
        <span className={`${styles.kicker} ${styles.mono}`}>{kicker}</span>
        <h3 className={styles.featureTitle}>
          {title}
          {badge && <span className={styles.planBadge}>{badge}</span>}
        </h3>
        <p className={styles.featureText}>{text}</p>
        <CheckList items={items} />
      </div>
      <div className={styles.panel}>{children}</div>
    </div>
  );
}

/* ---------- Página ---------- */

export default function Home() {
  return (
    <main className={`${styles.page} ${sans.variable} ${mono.variable}`}>
      <header className={styles.nav}>
        <div className={`${styles.container} ${styles.navInner}`}>
          <Link href="/" aria-label="veklo, ir al inicio" className={styles.brand}>
            <BrandLogo size="sm" />
          </Link>

          <nav aria-label="Secciones">
            <ul className={styles.navLinks}>
              <li><a href="#producto">Producto</a></li>
              <li><a href="#precios">Precios</a></li>
              <li><a href="#preguntas">Preguntas frecuentes</a></li>
            </ul>
          </nav>

          <div className={styles.navActions}>
            <LandingThemeToggle />
            <Link href="/auth/login" className={styles.navLogin}>
              Iniciar sesión
            </Link>
            <Link href="/auth/register" className={`${styles.btn} ${styles.btnSmall}`}>
              Probar gratis
            </Link>
          </div>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.heroText}>
            <p className={styles.eyebrow}>
              <span className={styles.eyebrowDot} aria-hidden="true" />
              Para cabañas, hosterías y alquileres temporarios
            </p>
            <h1 className={styles.heroTitle}>
              El sistema de reservas para tu alojamiento.
            </h1>
            <p className={styles.heroSub}>
              Calendario por habitación, pre check-in online, control de señas
              y sincronización con Airbnb y Booking.com. Todo en un solo lugar,
              pensado para cómo se trabaja en Argentina.
            </p>
            <div className={styles.heroCta}>
              <Link href="/auth/register" className={styles.btn}>
                Probar {TRIAL_DAYS} días gratis
                <Icon name="arrowRight" size={16} />
              </Link>
              <a href="#precios" className={styles.btnSecondary}>
                Ver precios
              </a>
            </div>
            <p className={styles.heroNote}>
              Sin tarjeta de crédito · Cancelás cuando quieras
            </p>
          </div>

          <div className={styles.heroStage}>
            <CalendarMock />
            <div className={styles.toast} aria-hidden="true">
              <span className={styles.toastIcon}>
                <Icon name="check" size={16} strokeWidth={2.2} />
              </span>
              <div>
                <strong>Pre check-in completado</strong>
                <span>Lucía Martínez · Cabaña 2 · hace 2 min</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="producto" className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <span className={`${styles.kicker} ${styles.mono}`}>Producto</span>
            <h2 className={styles.sectionTitle}>
              Lo que necesitás para el día a día, sin planillas ni chats.
            </h2>
            <p className={styles.sectionSub}>
              Desde que entra la reserva hasta que el huésped se va: los datos,
              los pagos y la disponibilidad quedan en el mismo sistema.
            </p>
          </div>

          <FeatureRow
            kicker="Pre check-in"
            title="Los datos del huésped llegan antes que el huésped."
            text="Cada reserva tiene su link para que el huésped cargue documento, contacto y lo que vos quieras preguntarle. Cuando lo completa, te llega un email y lo ves en la reserva."
            items={[
              "Se completa desde el celular, sin descargar nada",
              "Preguntas propias por propiedad, con costo opcional",
              "Recordatorio automático dos días antes de la llegada",
            ]}
          >
            <PreCheckInMock />
          </FeatureRow>

          <FeatureRow
            reverse
            kicker="Cobros y señas"
            title="Sabé qué falta cobrar sin revisar conversaciones."
            text="Registrá el total, la seña y cada pago con su método. El panel te muestra los saldos pendientes y los pagos vencidos antes de que llegue el huésped."
            items={[
              "Seña, saldo y fecha de vencimiento por reserva",
              "Efectivo, transferencia, Mercado Pago u otro método",
              "Tu link de pago viaja en el email de confirmación",
            ]}
          >
            <PaymentsMock />
          </FeatureRow>

          <FeatureRow
            kicker="Canales"
            title="Airbnb, Booking.com y tus reservas directas en un solo calendario."
            badge={`Plan ${plus.label}`}
            text="Conectá los calendarios iCal de cada plataforma: sus reservas bloquean tus fechas en veklo y tu disponibilidad se publica para que no te reserven dos veces la misma habitación."
            items={[
              "Sincronización automática, sin cargar nada a mano",
              "Un link de disponibilidad por habitación",
              "Funciona con cualquier calendario iCal",
            ]}
          >
            <ChannelsMock />
          </FeatureRow>

          <div className={styles.extras}>
            {EXTRAS.map((extra) => (
              <div key={extra.title} className={styles.extra}>
                <h3>
                  <Icon name={extra.icon} size={20} />
                  {extra.title}
                </h3>
                <p>{extra.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionBorder}`}>
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <span className={`${styles.kicker} ${styles.mono}`}>Cómo empezar</span>
            <h2 className={styles.sectionTitle}>Funcionando en una tarde.</h2>
          </div>
          <ol className={styles.steps}>
            {STEPS.map((step, index) => (
              <li key={step.title} className={styles.step}>
                <span className={`${styles.stepNum} ${styles.mono}`}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionBorder}`}>
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <span className={`${styles.kicker} ${styles.mono}`}>Clientes</span>
            <h2 className={styles.sectionTitle}>
              Lo que dicen quienes ya trabajan con veklo.
            </h2>
          </div>
          <div className={styles.quotes}>
            {TESTIMONIALS.map((item) => (
              <figure key={item.name} className={styles.quote}>
                <blockquote>“{item.quote}”</blockquote>
                <figcaption>
                  <span className={styles.avatar} aria-hidden="true">
                    {item.name.charAt(0)}
                  </span>
                  <div>
                    {item.name}
                    <span className={styles.quoteRole}>{item.role}</span>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section id="precios" className={`${styles.section} ${styles.sectionBorder}`}>
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <span className={`${styles.kicker} ${styles.mono}`}>Precios</span>
            <h2 className={styles.sectionTitle}>Dos planes, en pesos, sin letra chica.</h2>
            <p className={styles.sectionSub}>
              Los dos incluyen {TRIAL_DAYS} días de prueba gratis sin tarjeta.
            </p>
          </div>

          <div className={styles.pricingGrid}>
            {PLANS.map((plan) => (
              <article
                key={plan.key}
                className={`${styles.plan} ${plan.featured ? styles.planFeatured : ""}`}
              >
                <div className={styles.planTop}>
                  <h3 className={styles.planName}>{plan.name}</h3>
                  {plan.featured && <span className={styles.planTag}>Recomendado</span>}
                </div>
                <p className={styles.planDesc}>{plan.description}</p>
                <p className={styles.planPrice}>
                  <strong>{plan.price}</strong>
                  <span>ARS / mes</span>
                </p>
                <Link
                  href={plan.href}
                  className={plan.featured ? styles.btn : styles.btnSecondary}
                >
                  Empezar prueba gratis
                </Link>
                <ul className={styles.planList}>
                  <li className={styles.planListTitle}>{plan.listTitle}</li>
                  {plan.items.map((item) => (
                    <li key={item}>
                      <Icon name="check" size={16} strokeWidth={2} />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <p className={styles.pricingNote}>
            Precios en pesos argentinos, IVA no incluido. Cobro mensual con
            Mercado Pago; cancelás desde tu perfil cuando quieras.
          </p>
        </div>
      </section>

      <section id="preguntas" className={`${styles.section} ${styles.sectionBorder}`}>
        <div className={`${styles.container} ${styles.faqLayout}`}>
          <div className={styles.sectionHead}>
            <span className={`${styles.kicker} ${styles.mono}`}>Preguntas frecuentes</span>
            <h2 className={styles.sectionTitle}>Lo que nos suelen preguntar.</h2>
            <p className={styles.sectionSub}>
              ¿Te queda alguna duda? Escribinos a{" "}
              <a className={styles.inlineLink} href="mailto:hola@veklo.app">
                hola@veklo.app
              </a>
              .
            </p>
          </div>
          <div className={styles.faqList}>
            {FAQ.map((item) => (
              <details key={item.q} className={styles.faqItem}>
                <summary>
                  {item.q}
                  <Icon name="plus" size={18} />
                </summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.cta}>
        <div className={styles.container}>
          <div className={styles.ctaBox}>
            <div>
              <h2>Probá veklo gratis durante {TRIAL_DAYS} días.</h2>
              <p>Sin tarjeta y sin compromiso. Si no te sirve, no pagás nada.</p>
            </div>
            <div className={styles.ctaActions}>
              <Link href="/auth/register" className={styles.btn}>
                Crear cuenta gratis
                <Icon name="arrowRight" size={16} />
              </Link>
              <a href="mailto:hola@veklo.app" className={styles.btnSecondary}>
                Hablar con nosotros
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerTop}>
            <div className={styles.footerBrand}>
              <BrandLogo size="sm" />
              <p className={styles.footerTagline}>
                Sistema de reservas para cabañas, hosterías y alquileres
                temporarios en Argentina.
              </p>
            </div>
            <div className={styles.footerCol}>
              <h4>Producto</h4>
              <ul>
                <li><a href="#producto">Funciones</a></li>
                <li><a href="#precios">Precios</a></li>
                <li><a href="#preguntas">Preguntas frecuentes</a></li>
              </ul>
            </div>
            <div className={styles.footerCol}>
              <h4>Cuenta</h4>
              <ul>
                <li><Link href="/auth/register">Crear cuenta</Link></li>
                <li><Link href="/auth/login">Iniciar sesión</Link></li>
                <li><a href="mailto:hola@veklo.app">Contacto</a></li>
              </ul>
            </div>
            <div className={styles.footerCol}>
              <h4>Legal</h4>
              <ul>
                <li><Link href="/terminos">Términos y condiciones</Link></li>
                <li><Link href="/privacidad">Privacidad</Link></li>
                <li><Link href="/arrepentimiento">Botón de arrepentimiento</Link></li>
              </ul>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <span>© {new Date().getFullYear()} veklo · Hecho en Argentina</span>
            <span>Precios en pesos argentinos</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
