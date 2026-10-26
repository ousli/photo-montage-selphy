# Montage photo

Outil web pour composer un montage de 2, 4 ou 6 photos et l'imprimer (préréglage pour une Canon Selphy CP1300). Tout se passe dans le navigateur : aucune photo n'est envoyée sur Internet.

## Lancer

Ouvre `index.html` dans ton navigateur.

## Utilisation

- **Format :** ratio (3:2, 4:3, 16:9), orientation, nombre de photos (2/4/6) et marge entre les photos.
- **Photos :** clique une case pour choisir, remplacer ou supprimer sa photo (ou dépose un fichier dessus).
- **Titre et légendes :** dans l'onglet « Texte », l'interrupteur « Titre en haut du montage » ajoute un titre, et « Légende sous la photo » réserve une bande de légende sous les photos ; le texte de la légende se tape pour la photo sélectionnée. Police, couleur, taille et style (gras, italique, souligné, majuscules) sont réglables séparément pour le titre et pour chaque légende (sous « Style… », avec un bouton pour appliquer à toutes) ; le texte rétrécit automatiquement s'il est trop long. Tout est inclus dans l'export et l'impression.
- **Infos EXIF :** si la photo contient des métadonnées (date, appareil, ISO/ouverture/vitesse/focale, lieu en option, par ex. « Paris, France », ou coordonnées GPS), la carte de la photo permet de les afficher en légende sous la photo ou en overlay dans un des 4 coins, avec son propre style. Lecture locale avec [exifr](https://github.com/MikeKovarik/exifr) (MIT, copié dans `vendor/`). Le nom du lieu est cherché via OpenStreetMap seulement si tu coches « Lieu » (coordonnées arrondies à ~1 km envoyées) ; les coordonnées exactes ne quittent jamais le navigateur. Les photos sans EXIF (captures, messageries) n'ont rien à afficher.
- **Échange :** appui long sur une photo, puis glisse-la sur une autre case pour permuter les deux (ou la déplacer vers une case vide).
- **Cadrage :** glisse pour déplacer, molette / pincement / curseur pour zoomer, curseur et boutons 90° pour pivoter.
- **Préréglages :** trois préréglages Selphy fournis ; tu peux enregistrer les tiens avec un nom (stockés dans le navigateur).
- **Sortie :** Télécharger (JPG) ou Imprimer.

## Installation (PWA)

En https (par exemple GitHub Pages), l'app est installable : « Ajouter à l'écran d'accueil » sur téléphone, ou l'icône d'installation dans la barre d'adresse sur ordinateur. Une fois installée, elle s'ouvre en plein écran et fonctionne hors ligne. Incrémente `CACHE` dans `sw.js` quand tu publies une nouvelle version.

## Impression

Le navigateur ne peut pas imposer les réglages de l'imprimante. Dans la boîte de dialogue, vérifie :

- imprimante Canon SELPHY CP1300 ;
- format de papier correspondant au ratio (carte postale 100×148 mm pour du 3:2) ;
- marges à zéro, échelle à 100 %, bonne orientation.

Sur mobile, « Imprimer » ouvre la feuille de partage (AirPrint, app Canon).

## Fichiers

- `index.html` : structure de la page
- `styles.css` : styles et animations
- `manifest.webmanifest`, `sw.js`, `icons/` : installation et mode hors ligne (PWA)
- `script.js` : logique (rendu canvas, cadrage, préréglages, impression)
