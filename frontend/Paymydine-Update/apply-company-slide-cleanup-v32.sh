#!/usr/bin/env bash
set -Eeuo pipefail

echo "== Harrington company slide cleanup v32 =="

TS="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="./storage/backups/harrington-company-slide-v32-$TS"
mkdir -p "$BACKUP_DIR"

echo "Backup: $BACKUP_DIR"
cp -a components/HarringtonExperienceV30.tsx "$BACKUP_DIR/" 2>/dev/null || true
cp -a app/globals.css "$BACKUP_DIR/" 2>/dev/null || true

python3 - <<'PY'
from pathlib import Path
import re

component = Path("components/HarringtonExperienceV30.tsx")
s = component.read_text()

# Better detail texts
replacements = {
    'Rayton represents strategic venture building inside the Harrington ecosystem: identifying opportunities, forming operating structures, and creating room for long-term growth.':
    'Rayton is the strategic venture platform inside Harrington Holdings. It focuses on identifying opportunities, building operating structures, shaping company foundations, and turning early-stage ideas into disciplined long-term businesses.',

    'Raymand supports the wider group through operational coordination, business administration, import/export activity, and execution support across the holding.':
    'Raymand supports the wider group through import and export coordination, product movement, execution support, administrative process control, and the reliable operational discipline required for real commercial delivery.',

    'PayMyDine is the hospitality technology platform in the portfolio, focused on digital ordering, restaurant workflows, smart service, and operational dashboards.':
    'PayMyDine is the hospitality technology product in the portfolio. It connects QR ordering, restaurant workflows, staff tools, payments, and service operations into one smooth digital restaurant experience.',

    'Jisoo Cosmetic gives the holding a consumer-facing beauty and cosmetics brand, built around product identity, lifestyle presentation, and modern customer experience.':
    'Jisoo Cosmetic brings a consumer-facing beauty brand into the portfolio. It focuses on product presentation, lifestyle-led branding, curated beauty identity, and a more editorial customer experience.',

    'I Cube focuses on enterprise IT infrastructure, secure system architecture, server environments, data center support, and technology services for demanding business environments.':
    'I Cube delivers enterprise IT infrastructure services with emphasis on servers, secure system environments, data-center capable architecture, and reliable technology support for demanding business and financial contexts.',

    'Sun Cluster is framed as IT and data center protection, not solar. It belongs to the secure infrastructure side of the holding: protection, resilience, continuity, and technical environments.':
    'Sun Cluster focuses on secure infrastructure environments, data-center protection, operational resilience, and continuity-minded IT layers designed to support safety, availability, and long-term stability.',
}

for old, new in replacements.items():
    s = s.replace(old, new)

new_detail_panel = '''function DetailPanel({ company }: { company: Company }) {
  return (
    <div className="hh30-detail" data-no-slide-snap>
      <div className="hh30-detail-copy">
        <span>Inside the company</span>
        <p>{company.role}</p>
      </div>

      <div className="hh30-detail-grid">
        <div>
          <small>What the company does</small>
          <p>{company.details}</p>
        </div>
        <div>
          <small>Core focus</small>
          <ul>
            {company.focus.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
'''

s = re.sub(
    r'function DetailPanel\(\{ company \}: \{ company: Company \}\) \{[\s\S]*?\nfunction CompanySlide',
    new_detail_panel + '\nfunction CompanySlide',
    s,
    count=1
)

new_company_slide = '''function CompanySlide({ company, index }: { company: Company; index: number }) {
  const [open, setOpen] = useState(false);

  const imageSideClass =
    ["paymydine", "icube"].includes(company.slug) ? "is-image-right" : "is-image-left";

  return (
    <section
      id={`company-${company.slug}`}
      className={`hh30-slide hh30-company-slide ${imageSideClass} ${open ? "is-expanded" : ""}`}
      data-mode={company.mode}
    >
      <div className="hh30-company-bg" aria-hidden="true">
        <LogoImage src={company.image} />
      </div>

      <div className="hh30-company-bg-secondary" aria-hidden="true">
        <LogoImage src={company.logo} />
      </div>

      <div className="hh30-company-shade" aria-hidden="true" />

      <div className="hh30-company-content">
        <div className="hh30-company-logo-inline">
          <LogoImage src={company.logo} alt={`${company.name} logo`} />
        </div>

        <h2>{company.name}</h2>
        <h3>{company.sector}</h3>

        <p className="hh30-company-lead">{company.summary}</p>
        <p className="hh30-company-body">{company.details}</p>

        <div className="hh30-actions">
          <button type="button" onClick={() => setOpen((value) => !value)}>
            {open ? "Close details" : "More information"}
          </button>
          {company.website ? (
            <a href={company.website} target="_blank" rel="noreferrer">
              Open website ↗
            </a>
          ) : null}
        </div>
      </div>

      {open ? <DetailPanel company={company} /> : null}
    </section>
  );
}
'''

s = re.sub(
    r'function CompanySlide\(\{ company, index \}: \{ company: Company; index: number \}\) \{[\s\S]*?\nexport default function HarringtonExperienceV30\(\) \{',
    new_company_slide + '\n\nexport default function HarringtonExperienceV30() {',
    s,
    count=1
)

component.write_text(s)
print("PATCHED:", component)
PY

python3 - <<'PY'
from pathlib import Path
css_path = Path("app/globals.css")
css = css_path.read_text()

start_marker = "/* ===== HH30 company slide cleanup v32 START ===== */"
end_marker = "/* ===== HH30 company slide cleanup v32 END ===== */"

block = r'''
/* ===== HH30 company slide cleanup v32 START ===== */

.hh30-company-slide .hh30-eyebrow,
.hh30-company-slide .hh30-tags,
.hh30-company-bg-secondary {
  display: none !important;
}

.hh30-company-slide.is-image-left {
  justify-content: flex-end;
}

.hh30-company-slide.is-image-right {
  justify-content: flex-start;
}

.hh30-company-slide.is-image-left .hh30-company-bg {
  left: 0;
  right: auto;
  width: min(58vw, 920px);
}

.hh30-company-slide.is-image-right .hh30-company-bg {
  left: auto;
  right: 0;
  width: min(58vw, 920px);
}

.hh30-company-slide.is-image-left .hh30-company-bg::after {
  background:
    linear-gradient(90deg, rgba(10,17,32,.08) 0%, rgba(10,17,32,.18) 28%, rgba(10,17,32,.68) 58%, rgba(10,17,32,.97) 100%),
    radial-gradient(circle at 24% 42%, rgba(209,184,147,.10), transparent 40%);
}

.hh30-company-slide.is-image-right .hh30-company-bg::after {
  background:
    linear-gradient(270deg, rgba(10,17,32,.08) 0%, rgba(10,17,32,.18) 28%, rgba(10,17,32,.68) 58%, rgba(10,17,32,.97) 100%),
    radial-gradient(circle at 76% 42%, rgba(209,184,147,.10), transparent 40%);
}

.hh30-company-slide.is-image-left .hh30-company-shade {
  background: linear-gradient(90deg, rgba(10,17,32,.02) 0%, rgba(10,17,32,.12) 28%, rgba(10,17,32,.78) 60%, rgba(10,17,32,1) 78%, rgba(10,17,32,1) 100%);
}

.hh30-company-slide.is-image-right .hh30-company-shade {
  background: linear-gradient(270deg, rgba(10,17,32,.02) 0%, rgba(10,17,32,.12) 28%, rgba(10,17,32,.78) 60%, rgba(10,17,32,1) 78%, rgba(10,17,32,1) 100%);
}

.hh30-company-bg img {
  opacity: .72;
  filter: saturate(.95) contrast(1) brightness(.90);
  transform: scale(1.03);
}

.hh30-company-content {
  width: min(630px, 46vw);
}

.hh30-company-content h2 {
  font-size: clamp(44px, 5vw, 78px);
}

.hh30-company-content h3 {
  margin-top: 14px;
  font-size: clamp(18px, 1.8vw, 28px);
  line-height: 1.25;
}

.hh30-company-content .hh30-company-lead {
  margin: 22px 0 0;
  max-width: 590px;
  color: #E1E7F0;
  font-size: 18px;
  line-height: 1.72;
}

.hh30-company-content .hh30-company-body {
  margin: 14px 0 0;
  max-width: 600px;
  color: #B9C3D2;
  font-size: 16px;
  line-height: 1.74;
}

.hh30-company-content .hh30-actions {
  margin-top: 30px;
}

.hh30-detail {
  width: min(630px, 46vw);
  display: grid;
  gap: 14px;
}

.hh30-company-slide.is-image-left .hh30-detail {
  right: clamp(34px, 8vw, 150px);
  left: auto;
}

.hh30-company-slide.is-image-right .hh30-detail {
  left: clamp(34px, 8vw, 150px);
  right: auto;
}

.hh30-detail-copy,
.hh30-detail-grid > div {
  border-radius: 26px;
  background: rgba(8, 14, 28, .78);
}

.hh30-detail-grid {
  grid-template-columns: 1.08fr .92fr;
}

.hh30-detail-gallery {
  display: none !important;
}

.hh30-detail-copy p,
.hh30-detail-grid p,
.hh30-detail-grid li {
  font-size: 14px;
  line-height: 1.65;
}

@media (max-width: 1100px) {
  .hh30-company-slide,
  .hh30-company-slide.is-image-left,
  .hh30-company-slide.is-image-right {
    justify-content: flex-end;
    align-items: flex-end;
    padding: 118px 24px 44px;
  }

  .hh30-company-bg,
  .hh30-company-slide.is-image-left .hh30-company-bg,
  .hh30-company-slide.is-image-right .hh30-company-bg {
    left: 0;
    right: 0;
    top: 0;
    bottom: auto;
    width: 100%;
    height: 52%;
  }

  .hh30-company-bg::after,
  .hh30-company-slide.is-image-left .hh30-company-bg::after,
  .hh30-company-slide.is-image-right .hh30-company-bg::after {
    background:
      linear-gradient(180deg, rgba(10,17,32,.02) 0%, rgba(10,17,32,.14) 18%, rgba(10,17,32,.50) 48%, rgba(10,17,32,.92) 78%, rgba(10,17,32,1) 100%),
      radial-gradient(circle at 50% 20%, rgba(209,184,147,.08), transparent 44%);
  }

  .hh30-company-shade,
  .hh30-company-slide.is-image-left .hh30-company-shade,
  .hh30-company-slide.is-image-right .hh30-company-shade {
    background: linear-gradient(180deg, rgba(10,17,32,.06) 0%, rgba(10,17,32,.20) 28%, rgba(10,17,32,.92) 68%, rgba(10,17,32,1) 100%);
  }

  .hh30-company-content,
  .hh30-detail {
    width: 100%;
    max-width: none;
  }

  .hh30-detail,
  .hh30-company-slide.is-image-left .hh30-detail,
  .hh30-company-slide.is-image-right .hh30-detail {
    position: relative;
    left: auto;
    right: auto;
    bottom: auto;
    margin-top: 22px;
  }

  .hh30-detail-grid {
    grid-template-columns: 1fr;
  }
}

/* ===== HH30 company slide cleanup v32 END ===== */
'''

if start_marker in css and end_marker in css:
    before = css.split(start_marker)[0]
    after = css.split(end_marker)[1]
    css = before + block + after
else:
    css += "\n\n" + block + "\n"

css_path.write_text(css)
print("PATCHED:", css_path)
PY

echo "== Build check =="
rm -rf .next
npm run build

echo ""
echo "DONE v32."
echo "Now run:"
echo "npm run dev"
echo ""
echo "Open:"
echo "http://localhost:3000?v=company-clean-v32"
