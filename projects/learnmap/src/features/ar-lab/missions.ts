export type ARQuestionType = 'reach' | 'distance' | 'speed' | 'time';

export interface ARMission {
  id: string;
  questionType: ARQuestionType;
  distance: number;
  speed: number;
  availableTime: number;
  speedUnit?: 'm/s' | 'km/h';
  prompt: { en: string; uk: string };
  choices: Array<{ id: string; en: string; uk: string }>;
  correctChoice: string;
  explanation: { en: string; uk: string };
}

export const AR_MISSIONS: ARMission[] = [
  {
    id: 'landing-01',
    questionType: 'reach',
    distance: 24,
    speed: 4,
    availableTime: 8,
    prompt: {
      en: 'The drone has 8 seconds of flight left. Will it reach the landing zone 24 m away at 4 m/s?',
      uk: 'У дрона залишилось 8 секунд польоту. Чи дістанеться він майданчика за 24 м зі швидкістю 4 м/с?',
    },
    choices: [
      { id: 'yes', en: 'YES', uk: 'ТАК' },
      { id: 'no', en: 'NO', uk: 'НІ' },
    ],
    correctChoice: 'yes',
    explanation: {
      en: 't = S / v = 24 / 4 = 6 s. The drone lands with 2 seconds in reserve.',
      uk: 't = S / v = 24 / 4 = 6 с. Дрон сідає із запасом 2 секунди.',
    },
  },
  {
    id: 'landing-02',
    questionType: 'reach',
    distance: 36,
    speed: 6,
    availableTime: 5,
    prompt: {
      en: 'Only 5 seconds remain. The landing zone is 36 m away and speed is 6 m/s. Will it make it?',
      uk: 'Залишилось лише 5 секунд. До майданчика 36 м, швидкість 6 м/с. Встигне?',
    },
    choices: [
      { id: 'yes', en: 'YES', uk: 'ТАК' },
      { id: 'no', en: 'NO', uk: 'НІ' },
    ],
    correctChoice: 'no',
    explanation: {
      en: '36 / 6 = 6 s, but only 5 s are available. The drone stops short of the landing zone.',
      uk: '36 / 6 = 6 с, але доступно лише 5 с. Дрон не долітає до майданчика.',
    },
  },
  {
    id: 'landing-03',
    questionType: 'distance',
    distance: 35,
    speed: 5,
    availableTime: 7,
    prompt: {
      en: 'Speed is 5 m/s and 7 seconds remain. What is the farthest safe landing-zone distance?',
      uk: 'Швидкість 5 м/с, залишилось 7 секунд. Яка найбільша безпечна відстань до майданчика?',
    },
    choices: [
      { id: '25', en: '25 m', uk: '25 м' },
      { id: '30', en: '30 m', uk: '30 м' },
      { id: '35', en: '35 m', uk: '35 м' },
      { id: '40', en: '40 m', uk: '40 м' },
    ],
    correctChoice: '35',
    explanation: {
      en: 'S = v × t = 5 × 7 = 35 m.',
      uk: 'S = v × t = 5 × 7 = 35 м.',
    },
  },
  {
    id: 'landing-04',
    questionType: 'speed',
    distance: 48,
    speed: 6,
    availableTime: 8,
    prompt: {
      en: 'The drone must cover 48 m in exactly 8 seconds. Which speed is required?',
      uk: 'Дрон має подолати 48 м рівно за 8 секунд. Яка швидкість потрібна?',
    },
    choices: [
      { id: '4', en: '4 m/s', uk: '4 м/с' },
      { id: '5', en: '5 m/s', uk: '5 м/с' },
      { id: '6', en: '6 m/s', uk: '6 м/с' },
      { id: '8', en: '8 m/s', uk: '8 м/с' },
    ],
    correctChoice: '6',
    explanation: {
      en: 'v = S / t = 48 / 8 = 6 m/s.',
      uk: 'v = S / t = 48 / 8 = 6 м/с.',
    },
  },
  {
    id: 'landing-05',
    questionType: 'time',
    distance: 100,
    speed: 72,
    speedUnit: 'km/h',
    availableTime: 6,
    prompt: {
      en: 'The drone flies at 72 km/h. The pad is 100 m away. Is 6 seconds enough?',
      uk: 'Дрон летить 72 км/год. До майданчика 100 м. Чи вистачить 6 секунд?',
    },
    choices: [
      { id: 'yes', en: 'YES', uk: 'ТАК' },
      { id: 'no', en: 'NO', uk: 'НІ' },
    ],
    correctChoice: 'yes',
    explanation: {
      en: '72 km/h = 20 m/s. Then t = 100 / 20 = 5 s, so 6 seconds is enough.',
      uk: '72 км/год = 20 м/с. Тоді t = 100 / 20 = 5 с, отже 6 секунд достатньо.',
    },
  },
];

export const BONUS_MISSIONS: ARMission[] = [
  {
    id: 'bonus-01',
    questionType: 'reach',
    distance: 63,
    speed: 9,
    availableTime: 8,
    prompt: {
      en: 'Bonus: 63 m, 9 m/s, 8 seconds of battery. Will the drone land?',
      uk: 'Бонус: 63 м, 9 м/с, 8 секунд батареї. Дрон сяде?',
    },
    choices: [
      { id: 'yes', en: 'YES', uk: 'ТАК' },
      { id: 'no', en: 'NO', uk: 'НІ' },
    ],
    correctChoice: 'yes',
    explanation: {
      en: '63 / 9 = 7 s. One second remains.',
      uk: '63 / 9 = 7 с. Залишається одна секунда.',
    },
  },
  {
    id: 'bonus-02',
    questionType: 'distance',
    distance: 54,
    speed: 6,
    availableTime: 9,
    prompt: {
      en: 'Bonus: at 6 m/s for 9 seconds, what is the maximum distance?',
      uk: 'Бонус: при 6 м/с протягом 9 секунд яка максимальна відстань?',
    },
    choices: [
      { id: '42', en: '42 m', uk: '42 м' },
      { id: '48', en: '48 m', uk: '48 м' },
      { id: '54', en: '54 m', uk: '54 м' },
      { id: '60', en: '60 m', uk: '60 м' },
    ],
    correctChoice: '54',
    explanation: {
      en: 'S = 6 × 9 = 54 m.',
      uk: 'S = 6 × 9 = 54 м.',
    },
  },
  {
    id: 'bonus-03',
    questionType: 'speed',
    distance: 70,
    speed: 10,
    availableTime: 7,
    prompt: {
      en: 'Bonus: cover 70 m in 7 seconds. Which speed is required?',
      uk: 'Бонус: подолати 70 м за 7 секунд. Яка потрібна швидкість?',
    },
    choices: [
      { id: '8', en: '8 m/s', uk: '8 м/с' },
      { id: '9', en: '9 m/s', uk: '9 м/с' },
      { id: '10', en: '10 m/s', uk: '10 м/с' },
      { id: '12', en: '12 m/s', uk: '12 м/с' },
    ],
    correctChoice: '10',
    explanation: {
      en: 'v = 70 / 7 = 10 m/s.',
      uk: 'v = 70 / 7 = 10 м/с.',
    },
  },
];

export function speedInMetersPerSecond(mission: ARMission) {
  return mission.speedUnit === 'km/h' ? mission.speed / 3.6 : mission.speed;
}

export function requiredTime(mission: ARMission) {
  return mission.distance / speedInMetersPerSecond(mission);
}

export function simulatedTravelRatio(mission: ARMission) {
  return Math.min(1, mission.availableTime / requiredTime(mission));
}

export function isCorrect(mission: ARMission, choice: string) {
  return choice === mission.correctChoice;
}
