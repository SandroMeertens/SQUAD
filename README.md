# SQUAD — De Klunzenstad

**Speelbaar:** https://sandromeertens.github.io/SQUAD/

Een 3D-samenwerkingsgame voor groep 8 met een online oefenstand en een **nieuwe gratis Firebase Spark-multiplayermodus**, voorbereid voor zes teams van vijf.

## Nieuwe 3D-update — levende Klunzenstad

- Vijf herkenbare klunzen per team, met verschillende hoofddeksels, grote voeten, bewegende armen en benen, knipperogen en gezichtsuitdrukkingen.
- Ragdoll-**achtige** struikelbewegingen met vallen en overeind krabbelen na een botsing; dit is geen volwaardige fysica-engine.
- De gezamenlijke klasstad groeit van **stadniveau 1 tot 10**. Na voortgang verschijnen extra zwevende gebouwen en later ballonnen; iedere vijfde missie is er een feestelijk moment.
- De bovenbalk toont nu het blijvende stadniveau en het aantal afgeleverde vrachten in plaats van uitsluitend de stand van de huidige ronde.
- De nieuwe beelden zijn nog niet met meerdere iPads en alle browsers getest. Er zijn geen wijzigingen aan de Firebase-databasestructuur of -regels nodig.
- Automatische tests in `tests/cartoon-animation.test.mjs` controleren de animatieposes, het herstel en de stadsniveaus.

## Nieuwe speelbare 3D-Zweefstad (Higgsfield → SQUAD)

- De complete **3D Jutsu-partywereld** is als GLB-model ingevoerd in `web/public/models/squad-party-world.glb`. Dit is een écht 3D-bestand, geen plaatje.
- `web/party-world.js` vertaalt de glTF-geometrie en materiaalkleuren rechtstreeks naar de bestaande WebGL2-renderer. Er is geen extra JS-3D-engine of Firebase-verkeer voor nodig.
- De afgeronde brug en finish zijn uitgelijnd met het bestaande speelparcours. De nieuwe 3D-wereld is een **visuele laag**; botsingen, teams, ventilator, poort en opdrachten blijven door de bestaande spelregels bepaald.
- De statische Blender-versies van de klunzen, bank en ventilator worden uit het decor gefilterd zodat er geen dubbele poppetjes, vracht of obstakels verschijnen.
- Als het model niet laadt, blijft de klassieke 3D-wereld speelbaar. Bij aanhoudende lage framerate schakelt de game automatisch terug; via `?graphics=classic` kun je die lichte versie handmatig kiezen. Als WebGL2 faalt, is de bestaande 2D-weergave beschikbaar.
- `tests/party-world.test.mjs` controleert de **echte geïmporteerde GLB**, veiligheid, oriëntatie en geometriebudget bij elke publicatie.
- **Belangrijk:** de nieuwe 3D-weergave is nog niet op alle iPads of met 30 gelijktijdige apparaten getest. De render-import garandeert geen 30-iPad-prestatie.

## Wat werkt al?

- De 3D-oefenstand is gepubliceerd via GitHub Pages en op een telefoon geopend.
- De multiplayercode gebruikt **Firebase Anonymous Authentication en Realtime Database rechtstreeks**, zonder betaalde Cloud Functions.
- Elke leerling heeft een eigen spelersrecord, teams delen een eigen missie en de klas deelt een ronde/week (tot 40 weken). 30 plaatsen worden verdeeld over 6 teams.
- Tests voor de spelregels draaien automatisch bij elke publicatie.

## Firebase-status

- **Realtime Database-regels gepubliceerd:** door de projecteigenaar bevestigd.
- **Twee spelers:** werkende online verbinding en samenwerking op twee apparaten bevestigd.
- **30 gelijktijdige iPads:** nog niet gemeten en daarom nog geen prestatiegarantie.
- Voor later beheer: [Firebase-console](https://console.firebase.google.com/project/squad-a63fa/database).

## Belangrijke beperkingen

- **Twee spelers zijn getest, maar nog niet 30 gelijktijdige iPads met de nieuwe 3D-wereld.**
- Een anonieme browseridentiteit blijft aan een gereserveerde plek verbonden; bij verwijderen van browsergegevens kan een nieuwe plek nodig zijn. Er is nog geen docentdashboard, reset- of opschoonfunctie.
- Er worden geen namen of e-mailadressen gevraagd. Er worden wel technische Firebase-gebruikers-ID's, spelersposities, aanwezigheid, team- en rondegegevens bewaard. Voor gebruik met kinderen zijn schoolprivacy/AVG-controle en bewaarbeleid nodig.
- De klascode bepaalt wie kan toetreden. Beveiligingsregels beperken de toegang en beschermen de eigen spelersgegevens. Teamacties worden nog **op de iPads berekend**; dit is geen volledig server-gecontroleerd anti-cheatsysteem.
- Spark heeft een beperkt aantal gelijktijdige verbindingen en maandelijkse database-downloads. Houd [Firebase Usage](https://console.firebase.google.com/project/squad-a63fa/usage) in de gaten; boven de gratis quota kan de dienst tijdelijk stoppen zonder extra factuur.
- Het 3D-beeld blijft een functioneel WebGL2-prototype: de nieuwe GLB-wereld is ingeladen als decor en maakt nog geen nieuwe botsingsfysica of volledige premium 3D-animatie mogelijk.

## Techniek

- `web/firebase-client.js`: gratis Firebase Realtime Database-multiplayer
- `web/spark-logic.js`: pure spelregels voor zes samenwerkende teams
- `database.rules.json`: beveiligingsregels met kamers, teams, 30 plekken en eigen spelers
- `web/world3d.js`: mobiele 3D-wereld
- `.github/workflows/pages.yml`: automatische tests en bouw/publicatie
- `functions/`: oud, ongebruikt prototype; **wordt niet meer gedeployed**
- `firebase.json`: Firebase Hosting en Realtime Database (geen Functions)

Lokaal ontwikkelen:

```sh
cd web
npm install
npm run dev
npm run build
cd ..
node --test tests/*.test.mjs
```
