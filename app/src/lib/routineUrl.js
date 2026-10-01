import catalog from './taskCatalog.json';

export const URL_ERROR = 'Não foi possível carregar a rotina do link. Confira o formato; sua rotina salva ou padrão continua disponível.';
const MAX_VALUE_LENGTH = 6000;
const PERIODS = { m: 'morning', n: 'evening' };
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

// Strict decoding: URLSearchParams alone silently repairs invalid UTF-8/percent escapes.
export function parseRoutineUrl(search) {
  try {
    const values = [];
    for (const pair of search.replace(/^\?/, '').split('&')) {
      const separator = pair.indexOf('=');
      const rawKey = separator < 0 ? pair : pair.slice(0, separator);
      let key;
      try { key = decodeURIComponent(rawKey.replace(/\+/g, ' ')); } catch (_) { continue; }
      if (key === 'rotina') values.push(separator < 0 ? '' : pair.slice(separator + 1));
    }
    if (!values.length) return { status: 'absent' };
    if (values.length !== 1 || values[0].length > MAX_VALUE_LENGTH) throw new Error();
    const value = decodeURIComponent(values[0].replace(/\+/g, ' '));
    const parts = value.split('|');
    if (parts.length !== 3 || parts[0] !== '1' || !hasOwn(PERIODS, parts[1])) throw new Error();
    const entries = parts[2].split(',');
    if (entries.length > 40) throw new Error();
    let total = 0;
    const tasks = entries.map((entry, index) => {
      const fields = entry.split(':');
      if (fields.length !== 2 || !/^[1-9]\d{0,2}$/.test(fields[1])) throw new Error();
      const minutes = Number(fields[1]);
      total += minutes;
      if (minutes > 180 || total > 720) throw new Error();
      let definition;
      if (fields[0].startsWith('~')) {
        const name = decodeURIComponent(fields[0].slice(1));
        if (!name.trim() || name.length > 80 || Array.from(name).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) throw new Error();
        definition = { name, icon: '✨', color: '#CCCCCC' };
      } else {
        if (!hasOwn(catalog, fields[0])) throw new Error();
        definition = catalog[fields[0]];
      }
      return { ...definition, id: index + 1, minutes };
    });
    const period = PERIODS[parts[1]];
    return { status: 'valid', period, routine: {
      name: period === 'morning' ? 'Manhã' : 'Noite',
      endTime: period === 'morning' ? '06:30' : '21:00',
      tasks,
    } };
  } catch (_) {
    return { status: 'invalid', error: URL_ERROR };
  }
}

// Names matching the catalog use short IDs; all others are literal text.
// Colors/icons edited locally are intentionally not part of this configuration format.
export function serializeRoutineUrl(baseUrl, period, tasks) {
  const code = Object.keys(PERIODS).find(key => PERIODS[key] === period);
  if (!code || !Array.isArray(tasks)) throw new Error(URL_ERROR);
  const entries = tasks.map(task => {
    if (!task || typeof task.name !== 'string' || !Number.isInteger(task.minutes)) throw new Error(URL_ERROR);
    const id = Object.keys(catalog).find(key => catalog[key].name === task.name);
    return `${id || '~' + encodeURIComponent(task.name)}:${task.minutes}`;
  });
  const url = new URL(baseUrl);
  url.searchParams.set('rotina', `1|${code}|${entries.join(',')}`);
  if (parseRoutineUrl(url.search).status !== 'valid') throw new Error(URL_ERROR);
  return url.href;
}

export function applyRoutineUrl(routines, parsed) {
  if (parsed.status !== 'valid') return routines;
  return { ...routines, monday: { ...routines?.monday, [parsed.period]: parsed.routine } };
}
