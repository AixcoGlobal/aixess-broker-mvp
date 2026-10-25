// TRESORA and DOWNTOWN ONE, the two Dubai projects (Kemo, 22 October 2026). English follows the two
// supplied briefs, with concise public copy updated on 25 October 2026: 1-AiXESS_TRESORA_Website_Developer_Instructions_Final.docx and
// 2-DOWNTOWN-ONE-project.docx, with their embedded fact cards rebuilt as text. Editorial labels
// ("Add pictures", "Project highlits", underscore rules) are not copied. The DOWNTOWN ONE brief opens
// with "Project: Dubai-project name DOWNTOWN DUBAI", but its own copy names the project Downtown One in
// Downtown Jebel Ali, so that is used throughout. Figures are the developers' stated claims as supplied:
// never call them verified or live, and keep "expected" / "anticipated" / "approximately".
// 23 October 2026: the developers' source packet updated the hero facts, highlights (no figure repeats
// the hero's), categories and amenities; the new sections' words are in dubai-projects-sources-copy.js.
// {{price}} is TRESORA's 40/60 starting price and {{studio}} DOWNTOWN ONE's studio launch price, both in
// US dollars from dubai-projects-data.js; {{pct:N}} is a percentage. All are formatted per language in
// DubaiProjectPages.jsx.

export const DUBAI_PROJECTS_COPY = {
  en: {
    common: {
      eyebrow: "Selected opportunities\u00a0·\u00a0Dubai",
      listEyebrow: "Selected opportunities",
      listTitle: "New projects in Dubai",
      category: "Dubai",
      exploreProject: "Explore project",
      contents: "Project contents",
      opensMaps: "opens Google Maps in a new tab",
      opensEmail: "opens your email app",
      mail: {
        subject: "AiXESS · {{project}}: {{request}}",
        project: "Project",
        location: "Location",
        request: "Request",
        name: "Name",
        phone: "Phone",
        message: "Message",
      },
      requests: {
        availability: "Request availability",
        units: "Request available units",
        prices: "Enquire about prices",
        currentPrices: "Request current prices",
        details: "Request project details",
        brochure: "Request brochure",
        contact: "Contact AiXESS",
      },
    },
    tresora: {
      name: "TRESORA",
      cardName: "TRESORA Project",
      place: "Jumeirah Village Circle (JVC), Dubai",
      cardLine: "A Treasure of Balance",
      cardStatus: "Expected completion Q1 2028",
      hero: {
        title: ["TRESORA", "DUBAI"],
        subtitle: "A Treasure of Balance",
        intro: "A new mixed-use address in Jumeirah Village Circle, Dubai.",
        facts: [["From, 40/60 plan", "{{price}}", "price"], ["Initial payment", "{{pct:20}}"], ["Expected completion", "Q1 2028"]],
        explore: "Explore Residences",
        availability: "Request Availability",
      },
      discover: {
        eyebrow: "Discover TRESORA",
        title: "Spaces for work, wellbeing and everyday life",
        body: [
          "Interiors pair functional planning with integrated smart technology.",
          "Shared facilities create room to work, unwind and spend time together.",
        ],
      },
      spaces: {
        eyebrow: "Property types",
        title: "Find the space that fits",
        body: [
          "Compare the categories below, then explore the floor plans to see how the spaces are arranged.",
        ],
        listTitle: "Residential and commercial options",
        categories: ["Studios & Smart Studios", "Smart One-Bedroom Residences", "One-Bedroom Residences", "Two-Bedroom Residences", "Boutique Offices", "Retail Spaces", "Two- and Three-Bedroom Penthouses"],
        note: "Ask AiXESS for current units, layouts and prices.",
        units: "Request Available Units",
        prices: "Enquire About Prices",
      },
      lifestyle: {
        eyebrow: "Project amenities",
        title: "A Lifestyle Designed Around You",
        lead: "Experience a carefully curated selection of amenities created to support relaxation, wellness, productivity and family living.",
        amenities: ["Swimming Pool & Jacuzzi", "Fully Equipped Fitness Gym", "Pilates Facilities", "Sauna", "Ice Bath Therapy", "Children's Splash Park", "BBQ & Outdoor Social Areas", "Residents' Lounge & Co-working Spaces"],
      },
      location: {
        eyebrow: "Perfectly Positioned in Dubai",
        title: "Jumeirah Village Circle\u00a0— Connected to What Matters",
        body: [
          "Access to Al Khail Road and Sheikh Mohammed Bin Zayed Road connects the development with destinations across Dubai.",
        ],
        nearbyTitle: "Nearby community amenities",
        nearby: ["Circle Mall", "Circle Community Park", "JSS International School", "Life Medical Center", "Carewell Clinics"],
        explore: "Explore the Location",
        mapQuery: "Jumeirah Village Circle, Dubai",
        contact: "Contact AiXESS",
      },
      payment: {
        eyebrow: "Flexible Payment Options",
        title: "Your Property. Your Future.",
        body: [
          "Compare the construction-linked and post-handover schedules below.",
        ],
      },
      more: {
        eyebrow: "TRESORA",
        title: "Discover More About TRESORA",
        body: [
          "Tell us your preferred property type and our team will help you review the available options.",
        ],
        contact: "Contact AiXESS",
        details: "Request Project Details",
      },
    },
    downtown: {
      name: "DOWNTOWN ONE",
      cardName: "DOWNTOWN ONE DUBAI",
      place: "Downtown Jebel Ali, Dubai",
      cardLine: "The Next Generation of Urban Living",
      cardStatus: "Anticipated completion December 2029",
      hero: {
        title: ["DOWNTOWN ONE", "DUBAI"],
        subtitle: "The Next Generation of Urban Living",
        body: [
          "Contemporary homes in Downtown Jebel Ali, Dubai.",
        ],
        explore: "Explore Residences",
        availability: "Request Availability",
        facts: [["From, studios", "{{studio}}", "price"], ["Residences at launch", "245"], ["Anticipated completion", "December 2029"]],
      },
      highlights: {
        eyebrow: "Downtown One",
        title: "Premium project highlights",
        items: [
          ["20 Floors", "Contemporary Residential Tower", "Plus three podium floors, ground floor and basement"],
          ["AI-Powered", "Smart Home Living", "Intelligent everyday convenience"],
          ["20+ Amenities", "Lifestyle Experiences", "Wellness, leisure, fitness and family facilities"],
        ],
      },
      amenities: {
        eyebrow: "Beyond Ordinary Living",
        title: "A Lifestyle Designed Around Every Moment",
        body: [
          "Shared spaces for fitness, relaxation and time with family and friends.",
        ],
        groups: [
          ["Wellness & Fitness", ["Indoor Gym", "Outdoor Gym", "Immersive Fitness Studio", "Yoga Lawn", "Jacuzzi"]],
          ["Pools & Relaxation", ["Adult Swimming Pool", "Children's Swimming Pool", "Children's Splash Pool", "Leisure Water Lounge", "Pool Deck & Relaxation Areas", "Lazy Lounge", "Shallow Pool"]],
          ["Entertainment & Recreation", ["Outdoor Cinema", "Golf Simulator", "Mini Golf", "Game Zone", "BBQ Areas", "Rooftop Lounge", "Cigar Lounge"]],
          ["Family & Outdoor Living", ["Children's Play Area", "Landscaped Walkways", "Outdoor Seating & Social Areas", "Swing Seating", "Outdoor Shower"]],
        ],
      },
      location: {
        eyebrow: "Connected to Dubai. Positioned for Tomorrow.",
        title: "Downtown Jebel Ali\u00a0— A Location That Keeps You Moving",
        body: [
          "Sheikh Zayed Road and the Dubai Metro Red Line connect residents with the city's business districts and leisure destinations.",
        ],
        nearbyTitle: "Nearby Destinations",
        nearby: [
          ["approximately 5–10 minutes", "Dubai Metro and Aster Cedars Hospital"],
          ["approximately 10–15 minutes", "Dubai Marina, JBR, Dubai Parks & Resorts and JAFZA One"],
          ["approximately 15–20 minutes", "Expo City Dubai, Dubai Investment Park and Mall of the Emirates"],
        ],
      },
      more: {
        eyebrow: "Discover More About Downtown One",
        title: "Your Next Property in Dubai Starts Here",
        body: [
          "Tell us your preferred residence and our team will help you review current prices, availability and payment terms.",
        ],
        contact: "Contact AiXESS",
      },
    },
  },

  de: {
    common: {
      eyebrow: "Ausgewählte Chancen\u00a0·\u00a0Dubai",
      listEyebrow: "Ausgewählte Chancen",
      listTitle: "Neue Projekte in Dubai",
      category: "Dubai",
      exploreProject: "Projekt entdecken",
      contents: "Projektinhalte",
      opensMaps: "öffnet Google Maps in einem neuen Tab",
      opensEmail: "öffnet Ihr E-Mail-Programm",
      mail: {
        subject: "AiXESS · {{project}}: {{request}}",
        project: "Projekt",
        location: "Lage",
        request: "Anfrage",
        name: "Name",
        phone: "Telefon",
        message: "Nachricht",
      },
      requests: {
        availability: "Verfügbarkeit anfragen",
        units: "Verfügbare Einheiten anfragen",
        prices: "Preise anfragen",
        currentPrices: "Aktuelle Preise anfragen",
        details: "Projektdetails anfragen",
        brochure: "Broschüre anfragen",
        contact: "AiXESS kontaktieren",
      },
    },
    tresora: {
      name: "TRESORA",
      cardName: "TRESORA Projekt",
      place: "Jumeirah Village Circle (JVC), Dubai",
      cardLine: "Ein Schatz der Balance",
      cardStatus: "Voraussichtliche Fertigstellung Q1 2028",
      hero: {
        title: ["TRESORA", "DUBAI"],
        subtitle: "Ein Schatz der Balance",
        intro: "Eine neue Adresse zum Wohnen und Arbeiten in Jumeirah Village Circle, Dubai.",
        facts: [["Ab, Plan 40/60", "{{price}}", "price"], ["Anfangszahlung", "{{pct:20}}"], ["Voraussichtliche Fertigstellung", "Q1 2028"]],
        explore: "Residenzen entdecken",
        availability: "Verfügbarkeit anfragen",
      },
      discover: {
        eyebrow: "TRESORA entdecken",
        title: "Raum für Arbeit, Wohlbefinden und Alltag",
        body: [
          "Die Innenräume verbinden funktionale Planung mit integrierter Smart-Technologie.",
          "Gemeinschaftsbereiche bieten Raum zum Arbeiten, Entspannen und Zusammensein.",
        ],
      },
      spaces: {
        eyebrow: "Immobilientypen",
        title: "Finden Sie den passenden Raum",
        body: [
          "Vergleichen Sie die folgenden Kategorien und entdecken Sie die Raumaufteilung in den Grundrissen.",
        ],
        listTitle: "Wohn- und Gewerberäume",
        categories: ["Studios & Smart Studios", "Smart-Residenzen mit einem Schlafzimmer", "Residenzen mit einem Schlafzimmer", "Residenzen mit zwei Schlafzimmern", "Boutique-Büros", "Einzelhandelsflächen", "Penthouses mit zwei und drei Schlafzimmern"],
        note: "Aktuelle Einheiten, Grundrisse und Preise erhalten Sie auf Anfrage bei AiXESS.",
        units: "Verfügbare Einheiten anfragen",
        prices: "Preise anfragen",
      },
      lifestyle: {
        eyebrow: "Projektausstattung",
        title: "Ein Lebensstil, der sich nach Ihnen richtet",
        lead: "Erleben Sie eine sorgfältig kuratierte Auswahl an Annehmlichkeiten für Entspannung, Wohlbefinden, Produktivität und Familienleben.",
        amenities: ["Swimmingpool & Jacuzzi", "Voll ausgestattetes Fitnessstudio", "Pilates-Bereich", "Sauna", "Eisbad-Therapie", "Wasserspielpark für Kinder", "Grill- & Outdoor-Treffpunkte", "Bewohner-Lounge & Co-Working-Bereiche"],
      },
      location: {
        eyebrow: "Ideal gelegen in Dubai",
        title: "Jumeirah Village Circle\u00a0— verbunden mit dem, was zählt",
        body: [
          "Über die Al Khail Road und die Sheikh Mohammed Bin Zayed Road erreichen Sie Ziele in ganz Dubai.",
        ],
        nearbyTitle: "Einrichtungen in der Nähe",
        nearby: ["Circle Mall", "Circle Community Park", "JSS International School", "Life Medical Center", "Carewell Clinics"],
        explore: "Lage entdecken",
        mapQuery: "Jumeirah Village Circle, Dubai",
        contact: "AiXESS kontaktieren",
      },
      payment: {
        eyebrow: "Flexible Zahlungsoptionen",
        title: "Ihre Immobilie. Ihre Zukunft.",
        body: [
          "Vergleichen Sie die baubegleitenden Zahlungen und die Raten nach der Übergabe.",
        ],
      },
      more: {
        eyebrow: "TRESORA",
        title: "Mehr über TRESORA erfahren",
        body: [
          "Nennen Sie uns Ihren bevorzugten Immobilientyp. Unser Team hilft Ihnen, die verfügbaren Optionen zu prüfen.",
        ],
        contact: "AiXESS kontaktieren",
        details: "Projektdetails anfragen",
      },
    },
    downtown: {
      name: "DOWNTOWN ONE",
      cardName: "DOWNTOWN ONE DUBAI",
      place: "Downtown Jebel Ali, Dubai",
      cardLine: "Die nächste Generation urbanen Wohnens",
      cardStatus: "Angestrebte Fertigstellung Dezember 2029",
      hero: {
        title: ["DOWNTOWN ONE", "DUBAI"],
        subtitle: "Die nächste Generation urbanen Wohnens",
        body: [
          "Zeitgemäßes Wohnen in Downtown Jebel Ali, Dubai.",
        ],
        explore: "Residenzen entdecken",
        availability: "Verfügbarkeit anfragen",
        facts: [["Ab, Studios", "{{studio}}", "price"], ["Residenzen zum Verkaufsstart", "245"], ["Angestrebte Fertigstellung", "Dezember 2029"]],
      },
      highlights: {
        eyebrow: "Downtown One",
        title: "Premium-Highlights des Projekts",
        items: [
          ["20 Etagen", "Zeitgemäßer Wohnturm", "Dazu drei Podiumsetagen, Erdgeschoss und Untergeschoss"],
          ["KI-gestützt", "Smart-Home-Wohnen", "Intelligenter Komfort im Alltag"],
          ["20+ Angebote", "Lifestyle-Erlebnisse", "Wellness-, Freizeit-, Fitness- und Familienangebote"],
        ],
      },
      amenities: {
        eyebrow: "Mehr als gewöhnliches Wohnen",
        title: "Ein Lebensstil für jeden Moment",
        body: [
          "Gemeinschaftsbereiche für Fitness, Entspannung und Zeit mit Familie und Freunden.",
        ],
        groups: [
          ["Wellness & Fitness", ["Indoor-Fitnessstudio", "Outdoor-Fitnessbereich", "Immersives Fitnessstudio", "Yoga-Rasen", "Jacuzzi"]],
          ["Pools & Entspannung", ["Schwimmbecken für Erwachsene", "Kinderschwimmbecken", "Wasserspielbecken für Kinder", "Leisure Water Lounge", "Pooldeck & Ruhebereiche", "Lazy Lounge", "Flachwasserbecken"]],
          ["Unterhaltung & Freizeit", ["Freiluftkino", "Golfsimulator", "Minigolf", "Spielzone", "Grillbereiche", "Rooftop-Lounge", "Zigarrenlounge"]],
          ["Familie & Leben im Freien", ["Kinderspielbereich", "Angelegte Spazierwege", "Sitz- & Treffbereiche im Freien", "Schaukelsitze", "Außendusche"]],
        ],
      },
      location: {
        eyebrow: "Mit Dubai verbunden. Für morgen positioniert.",
        title: "Downtown Jebel Ali\u00a0— eine Lage, die Sie in Bewegung hält",
        body: [
          "Die Sheikh Zayed Road und die Dubai Metro Red Line verbinden Bewohner mit den Geschäftsvierteln und Freizeitzielen der Stadt.",
        ],
        nearbyTitle: "Ziele in der Nähe",
        nearby: [
          ["ca. 5–10 Minuten", "Dubai Metro und Aster Cedars Hospital"],
          ["ca. 10–15 Minuten", "Dubai Marina, JBR, Dubai Parks & Resorts und JAFZA One"],
          ["ca. 15–20 Minuten", "Expo City Dubai, Dubai Investment Park und Mall of the Emirates"],
        ],
      },
      more: {
        eyebrow: "Mehr über Downtown One erfahren",
        title: "Ihre nächste Immobilie in Dubai beginnt hier",
        body: [
          "Nennen Sie uns Ihre bevorzugte Residenz. Unser Team unterstützt Sie bei aktuellen Preisen, Verfügbarkeiten und Zahlungsbedingungen.",
        ],
        contact: "AiXESS kontaktieren",
      },
    },
  },

  pl: {
    common: {
      eyebrow: "Wybrane okazje\u00a0·\u00a0Dubaj",
      listEyebrow: "Wybrane okazje",
      listTitle: "Nowe projekty w Dubaju",
      category: "Dubaj",
      exploreProject: "Poznaj projekt",
      contents: "Zawartość projektu",
      opensMaps: "otwiera Mapy Google w nowej karcie",
      opensEmail: "otwiera program pocztowy",
      mail: {
        subject: "AiXESS · {{project}}: {{request}}",
        project: "Projekt",
        location: "Lokalizacja",
        request: "Zapytanie",
        name: "Imię i nazwisko",
        phone: "Telefon",
        message: "Wiadomość",
      },
      requests: {
        availability: "Zapytaj o dostępność",
        units: "Zapytaj o dostępne lokale",
        prices: "Zapytaj o ceny",
        currentPrices: "Zapytaj o aktualne ceny",
        details: "Poproś o szczegóły projektu",
        brochure: "Poproś o broszurę",
        contact: "Kontakt z AiXESS",
      },
    },
    tresora: {
      name: "TRESORA",
      cardName: "Projekt TRESORA",
      place: "Jumeirah Village Circle (JVC), Dubaj",
      cardLine: "Skarb równowagi",
      cardStatus: "Planowane ukończenie: I kw. 2028",
      hero: {
        title: ["TRESORA", "DUBAI"],
        subtitle: "Skarb równowagi",
        intro: "Nowy adres do życia i pracy w Jumeirah Village Circle w Dubaju.",
        facts: [["Od, plan 40/60", "{{price}}", "price"], ["Wpłata początkowa", "{{pct:20}}"], ["Planowane ukończenie", "I kw. 2028"]],
        explore: "Poznaj apartamenty",
        availability: "Zapytaj o dostępność",
      },
      discover: {
        eyebrow: "Poznaj TRESORA",
        title: "Przestrzeń do pracy, odpoczynku i codziennego życia",
        body: [
          "Wnętrza łączą funkcjonalny układ ze zintegrowaną inteligentną technologią.",
          "Przestrzenie wspólne zapewniają miejsce do pracy, relaksu i spotkań.",
        ],
      },
      spaces: {
        eyebrow: "Rodzaje nieruchomości",
        title: "Znajdź przestrzeń dla siebie",
        body: [
          "Porównaj poniższe kategorie, a następnie sprawdź rozmieszczenie przestrzeni na planach pięter.",
        ],
        listTitle: "Mieszkania i lokale komercyjne",
        categories: ["Studia i inteligentne studia", "Inteligentne apartamenty z jedną sypialnią", "Apartamenty z jedną sypialnią", "Apartamenty z dwiema sypialniami", "Butikowe biura", "Lokale handlowe", "Penthouse'y z dwiema i trzema sypialniami"],
        note: "Zapytaj AiXESS o aktualnie dostępne lokale, układy i ceny.",
        units: "Zapytaj o dostępne lokale",
        prices: "Zapytaj o ceny",
      },
      lifestyle: {
        eyebrow: "Udogodnienia projektu",
        title: "Styl życia zaprojektowany wokół Ciebie",
        lead: "Poznaj starannie dobrany zestaw udogodnień stworzonych z myślą o relaksie, dobrym samopoczuciu, produktywności i życiu rodzinnym.",
        amenities: ["Basen i jacuzzi", "W pełni wyposażona siłownia", "Strefa pilatesu", "Sauna", "Terapia w lodowej kąpieli", "Wodny plac zabaw dla dzieci", "Strefy grillowe i towarzyskie na zewnątrz", "Lounge dla mieszkańców i strefy coworkingowe"],
      },
      location: {
        eyebrow: "Doskonała lokalizacja w Dubaju",
        title: "Jumeirah Village Circle\u00a0— blisko tego, co ważne",
        body: [
          "Dostęp do Al Khail Road i Sheikh Mohammed Bin Zayed Road zapewnia połączenia z miejscami w całym Dubaju.",
        ],
        nearbyTitle: "Udogodnienia w okolicy",
        nearby: ["Circle Mall", "Circle Community Park", "JSS International School", "Life Medical Center", "Carewell Clinics"],
        explore: "Poznaj lokalizację",
        mapQuery: "Jumeirah Village Circle, Dubai",
        contact: "Kontakt z AiXESS",
      },
      payment: {
        eyebrow: "Elastyczne opcje płatności",
        title: "Twoja nieruchomość. Twoja przyszłość.",
        body: [
          "Porównaj harmonogram płatności w trakcie budowy i rat po przekazaniu nieruchomości.",
        ],
      },
      more: {
        eyebrow: "TRESORA",
        title: "Dowiedz się więcej o TRESORA",
        body: [
          "Powiedz nam, jaki rodzaj nieruchomości Cię interesuje. Nasz zespół pomoże Ci przeanalizować dostępne opcje.",
        ],
        contact: "Kontakt z AiXESS",
        details: "Poproś o szczegóły projektu",
      },
    },
    downtown: {
      name: "DOWNTOWN ONE",
      cardName: "DOWNTOWN ONE DUBAI",
      place: "Downtown Jebel Ali, Dubaj",
      cardLine: "Nowa generacja życia w mieście",
      cardStatus: "Przewidywane ukończenie: grudzień 2029",
      hero: {
        title: ["DOWNTOWN ONE", "DUBAI"],
        subtitle: "Nowa generacja życia w mieście",
        body: [
          "Nowoczesne mieszkania w Downtown Jebel Ali w Dubaju.",
        ],
        explore: "Poznaj apartamenty",
        availability: "Zapytaj o dostępność",
        facts: [["Od, studia", "{{studio}}", "price"], ["Apartamenty na start sprzedaży", "245"], ["Przewidywane ukończenie", "Grudzień 2029"]],
      },
      highlights: {
        eyebrow: "Downtown One",
        title: "Najważniejsze cechy projektu premium",
        items: [
          ["20 pięter", "Nowoczesny wieżowiec mieszkalny", "Plus trzy piętra podium, parter i piwnica"],
          ["Oparte na AI", "Inteligentny dom", "Inteligentna wygoda na co dzień"],
          ["20+ udogodnień", "Doświadczenia lifestyle'owe", "Wellness, rekreacja, fitness i udogodnienia rodzinne"],
        ],
      },
      amenities: {
        eyebrow: "Więcej niż zwykłe życie",
        title: "Styl życia zaprojektowany na każdą chwilę",
        body: [
          "Wspólne przestrzenie do aktywności, odpoczynku i spotkań z rodziną oraz przyjaciółmi.",
        ],
        groups: [
          ["Wellness i fitness", ["Siłownia wewnętrzna", "Siłownia na zewnątrz", "Immersyjne studio fitness", "Trawnik do jogi", "Jacuzzi"]],
          ["Baseny i relaks", ["Basen dla dorosłych", "Basen dla dzieci", "Brodzik wodny dla dzieci", "Leisure Water Lounge", "Taras basenowy i strefy relaksu", "Lazy Lounge", "Płytki basen"]],
          ["Rozrywka i rekreacja", ["Kino plenerowe", "Symulator golfa", "Minigolf", "Strefa gier", "Strefy grillowe", "Lounge na dachu", "Cigar lounge"]],
          ["Rodzina i życie na zewnątrz", ["Plac zabaw dla dzieci", "Zagospodarowane ścieżki spacerowe", "Miejsca do siedzenia i spotkań na zewnątrz", "Huśtawki do siedzenia", "Prysznic zewnętrzny"]],
        ],
      },
      location: {
        eyebrow: "Połączone z Dubajem. Gotowe na jutro.",
        title: "Downtown Jebel Ali\u00a0— lokalizacja, która daje swobodę ruchu",
        body: [
          "Sheikh Zayed Road i czerwona linia metra w Dubaju łączą mieszkańców z dzielnicami biznesowymi i atrakcjami miasta.",
        ],
        nearbyTitle: "Miejsca w pobliżu",
        nearby: [
          ["ok. 5–10 minut", "Metro w Dubaju i Aster Cedars Hospital"],
          ["ok. 10–15 minut", "Dubai Marina, JBR, Dubai Parks & Resorts i JAFZA One"],
          ["ok. 15–20 minut", "Expo City Dubai, Dubai Investment Park i Mall of the Emirates"],
        ],
      },
      more: {
        eyebrow: "Dowiedz się więcej o Downtown One",
        title: "Twoja następna nieruchomość w Dubaju zaczyna się tutaj",
        body: [
          "Wskaż interesujące Cię mieszkanie, a nasz zespół pomoże Ci sprawdzić aktualne ceny, dostępność i warunki płatności.",
        ],
        contact: "Kontakt z AiXESS",
      },
    },
  },

  sl: {
    common: {
      eyebrow: "Izbrane priložnosti\u00a0·\u00a0Dubaj",
      listEyebrow: "Izbrane priložnosti",
      listTitle: "Novi projekti v Dubaju",
      category: "Dubaj",
      exploreProject: "Raziščite projekt",
      contents: "Vsebina projekta",
      opensMaps: "odpre Google Zemljevide v novem zavihku",
      opensEmail: "odpre vaš e-poštni program",
      mail: {
        subject: "AiXESS · {{project}}: {{request}}",
        project: "Projekt",
        location: "Lokacija",
        request: "Povpraševanje",
        name: "Ime in priimek",
        phone: "Telefon",
        message: "Sporočilo",
      },
      requests: {
        availability: "Povpraševanje o razpoložljivosti",
        units: "Povpraševanje o razpoložljivih enotah",
        prices: "Povpraševanje o cenah",
        currentPrices: "Povpraševanje o aktualnih cenah",
        details: "Zahteva za podrobnosti projekta",
        brochure: "Zahteva za brošuro",
        contact: "Kontaktirajte AiXESS",
      },
    },
    tresora: {
      name: "TRESORA",
      cardName: "Projekt TRESORA",
      place: "Jumeirah Village Circle (JVC), Dubaj",
      cardLine: "Zaklad ravnovesja",
      cardStatus: "Predvideno dokončanje: 1. četrtletje 2028",
      hero: {
        title: ["TRESORA", "DUBAI"],
        subtitle: "Zaklad ravnovesja",
        intro: "Nov naslov za bivanje in delo v Jumeirah Village Circle v Dubaju.",
        facts: [["Že od, načrt 40/60", "{{price}}", "price"], ["Začetno plačilo", "{{pct:20}}"], ["Predvideno dokončanje", "1. četrtletje 2028"]],
        explore: "Raziščite rezidence",
        availability: "Povprašajte o razpoložljivosti",
      },
      discover: {
        eyebrow: "Odkrijte TRESORA",
        title: "Prostor za delo, dobro počutje in vsakdan",
        body: [
          "Notranjost združuje funkcionalno zasnovo in vgrajeno pametno tehnologijo.",
          "Skupni prostori omogočajo delo, sprostitev in druženje.",
        ],
      },
      spaces: {
        eyebrow: "Vrste nepremičnin",
        title: "Poiščite prostor zase",
        body: [
          "Primerjajte spodnje kategorije in si na tlorisih oglejte razporeditev prostorov.",
        ],
        listTitle: "Stanovanjske in poslovne možnosti",
        categories: ["Garsonjere in pametne garsonjere", "Pametne rezidence z eno spalnico", "Rezidence z eno spalnico", "Rezidence z dvema spalnicama", "Butične pisarne", "Trgovski prostori", "Penthousi z dvema in tremi spalnicami"],
        note: "Pri AiXESS povprašajte po trenutno razpoložljivih enotah, tlorisih in cenah.",
        units: "Povprašajte o razpoložljivih enotah",
        prices: "Povprašajte o cenah",
      },
      lifestyle: {
        eyebrow: "Ugodnosti projekta",
        title: "Življenjski slog, prilagojen vam",
        lead: "Doživite skrbno izbrane ugodnosti, ustvarjene za sprostitev, dobro počutje, produktivnost in družinsko življenje.",
        amenities: ["Bazen in jacuzzi", "Popolnoma opremljen fitnes", "Prostori za pilates", "Savna", "Terapija z ledeno kopeljo", "Vodno igrišče za otroke", "Prostori za žar in druženje na prostem", "Salon za stanovalce in coworking prostori"],
      },
      location: {
        eyebrow: "Odlična lega v Dubaju",
        title: "Jumeirah Village Circle\u00a0— povezano s tem, kar šteje",
        body: [
          "Dostop do cest Al Khail Road in Sheikh Mohammed Bin Zayed Road povezuje projekt z destinacijami po Dubaju.",
        ],
        nearbyTitle: "Bližnje ugodnosti v soseski",
        nearby: ["Circle Mall", "Circle Community Park", "JSS International School", "Life Medical Center", "Carewell Clinics"],
        explore: "Raziščite lokacijo",
        mapQuery: "Jumeirah Village Circle, Dubai",
        contact: "Kontaktirajte AiXESS",
      },
      payment: {
        eyebrow: "Prilagodljive možnosti plačila",
        title: "Vaša nepremičnina. Vaša prihodnost.",
        body: [
          "Primerjajte plačila med gradnjo in obroke po predaji.",
        ],
      },
      more: {
        eyebrow: "TRESORA",
        title: "Več o projektu TRESORA",
        body: [
          "Povejte nam, katera vrsta nepremičnine vas zanima. Naša ekipa vam bo pomagala pregledati razpoložljive možnosti.",
        ],
        contact: "Kontaktirajte AiXESS",
        details: "Zahtevajte podrobnosti projekta",
      },
    },
    downtown: {
      name: "DOWNTOWN ONE",
      cardName: "DOWNTOWN ONE DUBAI",
      place: "Downtown Jebel Ali, Dubaj",
      cardLine: "Nova generacija urbanega bivanja",
      cardStatus: "Pričakovano dokončanje: december 2029",
      hero: {
        title: ["DOWNTOWN ONE", "DUBAI"],
        subtitle: "Nova generacija urbanega bivanja",
        body: [
          "Sodobni domovi v Downtown Jebel Ali v Dubaju.",
        ],
        explore: "Raziščite rezidence",
        availability: "Povprašajte o razpoložljivosti",
        facts: [["Od, studii", "{{studio}}", "price"], ["Stanovanja ob začetku prodaje", "245"], ["Pričakovano dokončanje", "December 2029"]],
      },
      highlights: {
        eyebrow: "Downtown One",
        title: "Poudarki vrhunskega projekta",
        items: [
          ["20 nadstropij", "Sodobna stanovanjska stolpnica", "Ter tri nadstropja podija, pritličje in klet"],
          ["Z umetno inteligenco", "Pametni dom", "Inteligentno vsakdanje udobje"],
          ["20+ ugodnosti", "Življenjske izkušnje", "Ponudba za dobro počutje, prosti čas, fitnes in družine"],
        ],
      },
      amenities: {
        eyebrow: "Več kot običajno bivanje",
        title: "Življenjski slog za vsak trenutek",
        body: [
          "Skupni prostori za vadbo, sprostitev ter druženje z družino in prijatelji.",
        ],
        groups: [
          ["Dobro počutje in fitnes", ["Notranji fitnes", "Zunanji fitnes", "Imerzivni fitnes studio", "Trata za jogo", "Jacuzzi"]],
          ["Bazeni in sprostitev", ["Bazen za odrasle", "Otroški bazen", "Otroški vodni bazen", "Leisure Water Lounge", "Bazenska terasa in prostori za sprostitev", "Lazy Lounge", "Plitvi bazen"]],
          ["Zabava in rekreacija", ["Kino na prostem", "Golf simulator", "Mini golf", "Igralna cona", "Prostori za žar", "Salon na strehi", "Cigar lounge"]],
          ["Družina in bivanje na prostem", ["Otroško igrišče", "Urejene sprehajalne poti", "Sedišča in prostori za druženje na prostem", "Gugalna sedišča", "Zunanja prha"]],
        ],
      },
      location: {
        eyebrow: "Povezano z Dubajem. Pripravljeno na jutri.",
        title: "Downtown Jebel Ali\u00a0— lokacija, ki vas ohranja v gibanju",
        body: [
          "Cesta Sheikh Zayed Road in rdeča linija dubajskega metroja povezujeta stanovalce s poslovnimi predeli in prostočasnimi destinacijami mesta.",
        ],
        nearbyTitle: "Bližnje destinacije",
        nearby: [
          ["približno 5–10 minut", "Metro v Dubaju in Aster Cedars Hospital"],
          ["približno 10–15 minut", "Dubai Marina, JBR, Dubai Parks & Resorts in JAFZA One"],
          ["približno 15–20 minut", "Expo City Dubai, Dubai Investment Park in Mall of the Emirates"],
        ],
      },
      more: {
        eyebrow: "Več o projektu Downtown One",
        title: "Vaša naslednja nepremičnina v Dubaju se začne tukaj",
        body: [
          "Povejte nam, katero stanovanje vas zanima. Naša ekipa vam bo pomagala preveriti trenutne cene, razpoložljivost in plačilne pogoje.",
        ],
        contact: "Kontaktirajte AiXESS",
      },
    },
  },

  ru: {
    common: {
      eyebrow: "Избранные возможности\u00a0·\u00a0Дубай",
      listEyebrow: "Избранные возможности",
      listTitle: "Новые проекты в Дубае",
      category: "Дубай",
      exploreProject: "Смотреть проект",
      contents: "Содержание проекта",
      opensMaps: "открывает Google Карты в новой вкладке",
      opensEmail: "открывает почтовую программу",
      mail: {
        subject: "AiXESS · {{project}}: {{request}}",
        project: "Проект",
        location: "Расположение",
        request: "Запрос",
        name: "Имя",
        phone: "Телефон",
        message: "Сообщение",
      },
      requests: {
        availability: "Запросить наличие",
        units: "Запросить доступные объекты",
        prices: "Узнать цены",
        currentPrices: "Запросить актуальные цены",
        details: "Запросить подробности проекта",
        brochure: "Запросить брошюру",
        contact: "Связаться с AiXESS",
      },
    },
    tresora: {
      name: "TRESORA",
      cardName: "Проект TRESORA",
      place: "Jumeirah Village Circle (JVC), Дубай",
      cardLine: "Сокровище баланса",
      cardStatus: "Ожидаемое завершение: I квартал 2028",
      hero: {
        title: ["TRESORA", "DUBAI"],
        subtitle: "Сокровище баланса",
        intro: "Новый адрес для жизни и работы в Jumeirah Village Circle, Дубай.",
        facts: [["От, план 40/60", "{{price}}", "price"], ["Первоначальный платёж", "{{pct:20}}"], ["Ожидаемое завершение", "I квартал 2028"]],
        explore: "Смотреть резиденции",
        availability: "Запросить наличие",
      },
      discover: {
        eyebrow: "Откройте TRESORA",
        title: "Пространство для работы, отдыха и повседневной жизни",
        body: [
          "Интерьеры сочетают функциональную планировку со встроенными умными технологиями.",
          "Общие пространства предназначены для работы, отдыха и общения.",
        ],
      },
      spaces: {
        eyebrow: "Типы недвижимости",
        title: "Найдите подходящее пространство",
        body: [
          "Сравните категории ниже и изучите расположение помещений на планах этажей.",
        ],
        listTitle: "Жилые и коммерческие помещения",
        categories: ["Студии и смарт-студии", "Смарт-резиденции с одной спальней", "Резиденции с одной спальней", "Резиденции с двумя спальнями", "Бутик-офисы", "Торговые помещения", "Пентхаусы с двумя и тремя спальнями"],
        note: "Уточните у AiXESS доступные объекты, планировки и актуальные цены.",
        units: "Запросить доступные объекты",
        prices: "Узнать цены",
      },
      lifestyle: {
        eyebrow: "Удобства проекта",
        title: "Стиль жизни, созданный для вас",
        lead: "Оцените тщательно подобранные удобства для отдыха, благополучия, продуктивности и семейной жизни.",
        amenities: ["Бассейн и джакузи", "Полностью оборудованный тренажёрный зал", "Зона для пилатеса", "Сауна", "Терапия ледяной ванной", "Детский аквапарк с фонтанами", "Зоны барбекю и отдыха на открытом воздухе", "Лаунж для жителей и коворкинг"],
      },
      location: {
        eyebrow: "Идеальное расположение в Дубае",
        title: "Jumeirah Village Circle\u00a0— рядом со всем важным",
        body: [
          "Выезд на Al Khail Road и Sheikh Mohammed Bin Zayed Road обеспечивает связь с разными районами Дубая.",
        ],
        nearbyTitle: "Инфраструктура рядом",
        nearby: ["Circle Mall", "Circle Community Park", "JSS International School", "Life Medical Center", "Carewell Clinics"],
        explore: "Посмотреть расположение",
        mapQuery: "Jumeirah Village Circle, Dubai",
        contact: "Связаться с AiXESS",
      },
      payment: {
        eyebrow: "Гибкие варианты оплаты",
        title: "Ваша недвижимость. Ваше будущее.",
        body: [
          "Сравните графики платежей во время строительства и после передачи объекта.",
        ],
      },
      more: {
        eyebrow: "TRESORA",
        title: "Узнайте больше о TRESORA",
        body: [
          "Сообщите, какой тип недвижимости вас интересует. Наша команда поможет рассмотреть доступные варианты.",
        ],
        contact: "Связаться с AiXESS",
        details: "Запросить подробности проекта",
      },
    },
    downtown: {
      name: "DOWNTOWN ONE",
      cardName: "DOWNTOWN ONE DUBAI",
      place: "Downtown Jebel Ali, Дубай",
      cardLine: "Новое поколение городской жизни",
      cardStatus: "Планируемое завершение: декабрь 2029",
      hero: {
        title: ["DOWNTOWN ONE", "DUBAI"],
        subtitle: "Новое поколение городской жизни",
        body: [
          "Современные резиденции в Downtown Jebel Ali, Дубай.",
        ],
        explore: "Смотреть резиденции",
        availability: "Запросить наличие",
        facts: [["От, студии", "{{studio}}", "price"], ["Резиденции на старте продаж", "245"], ["Планируемое завершение", "Декабрь 2029"]],
      },
      highlights: {
        eyebrow: "Downtown One",
        title: "Ключевые особенности премиального проекта",
        items: [
          ["20 этажей", "Современная жилая башня", "А также три этажа подиума, первый этаж и подвал"],
          ["На базе ИИ", "Умный дом", "Интеллектуальный комфорт каждый день"],
          ["20+ удобств", "Стиль жизни", "Велнес, досуг, фитнес и всё для семьи"],
        ],
      },
      amenities: {
        eyebrow: "Больше, чем обычная жизнь",
        title: "Стиль жизни для каждого момента",
        body: [
          "Общие пространства для тренировок, отдыха и встреч с семьёй и друзьями.",
        ],
        groups: [
          ["Велнес и фитнес", ["Крытый тренажёрный зал", "Уличный тренажёрный зал", "Иммерсивная фитнес-студия", "Лужайка для йоги", "Джакузи"]],
          ["Бассейны и отдых", ["Бассейн для взрослых", "Детский бассейн", "Детский бассейн с фонтанами", "Leisure Water Lounge", "Палуба у бассейна и зоны отдыха", "Lazy Lounge", "Мелкий бассейн"]],
          ["Развлечения и досуг", ["Кинотеатр под открытым небом", "Гольф-симулятор", "Мини-гольф", "Игровая зона", "Зоны барбекю", "Лаунж на крыше", "Сигарный лаунж"]],
          ["Семья и жизнь на свежем воздухе", ["Детская игровая площадка", "Ландшафтные прогулочные дорожки", "Зоны отдыха и общения на открытом воздухе", "Подвесные качели", "Уличный душ"]],
        ],
      },
      location: {
        eyebrow: "Связь с Дубаем. Взгляд в завтра.",
        title: "Downtown Jebel Ali\u00a0— район, который держит вас в движении",
        body: [
          "Sheikh Zayed Road и красная линия метро Дубая связывают жителей с деловыми районами и местами отдыха города.",
        ],
        nearbyTitle: "Места поблизости",
        nearby: [
          ["примерно 5–10 минут", "Метро Дубая и Aster Cedars Hospital"],
          ["примерно 10–15 минут", "Dubai Marina, JBR, Dubai Parks & Resorts и JAFZA One"],
          ["примерно 15–20 минут", "Expo City Dubai, Dubai Investment Park и Mall of the Emirates"],
        ],
      },
      more: {
        eyebrow: "Узнайте больше о Downtown One",
        title: "Ваша следующая недвижимость в Дубае начинается здесь",
        body: [
          "Сообщите, какая резиденция вас интересует. Наша команда поможет уточнить актуальные цены, доступность и условия оплаты.",
        ],
        contact: "Связаться с AiXESS",
      },
    },
  },
};
