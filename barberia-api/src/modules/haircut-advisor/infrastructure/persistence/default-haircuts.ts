import type { Haircut } from '../../domain/entities/haircut.entity.js';

/**
 * Starting catalog, the same rows `docs/schema.sql` seeds into `haircuts`. Suitability follows
 * common barber guidance: add height for round faces, soften angles for square ones, cover the
 * forehead for long, heart and diamond faces.
 */
export const DEFAULT_HAIRCUTS: readonly Haircut[] = [
  {
    id: 'buzz',
    name: 'Rapado',
    description: 'Pelo muy corto y parejo en toda la cabeza. Resalta la mandíbula.',
    suitability: { oval: 0.8, square: 0.9, oblong: 0.3, diamond: 0.4, heart: 0.3, round: 0.2, triangle: 0.3 },
  },
  {
    id: 'crewCut',
    name: 'Crew cut',
    description: 'Arriba un poco más largo y lados en degradado. Clásico y fácil de llevar.',
    suitability: { oval: 0.9, square: 1, oblong: 0.6, diamond: 0.5, heart: 0.4, round: 0.5, triangle: 0.5 },
  },
  {
    id: 'sidePart',
    name: 'Raya al lado',
    description: 'Corte clásico peinado hacia un lado con la raya marcada.',
    suitability: { oval: 0.9, square: 0.9, oblong: 0.7, diamond: 0.6, heart: 0.7, round: 0.7, triangle: 0.7 },
  },
  {
    id: 'pompadour',
    name: 'Pompadour',
    description: 'Mucho volumen hacia arriba y atrás en el frente, lados en degradado.',
    suitability: { oval: 0.8, round: 1, triangle: 0.9, square: 0.6, diamond: 0.5, heart: 0.4, oblong: 0.1 },
  },
  {
    id: 'quiff',
    name: 'Tupé',
    description: 'Frente levantado con textura y lados cortos. Da altura sin ser tan formal.',
    suitability: { oval: 0.9, round: 0.9, triangle: 0.9, diamond: 0.7, square: 0.6, heart: 0.5, oblong: 0.2 },
  },
  {
    id: 'texturedCrop',
    name: 'Crop texturizado',
    description: 'Arriba corto y con textura hacia adelante, flequillo corto y degradado.',
    suitability: { oval: 0.9, oblong: 0.9, square: 0.8, diamond: 0.9, heart: 0.8, round: 0.3, triangle: 0.5 },
  },
  {
    id: 'undercut',
    name: 'Undercut',
    description: 'Lados y nuca muy cortos con contraste fuerte; arriba largo peinado hacia atrás o al lado.',
    suitability: { oval: 0.8, round: 0.8, square: 0.8, triangle: 0.6, diamond: 0.5, heart: 0.4, oblong: 0.3 },
  },
  {
    id: 'fringe',
    name: 'Flequillo',
    description: 'El pelo cae hacia adelante y cubre parte de la frente. Acorta visualmente el rostro.',
    suitability: { oblong: 1, heart: 0.9, diamond: 0.9, oval: 0.7, square: 0.5, triangle: 0.4, round: 0.1 },
  },
  {
    id: 'mediumFlow',
    name: 'Medio largo',
    description: 'Largo medio con movimiento, cubre parte de las orejas y la nuca.',
    suitability: { heart: 1, diamond: 0.9, oblong: 0.8, triangle: 0.8, oval: 0.8, square: 0.6, round: 0.3 },
  },
];
