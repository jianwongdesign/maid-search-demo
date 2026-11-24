'use strict';

const byId = id => document.getElementById(id);
const dialog = byId('profile');
const filters = byId('filters');
let profiles = [];

function element(tag, className, text) {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (text) item.textContent = text;
  return item;
}

function button(label, className, action) {
  const item = element('button', className, label);
  item.type = 'button';
  item.addEventListener('click', action);
  return item;
}

function portrait(person, className) {
  const image = element('img', className);
  image.src = './images/' + person.id + '.webp';
  image.alt = '';
  return image;
}

function skills(items) {
  const list = element('ul', 'skills');
  list.setAttribute('aria-label', 'Skills');
  list.append(...items.map(skill => element('li', '', skill)));
  return list;
}

function pay(person) {
  return 'S$' + person.low + '–' + person.high;
}

function card(person) {
  const item = element('article', 'card');
  const body = element('div', 'card-body');
  const bottom = element('div', 'card-bottom');
  const salary = element('span', 'salary', pay(person));
  salary.append(element('small', '', 'per month'));
  const open = button('View profile', 'open', () => {
    showProfile(person);
    dialog.showModal();
  });
  open.setAttribute('aria-label', 'View profile for ' + person.name);
  bottom.append(salary, open);
  body.append(element('h3', '', person.name),
    element('p', 'meta', person.nationality + ' · ' + person.years + ' years’ experience'),
    skills(person.skills.slice(0, 2)), bottom);
  item.append(portrait(person, 'portrait'), body);
  return item;
}

function render() {
  const skill = byId('skill').value;
  const nationality = byId('nationality').value;
  const budget = Number(byId('budget').value);
  const visible = profiles.filter(person =>
    (!skill || person.skills.includes(skill)) &&
    (!nationality || person.nationality === nationality) &&
    (!budget || person.low <= budget)
  );
  byId('cards').replaceChildren(...visible.map(card));
  byId('count').textContent = visible.length + (visible.length === 1 ? ' profile' : ' profiles');
  byId('notice').textContent = visible.length ? '' : 'No helpers match these filters. Try another skill or clear the filters.';
  byId('reset').disabled = !(skill || nationality || budget);
}

function details(rows) {
  const list = element('dl');
  for (const [key, value] of rows) {
    const row = element('div');
    row.append(element('dt', '', key), element('dd', '', value));
    list.append(row);
  }
  return list;
}

function heading(text) {
  const title = element('h2', '', text);
  title.id = 'dialog-title';
  title.tabIndex = -1;
  return title;
}

function screen(stage, ...children) {
  byId('stage').textContent = stage;
  byId('content').replaceChildren(...children);
  dialog.scrollTop = 0;
  if (dialog.open) byId('dialog-title').focus();
}

function showProfile(person) {
  const header = element('div', 'person');
  const identity = element('div');
  identity.append(heading(person.name), element('p', 'meta', person.nationality));
  header.append(portrait(person), identity);
  screen('Helper profile', header, element('p', 'detail-text', person.bio), skills(person.skills),
    details([['Experience', person.years + ' years'], ['Languages', person.languages.join(', ')],
      ['Salary', pay(person) + ' / month']]),
    button('Book an interview', 'primary', () => showBooking(person)));
}

function interviewDates() {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const part = name => Number(today.find(entry => entry.type === name).value);
  const date = new Date(Date.UTC(part('year'), part('month') - 1, part('day')));
  const format = new Intl.DateTimeFormat('en-SG', {
    timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  });
  const days = [];
  while (days.length < 5) {
    date.setUTCDate(date.getUTCDate() + 1);
    if (date.getUTCDay() > 0 && date.getUTCDay() < 6) days.push(format.format(date));
  }
  return days;
}

function choice(label, placeholder, options) {
  const field = element('label', '', label);
  const select = element('select');
  select.required = true;
  select.append(new Option(placeholder, ''), ...options.map(value => new Option(value, value)));
  field.append(select);
  return { field, select };
}

function showBooking(person) {
  const form = element('form');
  const fields = element('div', 'booking-fields');
  const day = choice('Interview date', 'Choose a date', interviewDates());
  const time = choice('Start time (Singapore time)', 'Choose a time', ['10:00 am', '2:00 pm', '4:00 pm']);
  fields.append(day.field, time.field);
  const actions = element('div', 'actions');
  const confirm = element('button', 'primary', 'Confirm demo booking');
  confirm.type = 'submit';
  actions.append(confirm, button('Back to profile', 'secondary', () => showProfile(person)));
  form.append(fields, actions);
  form.addEventListener('submit', event => {
    event.preventDefault();
    screen('Interview booking demo', heading('Demo booking complete'),
      details([['Helper', person.name], ['Date', day.select.value], ['Start time', time.select.value + ' (Singapore time)']]),
      element('p', 'detail-text', 'This was a practice booking. No interview has been scheduled.'),
      button('Return to helpers', 'primary', () => dialog.close()));
  });
  screen('Interview booking demo', heading('Interview with ' + person.name),
    element('p', 'detail-text', 'Choose a sample date and time. This demo runs in your browser.'), form);
}

byId('close').addEventListener('click', () => dialog.close());
filters.addEventListener('change', render);
filters.addEventListener('reset', () => requestAnimationFrame(render));
filters.addEventListener('submit', event => event.preventDefault());

async function loadProfiles() {
  try {
    const response = await fetch('./profiles.json');
    if (!response.ok) throw new Error('Profile data unavailable');
    profiles = await response.json();
    for (const [id, entries] of [
      ['skill', profiles.flatMap(person => person.skills)],
      ['nationality', profiles.map(person => person.nationality)]
    ]) {
      const values = [...new Set(entries)].sort();
      byId(id).append(...values.map(value => new Option(value, value)));
    }
    render();
  } catch {
    byId('notice').replaceChildren('Profiles could not be loaded. ', button('Try again', 'secondary', loadProfiles));
  }
}
loadProfiles();
