# Montage photo

Outil web pour composer un montage de 2, 4 ou 6 photos et l'imprimer (préréglage pour une Canon Selphy CP1300). Tout se passe dans le navigateur : aucune photo n'est envoyée sur Internet.

## Lancer

Ouvre `index.html` dans ton navigateur.

## Utilisation

- **Format :** ratio (3:2, 4:3, 16:9), orientation, nombre de photos (2/4/6) et marge entre les photos.
- **Photos :** clique une case pour choisir, remplacer ou supprimer sa photo (ou dépose un fichier dessus).
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
