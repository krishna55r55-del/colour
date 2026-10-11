import { GameMetadata } from '../types';

export const ALL_GAMES: GameMetadata[] = [
  {
    id: 'color-prediction',
    title: 'Color Prediction',
    category: 'prediction',
    categoryLabel: 'Color & Numbers',
    description: 'Predict whether the next lucky outcome will land on Red, Green, or rare Violet.',
    tagline: 'Predict colors & win up to 4.5x',
    badge: 'Popular',
    maxMultiplier: '4.5x',
    minBet: 10,
    featured: true,
    accentColor: 'purple',
    rules: [
      'Choose your prediction: Green (2x), Red (2x), or Violet (4.5x).',
      'You can also pick specific lucky numbers (0–9) for massive 9x payouts.',
      'Numbers 1, 3, 7, 9 are Green; 2, 4, 6, 8 are Red.',
      'Numbers 0 & 5 combine Violet with Red and Green respectively.',
      'Place your bet and hit Spin/Reveal to view the provably fair result.'
    ]
  },
  {
    id: 'dice-roll',
    title: 'Dice Roll',
    category: 'dice_cards',
    categoryLabel: 'Dice Casino',
    description: 'Tumble 1 or 2 virtual 3D dice. Predict roll totals, Over/Under, or exact pairs.',
    tagline: 'Classic dice action with dynamic odds',
    badge: 'High RTP',
    maxMultiplier: '5.8x',
    minBet: 10,
    featured: true,
    accentColor: 'cyan',
    rules: [
      'Choose single die (1-6) or two dice (2-12) mode.',
      'In 2-dice mode, predict Under 7 (2.4x), Exact 7 (5.8x), or Over 7 (2.4x).',
      'Or try the Exact Doubles bet (Snake Eyes 1-1 or Double Sixes 6-6 for 6x!).',
      'Watch the dice shake and tumble with real physics.'
    ]
  },
  {
    id: 'dragon-tiger',
    title: 'Dragon Tiger',
    category: 'dice_cards',
    categoryLabel: 'Cards Table',
    description: 'The ultra-fast card showdown. Dragon vs Tiger: highest rank takes the round.',
    tagline: 'High-speed 2-card showdown',
    badge: 'Trending',
    maxMultiplier: '9.0x',
    minBet: 10,
    featured: true,
    accentColor: 'amber',
    rules: [
      'Bet on Dragon (2x), Tiger (2x), or a dramatic Tie (9x payout!).',
      'One card is dealt to Dragon and one to Tiger.',
      'Card values rank from Ace (1, lowest) to King (13, highest). Suit does not break ties.',
      'If both cards share the exact rank, Tie bets win 9x!'
    ]
  },
  {
    id: 'lucky-number',
    title: 'Lucky Number',
    category: 'luck_wheels',
    categoryLabel: 'Lottery Draw',
    description: 'Pick your lucky digit or draw high-energy lottery spheres from the cage.',
    tagline: 'Pick your digits & hit the jackpot',
    badge: 'Jackpot',
    maxMultiplier: '9.0x',
    minBet: 10,
    featured: false,
    accentColor: 'green',
    rules: [
      'Select your lucky number from 0 to 9 (9x payout), or choose Odd / Even (1.95x).',
      'Or play the 3-Ball Lotto mode where you pick 3 lucky numbers from 1–25.',
      'The neon lottery tumbler spins and ejects the golden winning balls.',
      'Match your selected numbers to claim the multiplier.'
    ]
  },
  {
    id: 'coin-flip',
    title: 'Coin Flip',
    category: 'luck_wheels',
    categoryLabel: 'Arcade Classic',
    description: 'The definitive 50/50 test. Flip the glowing metallic Cyber Coin and build streaks.',
    tagline: 'Heads or Tails with streak multipliers',
    badge: 'Fast Play',
    maxMultiplier: '3.8x',
    minBet: 10,
    featured: false,
    accentColor: 'cyan',
    rules: [
      'Choose Heads (Cyber Crest) or Tails (Neon Viper).',
      'Hit Flip to send the 3D coin spinning through the air.',
      'Play standard rounds (1.96x payout) or activate Streak Mode where consecutive correct guesses compound your payout!'
    ]
  },
  {
    id: 'number-prediction',
    title: 'Number Prediction',
    category: 'prediction',
    categoryLabel: 'High or Low',
    description: 'An initial number is drawn (1–100). Predict whether the next will be Higher or Lower.',
    tagline: 'Higher or Lower with dynamic multipliers',
    badge: 'Strategy',
    maxMultiplier: '8.5x',
    minBet: 10,
    featured: true,
    accentColor: 'purple',
    rules: [
      'A base number between 1 and 100 is generated.',
      'Predict if the mystery second number will be HIGHER or LOWER.',
      'Dynamic multipliers adjust based on probability: guessing Higher on 85 pays a huge 5.2x!',
      'Exact Match surprise outcome pays an incredible 12x.'
    ]
  },
  {
    id: 'spin-wheel',
    title: 'Spin Wheel',
    category: 'luck_wheels',
    categoryLabel: 'Wheel of Fortune',
    description: 'Give the glowing 12-segment lucky wheel a spin to unlock massive multipliers up to 25x.',
    tagline: 'Spin the neon wheel for up to 25x',
    badge: 'Mega Multiplier',
    maxMultiplier: '25.0x',
    minBet: 10,
    featured: true,
    accentColor: 'green',
    rules: [
      'Place your stake and tap SPIN to engage the wheel physics.',
      'Segments feature multipliers from 0x (busting) to 1.2x, 1.5x, 2x, 3x, 5x, 10x, and 25x Mega Jackpot!',
      'Decelerating friction brings the pointer to rest on your prize segment.'
    ]
  },
  {
    id: 'lucky-cards',
    title: 'Lucky Cards',
    category: 'dice_cards',
    categoryLabel: 'Card Mystery',
    description: 'Five holographic mystery cards lie face-down. Pick your card to reveal hidden multipliers.',
    tagline: 'Pick mystery cards with hidden multipliers',
    badge: 'Mystery',
    maxMultiplier: '10.0x',
    minBet: 10,
    featured: false,
    accentColor: 'amber',
    rules: [
      'Five mystery holographic cards are shuffled and placed face down.',
      'Pick 1 card (or 2 in Multi-Pick mode).',
      'Cards reveal multipliers from 0.5x, 1.5x, 2x, 4x, to the 10x Ace of Diamonds!',
      'Revealed cards show all other cards so you see what was hidden.'
    ]
  },
  {
    id: 'color-match',
    title: 'Color Match',
    category: 'arcade',
    categoryLabel: 'Color Arcade',
    description: 'A target neon color shade is broadcast. Choose the right matching spectrum before time ticks out.',
    tagline: 'Test your color vision and reflexes',
    badge: 'Skill & Luck',
    maxMultiplier: '5.0x',
    minBet: 10,
    featured: false,
    accentColor: 'purple',
    rules: [
      'A randomized target color code & neon glow appears in the center.',
      'Four challenger color swatches are generated, with one exact match and shades.',
      'Select the exact swatch or match the dominant chromatic family within 8 seconds.',
      'Speed and precision award higher winning multipliers (up to 5x!).'
    ]
  },
  {
    id: 'memory-match',
    title: 'Memory Match',
    category: 'arcade',
    categoryLabel: 'Memory Quest',
    description: 'Flip pairs of glowing cyber icons in a 12-tile grid. Match all 6 pairs with minimal flips.',
    tagline: 'Find all pairs & conquer the board',
    badge: 'High Skill',
    maxMultiplier: '3.5x',
    minBet: 10,
    featured: false,
    accentColor: 'cyan',
    rules: [
      '12 tiles contain 6 matching pairs of gaming cyber icons.',
      'Flip two tiles at a time to find identical matches.',
      'Match all 6 pairs before exhausting your flip allowances.',
      'Completing the grid with 0-2 mistakes awards the maximum 3.5x payout; each extra flip slightly scales down payout.'
    ]
  }
];
