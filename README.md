# Montage photo

Outil web pour composer un montage de 1 à 6 ou 8 photos et l'imprimer (préréglage pour une Canon Selphy CP1300). Tout se passe dans le navigateur : aucune photo n'est envoyée sur Internet.

## Lancer

Ouvre `index.html` dans ton navigateur.

## Utilisation

- **Format :** ratio (3:2, 4:3, 16:9), orientation, nombre de photos (1 à 6, ou 8) et mise en page (grille, une grande photo ou mosaïque ; selon le nombre de photos), marges (raccourcis Aucune à Larges, curseur « entre les photos » et, en option, « autour du montage »), et apparence (fond, coins arrondis, cadre).
- **Photos :** clique une case pour choisir, remplacer ou supprimer sa photo (ou dépose un fichier dessus).
- **Titre et légendes :** dans l'onglet « Texte », l'interrupteur « Ajouter un titre » ajoute un titre (en haut ou en bas, avec la date du jour en option), et « Légende sous cette photo » réserve une bande de légende sous la photo sélectionnée (« Activer la légende sur toutes les photos » pour toutes) ; le texte se tape pour la photo sélectionnée. Police, couleur, taille et style (gras, italique, souligné, majuscules) sont réglables séparément pour le titre et pour chaque légende (sous « Style… », avec un bouton pour appliquer à toutes) ; le texte rétrécit automatiquement s'il est trop long. Tout est inclus dans l'export et l'impression.
- **Retouche :** onglet « Photo » : noir et blanc, sépia, vif, deux émulations de pellicule (Portra : doux et chaud ; Fuji : contrasté et frais, avec un léger grain et un curseur d'intensité (0–100 %)), luminosité et contraste par photo, avec « Appliquer à toutes ».
- **Texte :** polices supplémentaires (Affiche, Élégante, Feutre), ombre, alignement du titre (gauche, centre, droite).
- **Infos EXIF :** si la photo contient des métadonnées (date, appareil, ISO/ouverture/vitesse/focale, lieu en option, par ex. « Paris, France », ou coordonnées GPS), la carte de la photo permet de les afficher en légende sous la photo ou en overlay dans un des 4 coins, avec son propre style. Lecture locale avec [exifr](https://github.com/MikeKovarik/exifr) (MIT, copié dans `vendor/`). Le nom du lieu est cherché via OpenStreetMap seulement si tu coches « Lieu » (coordonnées arrondies à ~1 km envoyées) ; les coordonnées exactes ne quittent jamais le navigateur. Les photos sans EXIF (captures, messageries) n'ont rien à afficher.
- **Échange :** appui long sur une photo, puis glisse-la sur une autre case pour permuter les deux (ou la déplacer vers une case vide).
- **Cadrage :** glisse pour déplacer, molette / curseur pour zoomer, curseur et boutons 90° pour pivoter. Sur téléphone, pince avec deux doigts : zoom, rotation et déplacement en même temps.
- **Mobile :** l'aperçu reste fixe en haut ; les réglages sont dans une feuille en bas (onglets en bas). Touche ou glisse la poignée pour l'agrandir, la réduire ou ne garder que les onglets (aperçu maximal). « Ajouter plusieurs photos » (onglet Montage) remplit les cases vides en une fois ; un seul bouton « Télécharger » ouvre la feuille de partage (Imprimer, Photos, Fichiers, app Canon…) ; « Imprimer » n'apparaît que si le partage de fichiers n'est pas disponible.
- **Imprimante :** choisis ton modèle (Canon Selphy, Kodak, HiTi, DNP, Epson, Instax, HP…), le format de papier, le ratio et la zone imprimable s'adaptent. « Imprimante personnalisée » permet de saisir largeur, hauteur et marge en mm.
- **Préréglages :** un préréglage fourni par format de l'imprimante choisie ; tu peux enregistrer les tiens avec un nom (stockés dans le navigateur).
- **Annuler / rétablir et sauvegarde automatique :** voir « Montage avancé » ci-dessous.
- **Date tampon :** dans l'onglet « Infos », le champ « Date tampon » (overlay) affiche la date de prise de vue en orange, façon appareil jetable (aussi sur les anciens projets, recalculée depuis la date).
- **Stickers :** onglet « Stickers » : emoji ou image importée (PNG/WebP), posés par-dessus tout le montage. Glisse pour déplacer, coin = taille, rond = rotation, pincement à deux doigts, molette ; Dupliquer, Devant/Derrière, Suppr. Inclus dans l'export, annulables et sauvegardés. Les images se collent (Cmd/Ctrl+V ou bouton « Coller », ex. « Copier l'image » depuis Pinterest) ou se glissent sur le montage ; « Retirer le fond » efface un fond uni, avec aperçu en direct (fond en rose) avant d'appliquer ; annulable. Chaque sticker (emoji, PNG, détouré) peut avoir un contour de couleur et d'épaisseur réglables, qui suit sa silhouette (effet sticker découpé).
- **Stickers (suite) :** contour optionnel (interrupteur, épaisseur, couleur) sur emoji et images détourées ; « Retirer le fond » pour une image à fond uni ou en damier (aperçu, option pour effacer aussi les trous, contour adouci à l'application). Catégories d'emoji : visages, fêtes, cœurs, nature, animaux, gourmand, voyage.
- **Projets :** bouton « Projets » : enregistrer plusieurs montages nommés, les rouvrir, les renommer ou les supprimer. Le projet ouvert est retrouvé après un rechargement et un avertissement évite de perdre des modifications non enregistrées.
- **Thème :** clair ou sombre, qui suit le réglage de l'appareil ; le bouton soleil/lune de l'en-tête force l'un ou l'autre (choix mémorisé dans le navigateur). Le bouton palette de l'en-tête permet de choisir la couleur d'accent (8 teintes, palettes officielles Material 3 calculées avec [material-color-utilities](https://github.com/material-foundation/material-color-utilities), Apache-2.0, copié dans `vendor/`).
- **Design :** Material Design 3 (tokens `--md-*`, formes, états, ressorts et transitions M3, snackbar, ripple). Les animations sont désactivées avec « réduire les animations ».
- **Sortie :** Télécharger (JPG), à imprimer ensuite depuis Aperçu ou l'app de l'imprimante (taille réelle, sans mise à l'échelle). Sur mobile, « Télécharger » ouvre la feuille de partage (Photos, Fichiers, Imprimer, app Canon…) ; sur ordinateur, il télécharge le fichier et « Imprimer » ouvre la boîte d'impression.

## Hors ligne

En https (GitHub Pages, NAS), après une première visite, l'outil fonctionne sans connexion sur ordinateur comme sur téléphone, y compris installé sur l'écran d'accueil : montage, import, export, impression, sauvegarde automatique. Seule la recherche du nom de lieu (EXIF) a besoin du réseau. Une pastille « Hors ligne » s'affiche en haut quand la connexion est coupée.

## Installation (PWA)

En https (par exemple GitHub Pages), l'app est installable : « Ajouter à l'écran d'accueil » sur téléphone, ou l'icône d'installation dans la barre d'adresse sur ordinateur. Une fois installée, elle s'ouvre en plein écran et fonctionne hors ligne. Incrémente `CACHE` dans `sw.js` quand tu publies une nouvelle version.

## Impression

Le navigateur ne peut pas imposer les réglages de l'imprimante. Dans la boîte de dialogue, vérifie :

- imprimante Canon SELPHY CP1300 ;
- format de papier correspondant au ratio (carte postale 100×148 mm pour du 3:2) ;
- marges à zéro, échelle à 100 %, bonne orientation.

Sur mobile, le bouton « Télécharger » ouvre la feuille de partage : choisis « Imprimer » (AirPrint) ou l'app Canon (SELPHY Print).

## Fichiers

- `index.html` : structure de la page
- `styles.css` : styles et animations
- `manifest.webmanifest`, `sw.js`, `icons/` : installation et mode hors ligne (PWA)
- `js/` : scripts classiques chargés dans l'ordre de `index.html` (état global partagé, l'ordre compte) :
  - `core`, `exif`, `layout`, `render` : constantes, lecture EXIF/légendes, mises en page, dessin du canvas
  - `printers-data`, `printers` : catalogue d'imprimantes, sélecteur, papier et zone imprimable
  - `selection`, `import`, `cell-menu`, `interactions` : sélection des cases, import des photos, menu, gestes canvas
  - `editors`, `pickers`, `montage-ui`, `settings`, `controls`, `segmented` : réglages et interface
  - `stickers` / `stickers-ui` : stickers (modèle, rendu, contour, retrait du fond, hit-test) et leur onglet
  - `projects` : projets nommés (IndexedDB), panneau Projets
  - `theme` : thème clair/sombre et couleur d'accent (variables CSS dans `styles.css`, chargé dans `<head>` après `vendor/m3-palette.js`)
  - `ripple` : onde de l'état pressé M3
  - (rendu regroupé par image : `render()` planifie, `renderNow()` dessine tout de suite ; `exifr` et la palette d'accent se chargent à la demande)
  - `safe-margin` : curseur de marge de sécurité (0 à 5 mm, mémorisé par imprimante + papier, stockage dans `printers.js`)
  - `export`, `presets`, `pwa`, `tabs`, `main` : impression/export, préréglages, hors ligne, onglets, premier rendu
  - `history` : historique annuler/rétablir et sauvegarde automatique (IndexedDB)

## Montage avancé

- **Annuler / rétablir** : boutons flèches courbes en haut (ou Ctrl/Cmd+Z, Ctrl+Maj+Z).
- **Sauvegarde automatique** : le montage en cours (photos et réglages) est restauré à la réouverture.
- **Zone imprimable** : repères pointillés (≈ 3 mm, estimation) selon le papier de l'imprimante choisie. Ces valeurs sont des estimations à vérifier par un test d'impression.
- **Marge de sécurité** : dans l'onglet Montage, un curseur (0 à 5 mm) règle la zone grisée. Repères : 1 mm (minimum) et l'estimation de l'imprimante. C'est une marge approximative, à ajuster pour te repérer ; l'interrupteur « Zone imprimable » la masque
- **Mise en page** : grille, « une grande photo » ou mosaïque (3 à 6 photos) ; marge extérieure séparée (optionnelle) ; fond, coins arrondis et cadre dans « Apparence ».
- **Texte** : légende par photo, titre en haut ou en bas, date du jour automatique.
- **Photos** : JPEG, PNG, WebP, HEIC/HEIF, AVIF, GIF (60 Mo max) ; les grandes photos sont réduites à 3600 px.

## Tests de non-régression

`tests/run.js` (Playwright, Chromium + WebKit) génère des photos de test, fait varier ratio, orientation, nombre de photos, imprimante, mise en page, marges, titre, légendes, retouches, cadrage et stickers, puis compare l'empreinte (SHA-256) des pixels du canvas d'export à `tests/baseline.json` et signale toute erreur console.

```
cd tests && npm install
node run.js                      # compare aux références
node run.js --update             # change volontaire du rendu : réécrit les références
node run.js --browser=chromium   # un seul navigateur
```

Les références sont par navigateur et par système (polices, emoji) : sur une autre machine, lance d'abord `--update` sur la version de départ.
