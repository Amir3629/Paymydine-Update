#!/usr/bin/env bash
set -Eeuo pipefail

echo "== Harrington portfolio fit tall cards v72 =="

TS="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="./storage/backups/portfolio-fit-tall-v72-$TS"
mkdir -p "$BACKUP_DIR"

cp -a app/globals.css "$BACKUP_DIR/globals.css" 2>/dev/null || true

python3 - <<'PY'
from pathlib import Path
import re

p = Path("app/globals.css")
s = p.read_text()

s = re.sub(
    r'\n?/\* PORTFOLIO_FIT_TALL_CARDS_V72_START \*/[\s\S]*?/\* PORTFOLIO_FIT_TALL_CARDS_V72_END \*/\n?',
    '\n',
    s
)

p.write_text(s)
print("Cleaned old v72 if existed")
PY

cat >> app/globals.css <<'CSS'

/* PORTFOLIO_FIT_TALL_CARDS_V72_START */

/* remove white gap / force dark slide start */
.hh68-portfolio {
  margin-top: 0 !important;
  height: 100svh !important;
  min-height: 100svh !important;
  overflow: hidden !important;
  padding-top: 92px !important;
  padding-bottom: 26px !important;
  background:
    radial-gradient(circle at 50% 10%, rgba(209,184,147,.13), transparent 34%),
    linear-gradient(180deg, #34332f 0%, #262622 44%, #1c1c19 100%) !important;
}

/* compact full-screen layout */
.hh68-portfolio-inner {
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: flex-start !important;
  padding-top: 0 !important;
}

/* title higher + smaller so cards can breathe */
.hh68-portfolio-heading {
  margin: 0 auto 22px auto !important;
  max-width: 900px !important;
}

.hh68-eyebrow {
  margin-bottom: 8px !important;
  font-size: 11px !important;
}

.hh68-portfolio-heading h2 {
  font-size: clamp(38px, 4.1vw, 60px) !important;
  line-height: .88 !important;
}

.hh68-portfolio-heading > p:not(.hh68-eyebrow) {
  margin-top: 14px !important;
  font-size: 14px !important;
}

/* cards move higher and become vertical */
.hh68-card-grid {
  margin-top: 0 !important;
  align-items: stretch !important;
}

/* viewport-safe tall cards */
.hh68-card {
  height: calc(100svh - 360px) !important;
  min-height: 430px !important;
  max-height: 540px !important;
  border-radius: 24px !important;
}

/* make image area clearly visible */
.hh68-image {
  flex: 0 0 54% !important;
  height: 54% !important;
  min-height: 220px !important;
}

/* make content fit, no bottom clipping */
.hh68-card-body {
  padding: 18px 20px 20px !important;
}

.hh68-category {
  font-size: 9px !important;
  letter-spacing: .19em !important;
  margin-bottom: 8px !important;
}

.hh68-card h3 {
  font-size: clamp(22px, 1.55vw, 28px) !important;
  margin-bottom: 9px !important;
}

.hh68-text {
  font-size: 12px !important;
  line-height: 1.38 !important;
}

.hh68-card-bottom {
  padding-top: 12px !important;
}

/* if browser height is smaller, keep everything visible */
@media (max-height: 850px) and (min-width: 900px) {
  .hh68-portfolio {
    padding-top: 84px !important;
    padding-bottom: 18px !important;
  }

  .hh68-portfolio-heading {
    margin-bottom: 16px !important;
  }

  .hh68-portfolio-heading h2 {
    font-size: clamp(34px, 3.6vw, 52px) !important;
  }

  .hh68-portfolio-heading > p:not(.hh68-eyebrow) {
    margin-top: 10px !important;
  }

  .hh68-card {
    height: calc(100svh - 300px) !important;
    min-height: 390px !important;
    max-height: 500px !important;
  }

  .hh68-image {
    flex-basis: 52% !important;
    height: 52% !important;
    min-height: 190px !important;
  }
}

/* mobile */
@media (max-width: 760px) {
  .hh68-portfolio {
    height: auto !important;
    min-height: 100svh !important;
    overflow: visible !important;
    padding-top: 92px !important;
  }

  .hh68-portfolio-heading h2 {
    font-size: 40px !important;
  }

  .hh68-card {
    flex: 0 0 292px !important;
    height: 520px !important;
    min-height: 520px !important;
    max-height: none !important;
  }

  .hh68-image {
    min-height: 260px !important;
  }
}

/* PORTFOLIO_FIT_TALL_CARDS_V72_END */

CSS

echo "== Build check =="
rm -rf .next
npm run build

echo ""
echo "DONE v72."
echo "Restart dev:"
echo "npm run dev"
echo ""
echo "Open:"
echo "http://localhost:3000?v=portfolio-fit-tall-v72"
echo "or:"
echo "http://localhost:3001?v=portfolio-fit-tall-v72"
