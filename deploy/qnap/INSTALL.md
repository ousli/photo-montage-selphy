# Installer Montage photo sur un QNAP TS-251D

Le TS-251D (Intel Celeron, x86-64) supporte **Container Station**. L'app est un site statique servi par un petit conteneur nginx. Aucune base de données, rien n'est envoyé sur Internet.

## Prérequis

- QTS 5.x avec **Container Station** installé (App Center → Container Station).
- Un accès SSH ou File Station pour copier des fichiers.

## 1. Préparer le build (sur ton Mac)

```bash
sh deploy/qnap/build.sh
```

Cela crée `deploy/qnap/dist/` :

```
dist/
├── app/                 index.html, script.js, extras.js, styles.css, sw.js, manifest.webmanifest, icons/, vendor/
├── docker-compose.yml
├── nginx.conf
└── .env                 réglages (port, fuseau…)
```

## 2. Copier sur le NAS

Avec **File Station**, crée un dossier, par exemple `/Container/montage-photo`, et copie-y tout le contenu de `dist/` (n'oublie pas le fichier caché `.env` ; sinon recrée-le à partir de `.env.example`).

## 3. Configurer (optionnel)

Édite `.env` :

| Variable | Rôle | Défaut |
|---|---|---|
| `PORT` | Port d'accès | `8080` |
| `CONTAINER_NAME` | Nom du conteneur | `montage-photo` |
| `TZ` | Fuseau horaire | `Europe/Paris` |
| `APP_DIR` | Dossier du site | `./app` |

Choisis un port libre (évite 8080 s'il est déjà pris par QTS ou une autre app).

## 4. Lancer avec Container Station

**Option A — interface :**
1. Container Station → **Applications** → **Créer**.
2. Nom : `montage-photo`. Colle le contenu de `docker-compose.yml`, ou choisis le fichier.
3. Si les chemins relatifs posent problème, remplace `./app` et `./nginx.conf` par les chemins complets, par ex. `/share/Container/montage-photo/app`.
4. Remplace les variables `${PORT:-8080}` etc. par des valeurs fixes si `.env` n'est pas pris en compte.
5. **Créer**.

**Option B — SSH :**
```bash
ssh admin@IP-DU-NAS
cd /share/Container/montage-photo
docker compose up -d      # ou: docker-compose up -d
```

## 5. Utiliser

Ouvre `http://IP-DU-NAS:8080` (ou ton port) depuis un ordinateur ou un téléphone du même réseau. Tu peux ajouter un favori sur l'écran d'accueil du téléphone.

## Mise à jour

Remplace les fichiers de `app/` par les nouveaux (relance `build.sh`, recopie `dist/app/`). Rafraîchis la page : pas besoin de redémarrer le conteneur.

Pour arrêter ou supprimer : `docker compose down`.

## Dépannage

- **Page inaccessible :** vérifie que le port n'est pas utilisé, et le pare-feu QTS (Panneau de configuration → Sécurité).
- **Erreur de volume :** utilise des chemins absolus (`/share/Container/...`).
- **Partage sur téléphone :** le menu Partager du navigateur exige souvent **https**. En http local, utilise « Télécharger » puis imprime l'image. Pour avoir https, place le conteneur derrière le reverse proxy de QTS.
- **Préréglages différents entre appareils :** ils sont stockés dans chaque navigateur, pas sur le NAS.
- **Sécurité :** n'expose pas le port sur Internet sans protection ; l'accès réseau local suffit.

## Alternative sans Docker

Copie le contenu de `dist/app/` (index.html, script.js, extras.js, styles.css, sw.js, manifest.webmanifest, icons/, vendor/) dans le dossier `Web` du NAS (`/share/Web`) et active le **Serveur Web** QTS (Panneau de configuration → Applications → Serveur Web). L'app sera sur `http://IP-DU-NAS/`.
