/**
 * Rating System Utilities
 * 
 * Система рейтингов (0-100):
 * - 85-100: Зеленый (Отлично)
 * - 70-84:  Желтый (Хорошо)
 * - 50-69:  Оранжевый (Средне)
 * - 30-49:  Красный (Плохо)
 * - 0-29:   Темно-красный/Серый (Опасно)
 */

/**
 * Get rating color based on score
 * @param {number} score - Rating score (0-100)
 * @returns {string} Hex color code
 */
export const getRatingColor = (score) => {
  if (score >= 85) return '#10b981'; // Emerald-500 (Зеленый)
  if (score >= 70) return '#eab308'; // Yellow-500 (Желтый)
  if (score >= 50) return '#f97316'; // Orange-500 (Оранжевый)
  if (score >= 30) return '#ef4444'; // Red-500 (Красный)
  return '#991b1b'; // Red-800 (Темно-красный)
};

/**
 * Get Tailwind border color class based on score
 * @param {number} score - Rating score (0-100)
 * @returns {string} Tailwind class name
 */
export const getRatingBorderClass = (score) => {
  if (score >= 85) return 'border-emerald-500'; // Зеленый
  if (score >= 70) return 'border-yellow-500'; // Желтый
  if (score >= 50) return 'border-orange-500'; // Оранжевый
  if (score >= 30) return 'border-red-500'; // Красный
  return 'border-red-800'; // Темно-красный
};

/**
 * Get rating label based on score
 * @param {number} score - Rating score (0-100)
 * @returns {string} Rating label
 */
export const getRatingLabel = (score) => {
  if (score >= 85) return 'Отлично';
  if (score >= 70) return 'Хорошо';
  if (score >= 50) return 'Средне';
  if (score >= 30) return 'Плохо';
  return 'Опасно';
};

/**
 * Get Tailwind text color class based on score
 * @param {number} score - Rating score (0-100)
 * @returns {string} Tailwind class name
 */
export const getRatingTextClass = (score) => {
  if (score >= 85) return 'text-emerald-500';
  if (score >= 70) return 'text-yellow-500';
  if (score >= 50) return 'text-orange-500';
  if (score >= 30) return 'text-red-500';
  return 'text-red-800';
};

/**
 * Get Tailwind background color class based on score
 * @param {number} score - Rating score (0-100)
 * @returns {string} Tailwind class name
 */
export const getRatingBgClass = (score) => {
  if (score >= 85) return 'bg-emerald-50';
  if (score >= 70) return 'bg-yellow-50';
  if (score >= 50) return 'bg-orange-50';
  if (score >= 30) return 'bg-red-50';
  return 'bg-gray-100';
};

/**
 * Normalize activity_score to 0-100 scale
 * @param {number} activityScore - Raw activity score
 * @param {number} maxScore - Maximum possible score (default: 1000)
 * @returns {number} Normalized score (0-100)
 */
export const normalizeActivityScore = (activityScore, maxScore = 1000) => {
  if (!activityScore || activityScore < 0) return 0;
  return Math.min(Math.round((activityScore / maxScore) * 100), 100);
};

/**
 * Get rating info object
 * @param {number} score - Rating score (0-100)
 * @returns {object} Rating info with color, label, classes
 */
export const getRatingInfo = (score) => {
  return {
    score,
    color: getRatingColor(score),
    borderClass: getRatingBorderClass(score),
    textClass: getRatingTextClass(score),
    bgClass: getRatingBgClass(score),
    label: getRatingLabel(score)
  };
};
