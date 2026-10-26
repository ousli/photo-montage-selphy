#!/bin/sh
# Prépare un dossier prêt à copier sur le NAS : deploy/qnap/dist/
# Usage : sh deploy/qnap/build.sh
set -e
cd "$(dirname "$0")"
rm -rf dist
mkdir -p dist/app
cp ../../index.html ../../script.js ../../styles.css ../../sw.js ../../manifest.webmanifest dist/app/
cp -R ../../icons ../../vendor dist/app/
cp docker-compose.yml nginx.conf .env.example dist/
cp .env.example dist/.env
echo "Build prêt : $(pwd)/dist"
echo "Copie le contenu de dist/ sur le NAS (voir INSTALL.md)."
