# SQUAD — De Klunzenstad

Een coöperatieve 3D-klunzengame voor groep 8, in ontwikkeling. De game bevat een **offline oefenstand** met een 3D-wereld en komische samenwerkingsmissies. De Firebase-versie is voorbereid maar **nog niet aan een Firebase-project gekoppeld of gepubliceerd**.

## Lokaal proberen

```sh
cd web
npm install
npm run dev
```

Open de getoonde lokale URL en kies **EERST ZELF OEFENEN · ZONDER ACCOUNT**. Dit werkt zonder Firebase, samen spelen nog niet. De offline oefenstand bewaart je voortgang lokaal in de browser.

## Firebase later activeren

1. Maak een Firebase-project aan en voeg een web-app toe.
2. Schakel **Anonymous Authentication** en **Realtime Database** in.
3. Vul de openbare web-configuratie in onder `web/.env.local` (voorbeeld: `web/.env.example`). Commit **geen** dienstaccountsleutels.
4. Installeer de afhankelijkheden in `functions` en `web`, voer de tests uit en bouw de web-app.
5. Controleer de databasebeveiliging en de kosten van Cloud Functions (kan Blaze vereisen) voordat je publiceert.
6. Test met meerdere browsers en uiteindelijk 30 iPads; de code ondersteunt 30 spelers, maar die belasting is nog **niet** getest.

## Architectuur

- `web/`: mobiele 3D-browsergame en offline oefenstand
- `functions/`: server-gecontroleerde spelacties en klaslokalen
- `database.rules.json`: leerlingen mogen enkel gamegegevens van een eigen klasruimte lezen; niet wijzigen
- `firebase.json`: Firebase Hosting/Functions/Database configuratie
- `tests/`: tests voor groepsindeling, validatie en voortgang

## Belangrijke beperkingen

De huidige figuren zijn technisch werkende 3D-modellen van eenvoudige vormen, nog geen professioneel geanimeerde ragdolls. De Firebase-multiplayer is nog niet tegen een echt Firebase-project getest. Er is nog geen leerkracht-dashboard, klasbeveiliging of privacybeheer geschikt voor gebruik met echte leerlinggegevens.
