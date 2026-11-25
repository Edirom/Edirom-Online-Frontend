# 📦 Publishing Guide

Diese Anleitung beschreibt, wie man eine neue Version von `@edirom/keycloak-handler` veröffentlicht.

## Vorbereitung (einmalig)

### 1. npm Account
- Registriere dich auf [npmjs.com](https://www.npmjs.com) (falls noch nicht geschehen)
- Verifiziere deine E-Mail-Adresse

### 2. GitHub Secrets hinzufügen
- Gehe zu: **Repository Settings** → **Secrets and variables** → **Actions**
- Füge ein neues Secret hinzu:
  - **Name:** `NPM_TOKEN`
  - **Value:** Dein npm-Auth-Token
    - Generiere den Token auf npmjs.com: **Account** → **Auth Tokens** → **Create New Token**
    - Wähle: **Granular Access Token** oder **Classic Token** mit Publish-Rechten

### 3. npm-Namensraum validieren
Stelle sicher, dass du Zugriff auf den Namensraum `@edirom` hast:

```bash
npm org members @edirom
```

## Neue Version veröffentlichen

### Schritt 1: Version aktualisieren
```bash
# Checkout main branch
git checkout main
git pull origin main

# Version in package.json erhöhen (z.B. 0.1.0 → 0.2.0)
# Folge Semantic Versioning: MAJOR.MINOR.PATCH
```

### Schritt 2: CHANGELOG.md aktualisieren
```markdown
## [0.2.0] - 2026-04-29

### Added
- Neue Features beschreiben

### Fixed
- Bugs die behoben wurden

### Changed
- Breaking Changes dokumentieren
```

### Schritt 3: Git Tag erstellen
```bash
# Commit vorbereiten
git add package.json CHANGELOG.md
git commit -m "chore: bump version to 0.2.0"

# Tag erstellen und pushen
git tag -a v0.2.0 -m "Release version 0.2.0"
git push origin main
git push origin v0.2.0
```

**Das war's!** Der GitHub Actions Workflow übernimmt automatisch:
- ✅ npm-Veröffentlichung
- ✅ GitHub Release mit automatisierten Release Notes
- ✅ jsDelivr CDN Update (dauert ca. 24h)

## Verifikation

Nach Veröffentlichung prüfen:

```bash
# npm Registry prüfen
npm view @edirom/keycloak-handler

# Installation testen
npm install @edirom/keycloak-handler

# GitHub Release überprüfen
# https://github.com/Edirom/edirom-keycloak-handler/releases
```

## Troubleshooting

### "401 Unauthorized"
- NPM_TOKEN ist ungültig oder abgelaufen
- GitHub Secret prüfen in Repository Settings

### "You do not have permission to publish to this package"
- Namespace-Zugriff: `npm org members @edirom` prüfen
- Kontaktiere einen Admin des `@edirom` Namensraums

### Package nicht in npm Registry sichtbar
- Prüfe die GitHub Actions Logs
- Warte 5 Minuten und refreshe npmjs.com

## Weitere Ressourcen

- [npm Publishing Guide](https://docs.npmjs.com/cli/publish)
- [GitHub Actions Dokumentation](https://docs.github.com/en/actions)
- [Semantic Versioning](https://semver.org/)
