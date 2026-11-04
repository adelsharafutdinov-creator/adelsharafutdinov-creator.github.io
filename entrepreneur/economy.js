(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Economy = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = 1;
  const STAFF = {
    cook: { name: 'Повар', wage: 1050, fee: 1200, limit: 2, description: '+24 бургера за смену' },
    cashier: { name: 'Кассир', wage: 750, fee: 900, limit: 1, description: '+12% к спросу · быстрее очередь' },
    manager: { name: 'Управляющий', wage: 1500, fee: 2000, limit: 1, description: '+10 к мощности · координация двух точек' }
  };
  const UPGRADES = {
    grill: { name: 'Двойной гриль', cost: 6500, description: '+18 бургеров за смену' },
    fridge: { name: 'Холодильная камера', cost: 4200, description: 'Сырьё хранится 5 дней вместо 3' },
    sign: { name: 'Вывеска с характером', cost: 3800, description: '+10% к спросу' },
    process: { name: 'Стандарты кухни', cost: 5500, description: '+12 к мощности · −10% к коммунальным' }
  };
  const EVENTS = {
    festival: { title: 'Двор устраивает фестиваль', text: 'Соседи зовут накормить гостей. Участие даст дополнительный поток на две смены.', choices: [{ label: 'Поставить стенд', hint: '−900 ₽ сейчас · спрос +30% на 2 смены', cost: 900, traffic: .3, duration: 2 }, { label: 'Остаться в обычном режиме', hint: 'Без затрат и дополнительного потока', cost: 0 }] },
    review: { title: 'Заказ для районного автора', text: 'Местный обозреватель хочет попробовать ваш бургер. Можно вложиться в подачу или принять обычный заказ.', choices: [{ label: 'Сделать особенную подачу', hint: '−700 ₽ · репутация +7', cost: 700, rep: 7 }, { label: 'Подать как всем', hint: 'Без затрат · репутация +1', cost: 0, rep: 1 }] },
    team: { title: 'Темп растёт. Команда устала', text: 'Накопившиеся мелочи замедляют работу. Как проведём следующую смену?', choices: [{ label: 'Оплатить помощь на кухне', hint: '−800 ₽ · мощность +16 на 2 смены', cost: 800, capacity: 16, duration: 2 }, { label: 'Снизить темп', hint: 'Без затрат · мощность −8 на 1 смену', cost: 0, capacity: -8, duration: 1 }] },
    supplier: { title: 'Поставщик предлагает спеццену', text: 'Он резервирует свежие партии на три дня. Скидка окупится, если объём закупок достаточно большой.', choices: [{ label: 'Забронировать партии', hint: '−600 ₽ · сырьё дешевле на 18% на 3 смены', cost: 600, supply: -.18, duration: 3 }, { label: 'Сохранить гибкость', hint: 'Закупать по рыночной цене', cost: 0 }] },
    rival: { title: 'Конкурент раздаёт купоны', text: 'На соседней улице шумная акция. Можно поддержать постоянных гостей или переждать.', choices: [{ label: 'Запустить программу соседей', hint: '−1000 ₽ · репутация +6 · спрос +15% на 2 смены', cost: 1000, rep: 6, traffic: .15, duration: 2 }, { label: 'Переждать', hint: 'Спрос −12% на 2 смены', cost: 0, traffic: -.12, duration: 2 }] }
  };
  const ACHIEVEMENTS = {
    first: { title: 'Первые деньги', text: 'Закрыть первую прибыльную смену.' },
    team: { title: 'Уже не один', text: 'Нанять первого сотрудника.' },
    hundred: { title: 'Сарафанное радио', text: 'Продать 100 бургеров.' },
    streak: { title: 'Поймать ритм', text: 'Пять прибыльных смен подряд.' },
    system: { title: 'Дело работает', text: 'Внедрить стандарты кухни.' },
    network: { title: 'На два адреса', text: 'Открыть вторую точку.' },
    thousand: { title: 'Вкус большого дела', text: 'Продать 1 000 бургеров.' },
    season: { title: 'Предприниматель', text: 'Две точки и 75 000 ₽ в кассе.' }
  };
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  function random(s) { s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0; return s.seed / 4294967296; }
  function sumStock(s) { return s.inventory.reduce((a, b) => a + b.qty, 0); }
  function stockValue(s) { return s.inventory.reduce((a, b) => a + b.qty * b.cost, 0); }
  function log(s, text, kind = 'info') { s.journal.unshift({ day: s.day, text, kind }); s.journal = s.journal.slice(0, 80); }
  function earn(s, id) { if (!s.achievements.includes(id)) { s.achievements.push(id); log(s, 'Достижение: ' + ACHIEVEMENTS[id].title, 'achievement'); } }
  function generateMarket(s) {
    const weathers = [{ name: 'Солнечно', icon: 'sun', traffic: 1.08 }, { name: 'Облачно', icon: 'cloud', traffic: 1 }, { name: 'Дождь', icon: 'rain', traffic: .82 }];
    const weather = weathers[Math.floor(random(s) * weathers.length)];
    const weekend = s.day % 7 === 6 || s.day % 7 === 0;
    const competitor = s.day % 6 === 0;
    s.market = { weather: weather.name, icon: weather.icon, traffic: weather.traffic * (weekend ? 1.2 : 1) * (competitor ? .86 : 1), ingredient: Math.round(65 + random(s) * 15 + Math.sin(s.day / 4) * 5), reference: 230 + Math.round(Math.sin(s.day / 6) * 20), weekend, competitor };
  }
  function newGame(seed = (Date.now() >>> 0)) {
    const s = { version: VERSION, seed: seed >>> 0, day: 1, cash: 18000, dayStartCash: 18000, reputation: 45, outlets: 1, inventory: [], employees: { cook: 0, cashier: 0, manager: 0 }, upgrades: [], founder: 'kitchen', management: 'family', plan: { price: 230, quantity: 32, marketing: 0, recipe: 'classic' }, effects: [], pending: { purchases: 0, capex: 0, expense: 0, finance: 0 }, totalSold: 0, totalProfit: 0, streak: 0, bestStreak: 0, history: [], journal: [], achievements: [], event: null, loan: null, rescueUsed: false, bankrupt: false, market: null };
    generateMarket(s); log(s, 'Ключи получены. Первая точка на Липовой улице — ваша. В кассе 18 000 ₽.'); return s;
  }
  function effect(s, key) { return s.effects.reduce((v, e) => v + (e[key] || 0), 0); }
  function ingredientPrice(s) { return Math.max(1, Math.round(s.market.ingredient * (1 + effect(s, 'supply')))); }
  function employeeCount(s) { return Object.values(s.employees).reduce((a, b) => a + b, 0); }
  function capacity(s) {
    return Math.max(1, Math.floor((20 + (s.founder === 'kitchen' ? 12 : 0) + s.employees.cook * 24 + s.employees.manager * 10 + (s.outlets - 1) * 24 + (s.upgrades.includes('grill') ? 18 : 0) + (s.upgrades.includes('process') ? 12 : 0) + effect(s, 'capacity')) * (s.management === 'command' && employeeCount(s) ? 1.15 : 1) * (s.outlets === 2 && !s.employees.manager ? .88 : 1)));
  }
  function wages(s) { return Object.keys(STAFF).reduce((n, k) => n + s.employees[k] * STAFF[k].wage, 0); }
  function rent(s) { return s.outlets === 1 ? 1100 : 2300; }
  function demand(s) {
    const quality = s.plan.recipe === 'signature' ? 1.12 : 1;
    const priceFactor = clamp(Math.pow(s.market.reference / s.plan.price, 1.7), .2, 2.6);
    const m = [1, 1.2, 1.43][s.plan.marketing];
    return Math.max(1, Math.round((32 + (s.reputation - 45) * .65) * (s.outlets === 2 ? 1.8 : 1) * s.market.traffic * priceFactor * quality * m * (1 + .12 * s.employees.cashier) * (s.upgrades.includes('sign') ? 1.1 : 1) * (s.founder === 'growth' ? 1.15 : 1) * Math.max(.1, 1 + effect(s, 'traffic'))));
  }
  function forecast(s) {
    const d = demand(s), cap = capacity(s), produced = Math.min(s.plan.quantity, cap, sumStock(s));
    const sold = Math.min(d, produced), unit = ingredientPrice(s) + (s.plan.recipe === 'signature' ? 24 : 0);
    const utilities = Math.round((150 * s.outlets + produced * 7) * (s.upgrades.includes('process') ? .9 : 1) * (s.founder === 'operations' ? .85 : 1));
    const marketing = [0, 600, 1400][s.plan.marketing];
    return { demand: d, low: Math.max(1, Math.floor(d * .86)), high: Math.ceil(d * 1.14), capacity: cap, produced, sold, unit, wages: wages(s), rent: rent(s), marketing, utilities, profit: sold * s.plan.price - produced * unit - wages(s) - rent(s) - utilities - marketing };
  }
  function requireActive(s) { if (s.bankrupt) throw Error('Касса пуста. Используйте резервный заём или начните новую историю.'); }
  function spend(s, amount, kind) { if (!Number.isFinite(amount) || amount < 0 || s.cash < amount) throw Error('Не хватает денег. Сохраните резерв на смену.'); s.cash -= amount; s.pending[kind] += amount; }
  function buy(s, qty) {
    requireActive(s);
    if (!Number.isInteger(qty) || qty < 1 || qty > 300 || sumStock(s) + qty > 500) throw Error('Закупка: от 1 до 300 комплектов. Склад вмещает 500.');
    const cost = ingredientPrice(s); spend(s, qty * cost, 'purchases');
    const last = s.inventory.at(-1); if (last && last.day === s.day && last.cost === cost) last.qty += qty; else s.inventory.push({ qty, cost, day: s.day });
    log(s, `Куплено ${qty} комплектов за ${qty * cost} ₽.`); return s;
  }
  function hire(s, role) {
    requireActive(s); const def = STAFF[role];
    if (!def || s.employees[role] >= def.limit) throw Error('Эта должность уже укомплектована.');
    if (role === 'manager' && employeeCount(s) < 2) throw Error('Управляющий доступен после найма двух сотрудников.');
    spend(s, def.fee, 'expense'); s.employees[role]++; earn(s, 'team'); log(s, `В команде: ${def.name}. Зарплата ${def.wage} ₽ за смену.`); return s;
  }
  function fire(s, role) {
    requireActive(s); if (!STAFF[role] || !s.employees[role]) throw Error('Сотрудник не найден.');
    spend(s, STAFF[role].wage, 'expense'); s.employees[role]--; log(s, `${STAFF[role].name}: договор завершён. Выплачена одна смена.`); return s;
  }
  function upgrade(s, id) {
    requireActive(s); const u = UPGRADES[id]; if (!u || s.upgrades.includes(id)) throw Error('Улучшение уже установлено.');
    spend(s, u.cost, 'capex'); s.upgrades.push(id); if (id === 'process') earn(s, 'system'); log(s, `Инвестиция: ${u.name}, ${u.cost} ₽.`); return s;
  }
  function expansionRequirements(s) { return [{ label: '24 000 ₽ на открытие + 6 000 ₽ резерв', met: s.cash >= 30000 }, { label: 'Два сотрудника в команде', met: employeeCount(s) >= 2 }, { label: 'Репутация от 55', met: s.reputation >= 55 }, { label: 'Не меньше пяти завершённых смен', met: s.day >= 6 }]; }
  function expand(s) {
    requireActive(s); if (s.outlets !== 1 || expansionRequirements(s).some(r => !r.met)) throw Error('Сначала выполните условия открытия второй точки.');
    spend(s, 24000, 'capex'); s.outlets = 2; earn(s, 'network'); log(s, 'Открыта вторая точка у сквера. Аренда сети теперь 2 300 ₽ за смену.'); return s;
  }
  function resolveEvent(s, index) {
    const e = EVENTS[s.event]; const choice = e?.choices[index]; if (!choice) throw Error('Событие уже завершено.');
    spend(s, choice.cost, 'expense'); s.reputation = clamp(s.reputation + (choice.rep || 0), 0, 100);
    if (choice.duration) s.effects.push({ traffic: choice.traffic || 0, capacity: choice.capacity || 0, supply: choice.supply || 0, remaining: choice.duration });
    log(s, `${e.title}: ${choice.label}.`); s.event = null; return s;
  }
  function rescue(s) {
    if (s.rescueUsed) throw Error('Резервный заём уже использован.');
    s.cash += 12000; s.pending.finance += 12000; s.loan = { principal: 12000, due: s.day + 10, interest: 1500 }; s.rescueUsed = true; s.bankrupt = s.cash < 0;
    log(s, 'Резервный заём: +12 000 ₽. Вернуть 13 500 ₽ через 10 смен.'); return s;
  }
  function repay(s) {
    if (!s.loan || s.cash < s.loan.principal + s.loan.interest) throw Error('Для погашения нужно 13 500 ₽.');
    s.cash -= s.loan.principal + s.loan.interest; s.pending.finance -= s.loan.principal; s.pending.expense += s.loan.interest; s.loan = null; log(s, 'Резервный заём погашен.'); return s;
  }
  function setPlan(s, key, value) {
    requireActive(s);
    if (key === 'price' && Number.isInteger(value) && value >= 120 && value <= 420) s.plan.price = value;
    else if (key === 'quantity' && Number.isInteger(value) && value >= 1 && value <= 200) s.plan.quantity = value;
    else if (key === 'marketing' && [0, 1, 2].includes(value)) s.plan.marketing = value;
    else if (key === 'recipe' && ['classic', 'signature'].includes(value)) s.plan.recipe = value;
    else throw Error('Некорректное значение плана.'); return s;
  }
  function setPolicy(s, key, value) {
    requireActive(s);
    if (key === 'founder' && ['kitchen', 'growth', 'operations'].includes(value)) s.founder = value;
    else if (key === 'management' && ['family', 'command', 'system'].includes(value)) {
      if (value === 'system' && !s.upgrades.includes('process')) throw Error('Сначала внедрите стандарты кухни.'); s.management = value;
    } else throw Error('Неизвестное решение.'); return s;
  }
  function runDay(s, closed = false) {
    requireActive(s); if (s.event) throw Error('Сначала примите решение по событию дня.');
    if (!closed && sumStock(s) < 1) throw Error('Купите хотя бы один комплект продуктов.');
    const f = forecast(s), produced = closed ? 0 : f.produced;
    let need = produced, ingredients = 0;
    for (const lot of s.inventory) { const take = Math.min(lot.qty, need); lot.qty -= take; need -= take; ingredients += take * lot.cost; }
    const actualDemand = closed ? 0 : Math.max(1, Math.round(f.demand * (.86 + random(s) * .28)));
    const sold = Math.min(produced, actualDemand), waste = produced - sold, lost = actualDemand - sold;
    const revenue = sold * s.plan.price, premium = s.plan.recipe === 'signature' ? produced * 24 : 0;
    let expired = 0, spoilage = 0;
    const life = s.upgrades.includes('fridge') ? 5 : 3;
    for (const lot of s.inventory) if (s.day - lot.day >= life - 1) { expired += lot.qty; spoilage += lot.qty * lot.cost; lot.qty = 0; }
    s.inventory = s.inventory.filter(l => l.qty > 0);
    const utility = Math.round((150 * s.outlets + produced * 7) * (s.upgrades.includes('process') ? .9 : 1) * (s.founder === 'operations' ? .85 : 1));
    const marketing = closed ? 0 : f.marketing;
    let interest = 0, loanPrincipal = 0;
    if (s.loan && s.loan.due <= s.day) { interest = s.loan.interest; loanPrincipal = s.loan.principal; s.loan = null; }
    const paid = rent(s) + wages(s) + utility + marketing + premium + interest;
    s.cash += revenue - paid - loanPrincipal;
    const expenses = ingredients + spoilage + paid + s.pending.expense;
    const profit = revenue - expenses;
    const repChange = closed ? -2 : (sold > 0 ? 2 : -1) + (s.plan.recipe === 'signature' && sold ? 1 : 0) - (lost > actualDemand * .35 ? 2 : 0) - (s.management === 'command' && employeeCount(s) ? 1 : 0) + (s.management === 'system' && sold ? 1 : 0);
    s.reputation = clamp(s.reputation + repChange, 0, 100);
    s.totalSold += sold; s.totalProfit += profit; s.streak = profit > 0 ? s.streak + 1 : 0; s.bestStreak = Math.max(s.bestStreak, s.streak);
    const report = { day: s.day, sold, demand: actualDemand, produced, waste, lost, expired, revenue, expenses, profit, cashFlow: s.cash - s.dayStartCash, opening: s.dayStartCash, closing: s.cash, ingredients, spoilage, premium, rent: rent(s), wages: wages(s), utilities: utility, marketing, other: s.pending.expense + interest, purchases: s.pending.purchases, capex: s.pending.capex, financing: s.pending.finance - loanPrincipal, stockValue: stockValue(s), repChange, closed };
    s.history.push(report); s.history = s.history.slice(-120);
    log(s, closed ? 'Точка закрыта на день. Аренда и зарплата начислены.' : `Продано ${sold} из ${produced}. Прибыль: ${profit} ₽.`, profit > 0 ? 'positive' : 'negative');
    if (profit > 0) earn(s, 'first'); if (s.totalSold >= 100) earn(s, 'hundred'); if (s.streak >= 5) earn(s, 'streak'); if (s.totalSold >= 1000) earn(s, 'thousand'); if (s.outlets === 2 && s.cash >= 75000) earn(s, 'season');
    s.effects = s.effects.map(e => ({ ...e, remaining: e.remaining - 1 })).filter(e => e.remaining > 0);
    s.day++; s.dayStartCash = s.cash; s.pending = { purchases: 0, capex: 0, expense: 0, finance: 0 };
    generateMarket(s);
    if (s.day % 3 === 0) s.event = Object.keys(EVENTS)[Math.floor(random(s) * Object.keys(EVENTS).length)];
    s.bankrupt = s.cash < 0;
    return report;
  }
  function stage(s) {
    if (s.outlets === 2) return { title: 'Маленькая сеть', color: 'orange', step: 4 };
    if (s.upgrades.includes('process') && employeeCount(s)) return { title: 'Система', color: 'blue', step: 3 };
    if (s.employees.manager || s.management === 'command' && employeeCount(s)) return { title: 'Руководитель', color: 'red', step: 2 };
    if (employeeCount(s)) return { title: 'Мини-команда', color: 'purple', step: 1 };
    return { title: 'Основатель', color: 'green', step: 0 };
  }
  function validate(s) {
    const n = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
    const int = (v, lo, hi) => Number.isInteger(v) && n(v, lo, hi);
    if (!s || s.version !== VERSION || !int(s.day, 1, 1000000) || !int(s.seed, 0, 4294967295) || !n(s.cash, -1e10, 1e12) || !n(s.dayStartCash, -1e10, 1e12) || !n(s.reputation, 0, 100) || ![1, 2].includes(s.outlets)) return false;
    if (!s.plan || !int(s.plan.price, 120, 420) || !int(s.plan.quantity, 1, 200) || ![0, 1, 2].includes(s.plan.marketing) || !['classic', 'signature'].includes(s.plan.recipe)) return false;
    if (!s.employees || Object.keys(STAFF).some(k => !int(s.employees[k], 0, STAFF[k].limit))) return false;
    if (!Array.isArray(s.upgrades) || new Set(s.upgrades).size !== s.upgrades.length || s.upgrades.some(k => !Object.hasOwn(UPGRADES, k))) return false;
    if (!['kitchen', 'growth', 'operations'].includes(s.founder) || !['family', 'command', 'system'].includes(s.management) || s.management === 'system' && !s.upgrades.includes('process')) return false;
    if (!Array.isArray(s.inventory) || s.inventory.length > 500 || s.inventory.some(l => !int(l.qty, 1, 500) || !int(l.cost, 1, 1000) || !int(l.day, 1, s.day)) || sumStock(s) > 500) return false;
    if (!s.pending || ['purchases', 'capex', 'expense'].some(k => !n(s.pending[k], 0, 1e12)) || !n(s.pending.finance, -1e12, 1e12)) return false;
    if (!Array.isArray(s.effects) || s.effects.length > 20 || s.effects.some(e => !int(e.remaining, 1, 10) || !n(e.traffic, -.9, 2) || !n(e.supply, -.9, 2) || !int(e.capacity, -100, 100))) return false;
    if (!s.market || !['sun', 'cloud', 'rain'].includes(s.market.icon) || !['Солнечно', 'Облачно', 'Дождь'].includes(s.market.weather) || !n(s.market.traffic, .1, 3) || !int(s.market.ingredient, 1, 1000) || !int(s.market.reference, 100, 500) || typeof s.market.weekend !== 'boolean' || typeof s.market.competitor !== 'boolean') return false;
    if (s.event !== null && !Object.hasOwn(EVENTS, s.event)) return false;
    if (typeof s.bankrupt !== 'boolean' || typeof s.rescueUsed !== 'boolean') return false;
    if (s.loan !== null && (!s.loan || s.loan.principal !== 12000 || s.loan.interest !== 1500 || !int(s.loan.due, 1, 1000000) || !s.rescueUsed)) return false;
    if (['totalSold', 'streak', 'bestStreak'].some(k => !int(s[k], 0, 1e12)) || !n(s.totalProfit, -1e12, 1e12)) return false;
    if (!Array.isArray(s.achievements) || s.achievements.length > 8 || s.achievements.some(k => !Object.hasOwn(ACHIEVEMENTS, k))) return false;
    if (!Array.isArray(s.history) || s.history.length > 120 || s.history.some(r => !r || !int(r.day, 1, s.day) || typeof r.closed !== 'boolean' || ['sold','demand','produced','waste','lost','expired','revenue','expenses','profit','cashFlow','opening','closing','ingredients','spoilage','premium','rent','wages','utilities','marketing','other','purchases','capex','financing','stockValue','repChange'].some(k => !n(r[k], -1e12, 1e12)))) return false;
    if (!Array.isArray(s.journal) || s.journal.length > 80 || s.journal.some(j => !j || !int(j.day, 1, s.day) || typeof j.text !== 'string' || j.text.length > 500 || !['info','positive','negative','achievement'].includes(j.kind))) return false;
    return true;
  }
  function serialize(s) { if (!validate(s)) throw Error('Сохранение не прошло проверку.'); return JSON.stringify({ game: 'predprinimatel', version: VERSION, state: s }); }
  function deserialize(text) { if (typeof text !== 'string' || text.length > 500000) throw Error('Файл слишком большой.'); let data; try { data = JSON.parse(text); } catch { throw Error('Это не JSON-сохранение.'); } if (data?.game !== 'predprinimatel' || data.version !== VERSION || !validate(data.state)) throw Error('Сохранение повреждено или имеет другую версию.'); return data.state; }
  return { VERSION, STAFF, UPGRADES, EVENTS, ACHIEVEMENTS, newGame, buy, hire, fire, upgrade, expand, expansionRequirements, resolveEvent, rescue, repay, setPlan, setPolicy, runDay, forecast, capacity, ingredientPrice, sumStock, stockValue, employeeCount, wages, rent, stage, validate, serialize, deserialize };
});
