export const minutes = (seconds: number) => `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
export const masteryStatus = (score: number) =>
  score < 40
    ? 'gap'
    : score < 60
      ? 'learning'
      : score < 80
        ? 'developing'
        : score < 95
          ? 'mastered'
          : 'strong';
