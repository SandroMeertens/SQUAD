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

## Wat werkt al?

- De 3D-oefenstand is gepubliceerd via GitHub Pages en op een telefoon geopend.
- De multiplayercode gebruikt **Firebase Anonymous Authentication en Realtime Database rechtstreeks**, zonder betaalde Cloud Functions.
- Elke leerling heeft een eigen spelersrecord, teams delen een eigen missie en de klas deelt een ronde/week (tot 40 weken). 30 plaatsen worden verdeeld over 6 teams.
- Tests voor de spelregels draaien automatisch bij elke publicatie.

## Nog één verplichte handeling: Firebase-databaseregels publiceren

**De multiplayer is nog NIET live getest of geactiveerd.** De nieuwe broncode is gepubliceerd, maar beveiligingsregels worden niet automatisch in jouw Firebase-project aangepast. Doe het volgende als projecteigenaar:

1. Open [SQUAD Realtime Database](https://console.firebase.google.com/project/squad-a63fa/database) en kies **Rules** (Regels).
2. Open de [nieuwe beveiligingsregels](https://raw.githubusercontent.com/SandroMeertens/SQUAD/main/database.rules.json) in een tweede tabblad.
3. Kopieer de volledige JSON-inhoud en vervang de bestaande regels in de Firebase Console.
4. Tik op **Publish** (Publiceren). De regels mogen NIET in testmodus blijven staan.
5. Open de [game](https://sandromeertens.github.io/SQUAD/) in twee verschillende browsers of apparaten. Tik op **NIEUWE CODE** en **SPEEL MET JE KLAS** op apparaat 1, vul dezelfde klascode in op apparaat 2. Test of beide poppetjes bewegen en samen de bank kunnen slepen.

Op een telefoon kun je via Chrome **⋮ → Desktopsite** de regels beter bewerken.

## Belangrijke beperkingen

- **Nog niet getest met echte Firebase-regels, twee apparaten of 30 gelijktijdige iPads.**
- Een anonieme browseridentiteit blijft aan een gereserveerde plek verbonden; bij verwijderen van browsergegevens kan een nieuwe plek nodig zijn. Er is nog geen docentdashboard, reset- of opschoonfunctie.
- Er worden geen namen of e-mailadressen gevraagd. Er worden wel technische Firebase-gebruikers-ID's, spelersposities, aanwezigheid, team- en rondegegevens bewaard. Voor gebruik met kinderen zijn schoolprivacy/AVG-controle en bewaarbeleid nodig.
- De klascode bepaalt wie kan toetreden. Beveiligingsregels beperken de toegang en beschermen de eigen spelersgegevens. Teamacties worden nog **op de iPads berekend**; dit is geen volledig server-gecontroleerd anti-cheatsysteem.
- Spark heeft een beperkt aantal gelijktijdige verbindingen en maandelijkse database-downloads. Houd [Firebase Usage](https://console.firebase.google.com/project/squad-a63fa/usage) in de gaten; boven de gratis quota kan de dienst tijdelijk stoppen zonder extra factuur.
- Het 3D-beeld is een functioneel WebGL2-prototype met eenvoudige modellen, nog geen afgeronde premium 3D-animatie.

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
