// Time arithmetic helpers for timeline calculations

export function parseTimeString(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

export function formatTime(date) {
  return date.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
}

export function addMinutesToDate(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

export function getMinutesDifference(startDate, endDate) {
  return Math.round((endDate.getTime() - startDate.getTime()) / 60000);
}

export function createDateFromTimeString(timeStr, baseDate = new Date()) {
  const { hours, minutes } = parseTimeString(timeStr);
  const result = new Date(baseDate);
  result.setHours(hours, minutes, 0, 0);
  return result;
}