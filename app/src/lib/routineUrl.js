import catalog from './taskCatalog.json';

export const URL_ERROR = 'Não foi possível carregar a rotina do link. Mostramos a rotina padrão temporariamente, sem substituir suas rotinas salvas. Abra a página inicial sem o link para voltar aos seus dados.';
const MAX_VALUE_LENGTH = 6000;
const PERIODS = { m: 'morning', n: 'evening' };
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

function fail(stage, reason, entry) {
  throw Object.assign(new Error(URL_ERROR), { failure: { stage, reason, ...(entry === undefined ? {} : { entry }) } });
}

function strictDecode(value, stage, entry) {
  try { return decodeURIComponent(value); }
  catch (_) { fail(stage, 'malformed-percent-or-utf8', entry); }
}

function parseEndTime(time, stage = 'end-time') {
  if (!/^\d{4}$/.test(time) || Number(time.slice(0, 2)) > 23 || Number(time.slice(2)) > 59) fail(stage, 'invalid-clock');
  return time.slice(0, 2) + ':' + time.slice(2);
}

// Strict decoding: URLSearchParams alone silently repairs invalid UTF-8/percent escapes.
export function parseRoutineUrl(search, pathname = '/') {
  try {
    const values = [];
    for (const pair of search.replace(/^\?/, '').split('&')) {
      const separator = pair.indexOf('=');
      const rawKey = separator < 0 ? pair : pair.slice(0, separator);
      let key;
      try { key = decodeURIComponent(rawKey.replace(/\+/g, ' ')); } catch (_) { continue; }
      if (key === 'rotina') values.push(separator < 0 ? '' : pair.slice(separator + 1));
    }
    if (!values.length) {
      if (pathname === '/') return { status: 'absent' };
      const time = pathname.slice(1);
      const endTime = parseEndTime(time, 'pathname');
      return { status: 'valid', source: 'path', period: Number(time.slice(0, 2)) < 12 ? 'morning' : 'evening', endTime };
    }
    if (values.length !== 1) fail('query', 'duplicate-routine');
    if (values[0].length > MAX_VALUE_LENGTH) fail('query', 'value-too-long');
    const value = strictDecode(values[0].replace(/\+/g, ' '), 'outer-decode');
    const legacy = value.includes('|');
    const parts = value.split(legacy ? '|' : '.');
    if (legacy && parts.length !== 3) fail('format', 'invalid-legacy-shape');
    if (parts[0] !== '1') fail('format', 'unsupported-version');
    if (!hasOwn(PERIODS, parts[1])) fail('format', 'invalid-period');
    let endTime;
    if (!legacy && /^\d{4}$/.test(parts[parts.length - 1])) endTime = parseEndTime(parts.pop());
    const entries = legacy ? parts[2].split(',') : parts.slice(2);
    if (!entries.length) fail('entries', 'missing-tasks');
    if (entries.length > 40) fail('entries', 'too-many-tasks');
    let total = 0;
    const tasks = entries.map((entry, index) => {
      const fields = entry.split(legacy ? ':' : '-');
      const duration = fields.pop();
      const identity = fields.join('-');
      if (!fields.length || (legacy && fields.length !== 1)) fail('task', 'invalid-fields', index + 1);
      if (!/^[1-9]\d{0,2}$/.test(duration)) fail('duration', 'invalid-minutes', index + 1);
      const minutes = Number(duration);
      total += minutes;
      if (minutes > 180) fail('duration', 'task-too-long', index + 1);
      if (total > 720) fail('duration', 'routine-too-long', index + 1);
      let definition;
      if (identity.startsWith('~')) {
        if (!legacy && !/^~(?:[A-Za-z0-9_!~*'()]|%[0-9a-fA-F]{2})+$/.test(identity)) fail('custom-name', 'invalid-encoded-name', index + 1);
        const name = strictDecode(identity.slice(1), 'custom-name-decode', index + 1);
        if (!name.trim() || name.length > 80 || Array.from(name).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) fail('custom-name', 'invalid-name', index + 1);
        definition = { name, icon: '✨', color: '#CCCCCC' };
      } else {
        if (fields.some(id => !hasOwn(catalog, id)) || fields.length > 40) fail('catalog', 'invalid-ids', index + 1);
        definition = {
          name: fields.map(id => catalog[id].name).join(' + '),
          icon: fields.map(id => catalog[id].icon).join(''),
          color: catalog[fields[0]].color,
          catalogIds: fields,
        };
      }
      return { ...definition, id: index + 1, minutes };
    });
    const period = PERIODS[parts[1]];
    return { status: 'valid', source: 'query', period, routine: {
      name: period === 'morning' ? 'Manhã' : 'Noite',
      endTime: endTime || (period === 'morning' ? '06:30' : '21:00'),
      tasks,
    } };
  } catch (error) {
    return { status: 'invalid', error: URL_ERROR, failure: error.failure || { stage: 'parser', reason: 'unexpected-input' } };
  }
}

// Names matching the catalog use short IDs; all others are literal text.
// Colors/icons edited locally are intentionally not part of this configuration format.
export function serializeRoutineUrl(baseUrl, period, tasks, endTime) {
  const code = Object.keys(PERIODS).find(key => PERIODS[key] === period);
  if (!code || !Array.isArray(tasks)) throw new Error(URL_ERROR);
  const entries = tasks.map(task => {
    if (!task || typeof task.name !== 'string' || !Number.isInteger(task.minutes)) throw new Error(URL_ERROR);
    const ids = task.catalogIds;
    if (ids && (!Array.isArray(ids) || !ids.length || ids.some(id => !hasOwn(catalog, id)))) throw new Error(URL_ERROR);
    const unchanged = ids && ids.map(id => catalog[id].name).join(' + ') === task.name;
    const id = unchanged ? ids.join('-') : Object.keys(catalog).find(key => catalog[key].name === task.name);
    const custom = encodeURIComponent(task.name).replace(/\./g, '%2E').replace(/-/g, '%2D');
    return `${id || '~' + custom}-${task.minutes}`;
  });
  const url = new URL(baseUrl);
  // A saved configuration replaces the time-only shortcut.
  if (/^\/\d{4}$/.test(url.pathname)) url.pathname = '/';
  let suffix = '';
  if (endTime !== undefined) {
    if (!/^\d{2}:\d{2}$/.test(endTime)) throw new Error(URL_ERROR);
    const time = endTime.replace(':', '');
    parseEndTime(time);
    suffix = '.' + time;
  }
  url.searchParams.delete('rotina');
  const other = url.searchParams.toString();
  url.search = (other ? other + '&' : '') + 'rotina=' + encodeURIComponent(`1.${code}.${entries.join('.')}${suffix}`);
  if (parseRoutineUrl(url.search).status !== 'valid') throw new Error(URL_ERROR);
  return url.href;
}

export function applyRoutineUrl(routines, parsed) {
  if (parsed.status !== 'valid') return routines;
  if (parsed.source === 'path') return { ...routines, monday: { ...routines.monday,
    [parsed.period]: { ...routines.monday[parsed.period], endTime: parsed.endTime },
  } };
  return { ...routines, monday: { ...routines?.monday, [parsed.period]: parsed.routine } };
}
