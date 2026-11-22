# SQUAD — De Klunzenstad

Een coöperatieve 3D-klunzengame voor groep 8, in ontwikkeling, met een mobiele **offline oefenstand** en een voorbereide Firebase-multiplayermodus (zes teams van vijf).

## Actuele status

- **Firebase-webconfiguratie gekoppeld** aan project `squad-a63fa` via `web/.env.production` (openbare clientconfiguratie, geen geheimen).
- Firebase-projectverwijzing staat in `.firebaserc`.
- De gebruiker heeft in de Firebase Console anonieme aanmelding en Realtime Database ingeschakeld; de repository kan niet bevestigen of alle instellingen en beveiligingsregels daadwerkelijk juist actief zijn.
- **Cloud Functions, databasespelregels en Firebase Hosting zijn nog niet gepubliceerd. Multiplayer is dus nog niet live.**
- GitHub Pages-workflow is toegevoegd om de **offline 3D-oefenversie** online te kunnen testen. Dat is nog geen bewijs dat GitHub Pages actief is.

## Gratis eerste oefenversie publiceren via GitHub Pages

1. Open de [GitHub Pages-instellingen](https://github.com/SandroMeertens/SQUAD/settings/pages).
2. Kies bij **Build and deployment → Source**: **GitHub Actions**.
3. Bekijk de [Actions](https://github.com/SandroMeertens/SQUAD/actions) en wacht tot de workflow **SQUAD 3D oefenstand publiceren** groen is.
4. Controleer de gepubliceerde URL. Normaal gesproken is dat `https://sandromeertens.github.io/SQUAD/`, maar deze link werkt pas als GitHub Pages is geactiveerd én de workflow geslaagd is.
5. Tik op **EERST ZELF OEFENEN · ZONDER ACCOUNT**. De klasmodus werkt pas als de Firebase-server is gepubliceerd.

## Firebase-multiplayer later publiceren

De server moet de drie callable functies `createClassroom`, `joinClassroom` en `submitAction` in `europe-west1` uitvoeren. De client gebruikt anonieme Firebase Authentication en luistert naar de Realtime Database.

- Controleer vóór publicatie of het Firebase-project voor Cloud Functions de **Blaze-billinginstelling** nodig heeft; je kunt daarbij kosten maken.
- Publiceer `database.rules.json`, `functions/` en de gebouwde `web/dist/` op Firebase Hosting, bijvoorbeeld met de officiële Firebase CLI na authenticatie als projecteigenaar.
- Gebruik voor GitHub Actions bij eventuele latere Firebase-deployments uitsluitend GitHub Secrets of een veilige Workload Identity-koppeling, nooit privéserviceaccountsleutels in Git.
- Als GitHub Pages als webhost voor multiplayer gebruikt wordt, voeg dan `sandromeertens.github.io` toe onder **Firebase Authentication → Settings → Authorized domains** en test anoniem aanmelden.
- Test met verschillende browsers en uiteindelijk 30 iPads. De backend doet momenteel database-transacties per actie en is nog niet op 30 gelijktijdige spelers of kosten getest.
- Controleer leerlingprivacy, klasbeveiliging, ouderlijk/schooltoestemming en databeheer voordat je dit in een echte klas gebruikt.

## Lokaal ontwikkelen en testen

```sh
cd web
npm install
npm run dev
npm run build

cd ../
node --test tests/portable-logic.test.mjs
```

De oefenstand werkt zonder Firebase met lokaal opgeslagen voortgang. Firebase-webconfiguratie wordt voor productie automatisch geladen via Vite.

## Architectuur

- `web/`: echte WebGL2 3D-wereld, knoppen voor mobiel, offline oefenstand en Firebase-client
- `functions/`: server-gecontroleerde klaslokalen en spelacties
- `database.rules.json`: op klassenlidmaatschap gebaseerde alleen-lezen regels voor de spelstatus
- `firebase.json`: Firebase Hosting, Functions en Database instellingen
- `tests/`: spelregellogica en samenwerkingstests

De karakters zijn voorlopig eenvoudige procedurele 3D-vormen, nog geen professioneel geanimeerde ragdolls. Er is nog geen leerkrachtdashboard of compleet privacy- en lifecyclebeheer.
