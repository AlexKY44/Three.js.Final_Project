// Єдине джерело правди для села: і будівлі, і дороги беруть дані звідси
export const VILLAGE = {
  x: -35,
  z: 25,
  scale: 0.010,          // було 0.008 (+25%)
  rowOffset: 7,          // відстань від осі вулиці до ряду будинків
  facingOffset: 0,       // якщо будинки стоять ДВЕРИМА ВІД дороги, поставте Math.PI

  street: { halfLength: 19, width: 4 },
  connectorDx: -18,      // де вулиця йде на північ до великої дороги (X = x + connectorDx)

  // side: -1 = північний ряд, 1 = південний ряд; dx = зсув уздовж вулиці
  buildings: [
    { key: 'sawmill',    dx: -13,  side: -1 },
    { key: 'h1',         dx: -6.5, side: -1 },
    { key: 'inn',        dx: 0,    side: -1 },
    { key: 'h2',         dx: 6.5,  side: -1 },
    { key: 'blacksmith', dx: 13,   side: -1 },

    { key: 'stable',     dx: -13,  side: 1 },
    { key: 'h3',         dx: -6.5, side: 1 },
    { key: 'bellTower',  dx: 0,    side: 1 },
    { key: 'h4',         dx: 6.5,  side: 1 },
    { key: 'mill',       dx: 13,   side: 1 }
  ]
};