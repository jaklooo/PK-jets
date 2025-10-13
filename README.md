# 🚀 3D Space Fighter - Otvorený svet

Pokročilá 3D lietadlová simulácia s otvoreným svetom vytvorená v **Three.js** - beží priamo v prehliadači!

## 🎮 O hre

Lietajte nad realistickou krajinou v otvorenom 3D svete! Ovládajte stíhačku s realistickou fyzikou letu, preskúmajte terén s kopcami, údoliami, stromami a budovami, a bojujte proti nepriateľským stíhačkam, ktoré vás atakujú zo všetkých strán.

## 🎯 Funkcie

- ✅ **Veľký otvorený 3D svet** - terén 1000x1000m s voľným pohybom
- ✅ **Realistický terén** - kopce, údolia, vodná plocha
- ✅ **Krajina** - stromy, budovy, mraky pohybujúce sa po oblohe
- ✅ **Realistická fyzika letu** - zrýchlenie, spomaľovanie, rotácie
- ✅ **Kamera tretej osoby** - plynulé sledovanie stíhačky
- ✅ **Pokročilé osvetlenie** - slnko, tiene, atmosféra
- ✅ **Nepriateľské stíhačky** - AI, ktoré vás prenasleduje
- ✅ **Pokročilé streľba** - projektily letia smerom kam mierite
- ✅ **Kompletné UI** - výškomer, rýchlomer, pozícia, zdravie, skóre
- ✅ **Turbo režim** - vyššia rýchlosť s SHIFT
- ✅ **Vizuálne efekty** - explózie, tiene, žiara

## 🕹️ Ovládanie

### Základný pohyb
| Klávesa | Akcia |
|---------|-------|
| **W** | Zrýchliť dopredu |
| **S** | Spomaliť / cúvať |
| **A** | Otočiť vľavo |
| **D** | Otočiť vpravo |

### Pokročilé manévre
| Klávesa | Akcia |
|---------|-------|
| **↑** | Klopenie hore (stúpanie) |
| **↓** | Klopenie dole (klesanie) |
| **Q** | Naklonenie vľavo (barrel roll) |
| **E** | Naklonenie vpravo (barrel roll) |
| **SHIFT** | Turbo režim (vyššia rýchlosť) |
| **MEDZERNÍK** | Streľba |

### Tipy na lietanie
- 💡 Držte **W** pre kontinuálne zrýchľovanie
- 💡 Použite **↑/↓** pre zmenu výšky
- 💡 **SHIFT** na rýchle únikové manévre
- 💡 Kombinujte **A/D** s **Q/E** pre ostré zatáčky
- 💡 Nepribližujte sa príliš k zemi - môžete sa zrútiť!

## 🚀 Ako spustiť hru

### Spôsob 1: Jednoduché otvorenie (odporúčané)

1. Otvorte súbor `index.html` vo vašom webovom prehliadači
   - Pravý klik na `index.html` → Otvoriť pomocou → Chrome/Firefox/Edge
   - Alebo dvojklik na súbor

2. **HOTOVO!** Hra sa okamžite spustí.

### Spôsob 2: Lokálny server (pre vývoj)

Ak chcete použiť lokálny server:

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js (ak máte nainštalovaný)
npx http-server
```

Potom otvorte `http://localhost:8000` v prehliadači.

### Spôsob 3: VS Code Live Server

Ak používate VS Code:
1. Nainštalujte rozšírenie "Live Server"
2. Pravý klik na `index.html` → "Open with Live Server"

## 📋 Požiadavky

- **Moderný webový prehliadač** (Chrome, Firefox, Edge, Safari)
- **Internetové pripojenie** (pre načítanie Three.js knižnice z CDN)
- **Žiadna inštalácia nie je potrebná!**

## 🎨 Herné mechaniky

### Otvorený svet
- **Terén**: 1000x1000 metrov terénu s kopcami a údoliami
- **Krajina**: 100 stromov, 20 budov, 50 oblakov
- **Výška**: Môžete lietať až do výšky 200m
- **Hranice**: Mäkké hranice svetа (500m od centra)

### Fyzika lietania
- Realistické zrýchľovanie a spomaľovanie
- Zotrvačnosť pri otáčaní
- Minimálna výška nad terénom (5m)
- Turbo režim zvyšuje maximálnu rýchlosť

### Nepriateľské stíhačky
- Spawn-ujú sa v okruhu okolo hráča (150-250m)
- Inteligentné sledovanie - letia smerom k vám
- Pri kolízii s hráčom: -15 HP + explózia
- Automaticky sa odstraňujú ak sú príliš ďaleko (400m+)

### Streľba a boj
- Dvojité projektily zo strieľajú z krídel
- Projektily letia smerom kam ukazuje stíhačka
- Vzduchový zápas na dlhšie vzdialenosti
- +10 bodov za každý zásah

### UI Dashboard
- **Skóre**: Aktuálne body
- **Zdravie**: Vizuálny ukazovateľ HP (0-100)
- **Výška**: Aktuálna nadmorská výška v metroch
- **Rýchlosť**: Aktuálna rýchlosť v km/h
- **Pozícia**: X a Z súradnice na mape

## 🛠️ Technické detaily

### Použité technológie
- **Three.js** (r128) - 3D renderovanie
- **Vanilla JavaScript** - herná logika
- **HTML5 & CSS3** - UI a štruktúra

### Štruktúra projektu
```
zenskepk/
├── index.html       # HTML štruktúra a UI
├── game.js          # Hlavná herná logika
└── README.md        # Tento súbor
```

### Hlavné komponenty kódu

- **Scene Setup** - 3D scéna, kamera, pokročilé osvetlenie s tieňmi
- **Terrain System** - procedurálne generovaný terén s kopcami
- **World Building** - stromy, budovy, mraky, voda
- **Player System** - vytvorenie stíhačky s realistickými rotáciami
- **Flight Physics** - zrýchľovanie, spomaľovanie, zotrvačnosť
- **Camera System** - plynulá kamera tretej osoby (smooth follow)
- **Enemy AI** - spawn systém, sledovanie hráča, kolízne detekcie
- **Weapons System** - streľba s 3D projektilmi
- **Collision Detection** - detekcia zásahov v 3D priestore
- **UI System** - výškomer, rýchlomer, pozícia, skóre, zdravie
- **Particle Effects** - explózie s 3D časticami

## 🎓 Ako hra funguje

1. **Inicializácia** - vytvorí sa veľký 3D svet s terénom, stromami, budovami
2. **Procedurálny terén** - kopce a údolia generované matematickými funkciami
3. **Realistická obloha** - mraky sa pohybujú, hviezdy na oblohe
4. **Flight Physics** - rýchlosť, zrýchlenie, rotácie podľa vstupov hráča
5. **Game Loop** - 60 FPS slučka aktualizuje pozície, fyziku, AI
6. **Enemy AI** - spawn v okruhu, sledovanie hráča, adaptívne správanie
7. **Camera Follow** - kamera plynulo sleduje stíhačku (lerp smoothing)
8. **Collision System** - 3D distance-based detekcia zásahov
9. **Dynamic Lighting** - tiene v reálnom čase, atmosferické svetlo
10. **Render** - vykreslenie celej scény do prehliadača

## 🐛 Riešenie problémov

### Hra sa nespustí
- Skontrolujte internetové pripojenie (potrebné pre Three.js CDN)
- Použite moderný prehliadač (Chrome 90+, Firefox 88+)
- Skontrolujte konzolu prehliadača (F12) pre chyby

### Pomalý výkon
- Zatvorte ostatné karty prehliadača
- Znížte kvalitu grafiky v nastaveniach prehliadača
- Skúste iný prehliadač

### Ovládanie nereaguje
- Kliknite na hernú plochu, aby získala fokus
- Skontrolujte, či máte správne zapnutú klávesnicu

## 🚀 Možné rozšírenia

Ak chcete hru vylepšiť, môžete pridať:
- 🎵 **Zvukové efekty** - motor lietadla, výstrely, explózie
- 🎶 **Hudobný soundtrack** - dynamická hudba
- 💥 **Rôzne zbrane** - rakety, lasery, bomby
- 🏆 **Power-upy** - zdravie, štít, rýchlejšia streľba, triple shot
- 👾 **Typy nepriateľov** - ťažké bombardéry, rýchle stíhačky, tanky na zemi
- 🌍 **Väčšie úrovne** - rôzne biomy (púšť, hory,more, mesto)
- 📊 **Progression system** - odomykanie nových lietadiel
- 🎯 **Misie a ciele** - zničiť určitý počet nepriateľov, ochrana objektov
- � **High score** - localStorage pre najlepšie výsledky
- 🎨 **Lepšie modely** - GLTF/OBJ importované 3D modely lietadiel
- ⭐ **Boss battles** - veľké materské lode
- 🌤️ **Denný cyklus** - deň/noc, dynamické počasie (dážď, hmla)
- 🗺️ **Minimap** - radar so zobrazením nepriateľov
- 👥 **Multiplayer** - súboje s inými hráčmi (WebSockets)
- 🎮 **Gamepad podpora** - ovládanie joystickom

## 📝 Licencia

Tento projekt je open-source a voľne použiteľný na vzdelávacie účely.

## 🎉 Baví vás hra?

Tešte sa z lietania a strieľania! Pokúste sa dosiahnuť čo najvyššie skóre! 🚀✨

---

**Vytvorené s ❤️ pomocou Three.js a JavaScript**
