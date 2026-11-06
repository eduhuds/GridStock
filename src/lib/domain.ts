export interface Part {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  min: number;
  baseMin: number;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  city: string;
  responsible: string;
  address: string;
}

export type TechColor = 'mint' | 'peach' | 'blue' | 'purple';
export type TechStatus = 'route' | 'working' | 'available' | 'offline';

export interface Technician {
  id: string;
  name: string;
  initials: string;
  color: TechColor;
  vehicle: string;
  region: string;
  status: TechStatus;
  order: string;
  client: string;
  address: string;
  checkedAt: number | null;
}

export interface SlotAddress {
  corridor: string;
  shelf: string;
}

export type MovementKind =
  | 'withdraw'
  | 'return'
  | 'use'
  | 'count'
  | 'arrival'
  | 'finish'
  | 'transfer'
  | 'stockout'
  | 'entry'
  | 'departure';

export interface Movement {
  id: string;
  kind: MovementKind;
  ts: number;
  technician?: string;
  part?: string;
  qty?: number;
  warehouse?: string;
  from?: string;
  to?: string;
  fromAddress?: SlotAddress;
  toAddress?: SlotAddress;
  order?: string;
  placement?: string;
  note?: string;
  operator?: string;
  before?: number;
  delta?: number;
}

export interface GridStockState {
  version: number;
  warehouses: Warehouse[];
  parts: Part[];
  technicians: Technician[];
  stock: Record<string, Record<string, number>>;
  locations: Record<string, Record<string, SlotAddress>>;
  movements: Movement[];
  used: number;
  seq: number;
  warehouseSeq: number;
  productSeq: number;
  techSeq: number;
  demo: Record<string, boolean>;
  updatedAt: number;
}

export interface AlertItem {
  loc: string;
  part: string;
  qty: number;
  min: number;
}

export const defaultParts: Part[] = [
  { id: 'p1', sku: 'GS-001', name: 'Conector RJ45 CAT6', category: 'Conectividade', unit: 'un.', min: 4, baseMin: 25 },
  { id: 'p2', sku: 'GS-002', name: 'ONU óptica XPON', category: 'Equipamentos', unit: 'un.', min: 2, baseMin: 15 },
  { id: 'p3', sku: 'GS-003', name: 'Roteador Wi-Fi 6', category: 'Equipamentos', unit: 'un.', min: 2, baseMin: 12 },
  { id: 'p4', sku: 'GS-004', name: 'Cordão óptico SC/APC', category: 'Fibra óptica', unit: 'un.', min: 3, baseMin: 20 },
  { id: 'p5', sku: 'GS-005', name: 'Fonte 12V / 1A', category: 'Elétrica', unit: 'un.', min: 2, baseMin: 12 },
  { id: 'p6', sku: 'GS-006', name: 'Splitter óptico 1:8', category: 'Fibra óptica', unit: 'un.', min: 1, baseMin: 10 },
  { id: 'p7', sku: 'GS-007', name: 'Conector óptico APC', category: 'Fibra óptica', unit: 'un.', min: 3, baseMin: 20 },
  { id: 'p8', sku: 'GS-008', name: 'Adaptador SC/APC', category: 'Fibra óptica', unit: 'un.', min: 2, baseMin: 12 },
];

const defaultTechnicians: Technician[] = [
  { id: 't1', name: 'Rafael Lima', initials: 'RL', color: 'mint', vehicle: 'V-012', region: 'Aldeota', status: 'route', order: 'OS-2048', client: 'Clínica Horizonte', address: 'Rua das Palmeiras, 240 · Aldeota', checkedAt: null },
  { id: 't2', name: 'Camila Santos', initials: 'CS', color: 'peach', vehicle: 'V-008', region: 'Meireles', status: 'working', order: 'OS-2046', client: 'Edifício Atlântico', address: 'Av. do Sol, 510 · Meireles', checkedAt: 80 },
  { id: 't3', name: 'Bruno Oliveira', initials: 'BO', color: 'blue', vehicle: 'V-015', region: 'Centro', status: 'available', order: 'OS-2051', client: 'Mercado Central', address: 'Rua do Comércio, 85 · Centro', checkedAt: null },
  { id: 't4', name: 'Juliana Rocha', initials: 'JR', color: 'purple', vehicle: 'V-003', region: 'Cocó', status: 'route', order: 'OS-2052', client: 'Escritório Boa Vista', address: 'Rua do Parque, 130 · Cocó', checkedAt: null },
  { id: 't5', name: 'Pedro Alves', initials: 'PA', color: 'mint', vehicle: 'V-019', region: 'Papicu', status: 'working', order: 'OS-2047', client: 'Residencial Jardim', address: 'Rua das Acácias, 60 · Papicu', checkedAt: 90 },
  { id: 't6', name: 'Ana Martins', initials: 'AM', color: 'peach', vehicle: 'V-021', region: 'Benfica', status: 'offline', order: 'OS-2055', client: 'Escola Nova Geração', address: 'Rua do Saber, 75 · Benfica', checkedAt: null },
];

export function emptyState(now = Date.now()): GridStockState {
  return {
    version: 2,
    warehouses: [],
    parts: [],
    technicians: [],
    stock: {},
    locations: {},
    movements: [],
    used: 0,
    seq: 0,
    warehouseSeq: 0,
    productSeq: 0,
    techSeq: 0,
    demo: {},
    updatedAt: now,
  };
}

export function seed(now = Date.now()): GridStockState {
  const stock: Record<string, Record<string, number>> = {};
  const balances: Record<string, number[]> = {
    base: [64, 42, 28, 36, 22, 18, 54, 26],
    t1: [8, 4, 2, 5, 1, 2, 6, 3],
    t2: [10, 3, 3, 4, 3, 1, 5, 4],
    t3: [12, 5, 4, 6, 4, 2, 8, 4],
    t4: [3, 4, 2, 5, 2, 1, 4, 3],
    t5: [8, 1, 1, 4, 3, 2, 5, 2],
    t6: [6, 3, 2, 2, 3, 1, 4, 3],
  };
  for (const [loc, qs] of Object.entries(balances)) {
    stock[loc] = Object.fromEntries(defaultParts.map((p, i) => [p.id, qs[i]]));
  }
  const ts: Technician[] = defaultTechnicians.map(t => ({
    ...t,
    checkedAt: t.checkedAt ? now - t.checkedAt * 60000 : null,
  }));
  const movements: Movement[] = [
    { id: 'MOV-0108', kind: 'use', technician: 't2', part: 'p2', qty: 1, order: 'OS-2046', placement: 'Edifício Atlântico · apartamento 302', note: 'Substituição da ONU', ts: now - 8 * 60000 },
    { id: 'MOV-0107', kind: 'withdraw', technician: 't1', part: 'p1', qty: 4, note: 'Reposição para a rota da manhã', ts: now - 23 * 60000 },
    { id: 'MOV-0106', kind: 'arrival', technician: 't5', qty: 0, order: 'OS-2047', placement: 'Residencial Jardim', note: 'Chegada registrada pelo técnico', ts: now - 90 * 60000 },
    { id: 'MOV-0105', kind: 'return', technician: 't3', part: 'p3', qty: 1, note: 'Peça não utilizada, em boas condições', ts: now - 48 * 60000 },
    { id: 'MOV-0104', kind: 'use', technician: 't5', part: 'p4', qty: 2, order: 'OS-2047', placement: 'Residencial Jardim · bloco B', note: 'Instalação de ponto óptico', ts: now - 57 * 60000 },
    { id: 'MOV-0103', kind: 'withdraw', technician: 't4', part: 'p5', qty: 2, note: 'Retirada na base Centro', ts: now - 70 * 60000 },
    { id: 'MOV-0102', kind: 'arrival', technician: 't2', qty: 0, order: 'OS-2046', placement: 'Edifício Atlântico', note: 'Chegada registrada pelo técnico', ts: now - 80 * 60000 },
    { id: 'MOV-0101', kind: 'withdraw', technician: 't3', part: 'p2', qty: 3, note: 'Abastecimento do veículo V-015', ts: now - 105 * 60000 },
  ];
  return upgrade({
    version: 1,
    stock,
    technicians: ts,
    movements: movements.sort((a, b) => b.ts - a.ts),
    used: 23,
    seq: 108,
    demo: {},
    updatedAt: now,
  });
}

export function upgrade(input: Partial<GridStockState> & { version: number }): GridStockState {
  if (input.version === 2) {
    const s = input as GridStockState;
    if (s.techSeq === undefined) s.techSeq = s.technicians ? s.technicians.length : 0;
    return s;
  }
  if (input.version !== 1) throw new Error('Versão não reconhecida.');
  const s = JSON.parse(JSON.stringify(input)) as GridStockState;
  s.version = 2;
  s.parts = defaultParts.map(p => ({ ...p }));
  s.warehouseSeq = 2;
  s.productSeq = defaultParts.length;
  s.techSeq = s.technicians.length;
  s.warehouses = [
    { id: 'base', code: 'CTR', name: 'Base Centro', city: 'Fortaleza, CE', responsible: 'Marina Costa', address: 'Rua do Estoque, 100 · Centro' },
    { id: 'w2', code: 'MES', name: 'Base Messejana', city: 'Fortaleza, CE', responsible: 'Lucas Ferreira', address: 'Av. das Oficinas, 420 · Messejana' },
  ];
  s.stock.w2 = Object.fromEntries(s.parts.map(p => [p.id, 0]));
  s.locations = {
    base: Object.fromEntries(
      s.parts.map((p, i) => [
        p.id,
        {
          corridor: String(Math.floor(i / 3) + 1).padStart(2, '0'),
          shelf: String((i % 3) + 1).padStart(2, '0'),
        },
      ])
    ),
    w2: {},
  };
  s.movements.forEach(m => {
    if (['withdraw', 'return'].includes(m.kind)) m.warehouse = 'base';
  });
  return s;
}

function clean(value: unknown, max = 300): string {
  return String(value ?? '').trim().slice(0, max);
}

function code(value: unknown): string {
  return clean(value, 50).normalize('NFKC').toUpperCase();
}

function integer(value: unknown, zero = false): number {
  const n = Number(value);
  if (value === '' || value === null || value === undefined || !Number.isSafeInteger(n) || n < (zero ? 0 : 1)) {
    throw new Error('Informe uma quantidade inteira válida.');
  }
  return n;
}

function warehouse(s: GridStockState, id: unknown): Warehouse {
  const w = s.warehouses.find(x => x.id === id);
  if (!w) throw new Error('Selecione um estoque válido.');
  return w;
}

function location(a: { corridor?: unknown; shelf?: unknown }): SlotAddress {
  const corridor = code(a.corridor);
  const shelf = code(a.shelf);
  if (!corridor || !shelf) throw new Error('Informe o corredor e a prateleira do produto.');
  return { corridor, shelf };
}

function updated(s: GridStockState, now: number): void {
  s.updatedAt = Math.max(now, s.updatedAt + 1);
}

function record(s: GridStockState, event: Omit<Movement, 'id' | 'ts'>, now: number): Movement {
  const fullEvent: Movement = {
    ...event,
    id: `MOV-${String(++s.seq).padStart(4, '0')}`,
    ts: now,
  };
  s.movements.unshift(fullEvent);
  s.demo[fullEvent.kind] = true;
  updated(s, now);
  return fullEvent;
}

export function saveWarehouse(s: GridStockState, a: Record<string, unknown>, now = Date.now()): Warehouse {
  const editing = Boolean(a.id);
  const existing = editing ? s.warehouses.find(w => w.id === a.id) : null;
  if (editing && !existing) throw new Error('Estoque não encontrado.');
  const name = clean(a.name, 80);
  const idCode = code(a.code);
  const city = clean(a.city, 100);
  const responsible = clean(a.responsible, 100);
  const address = clean(a.address, 180);
  if (!name || !idCode || !city || !responsible) {
    throw new Error('Preencha nome, código, cidade e responsável pelo estoque.');
  }
  if (!/^[A-Z0-9-]{2,12}$/.test(idCode)) {
    throw new Error('O código deve ter de 2 a 12 letras, números ou hífens.');
  }
  if (s.warehouses.some(w => w.id !== a.id && code(w.code) === idCode)) {
    throw new Error('Já existe um estoque com este código.');
  }
  if (s.warehouses.some(w => w.id !== a.id && code(w.name) === code(name))) {
    throw new Error('Já existe um estoque com este nome.');
  }
  if (editing && existing) {
    Object.assign(existing, { code: idCode, name, city, responsible, address });
    updated(s, now);
    return existing;
  }
  const w: Warehouse = { id: `w${++s.warehouseSeq}`, code: idCode, name, city, responsible, address };
  s.warehouses.push(w);
  s.stock[w.id] = Object.fromEntries(s.parts.map(p => [p.id, 0]));
  s.locations[w.id] = {};
  updated(s, now);
  return w;
}

export function deleteWarehouse(s: GridStockState, id: string, now = Date.now()): boolean {
  const idx = s.warehouses.findIndex(w => w.id === id);
  if (idx === -1) throw new Error('Estoque não encontrado.');
  if (total(s, id) > 0) {
    throw new Error('Não é possível excluir um estoque com peças armazenadas. Transfira ou zere o saldo antes de excluir.');
  }
  s.warehouses.splice(idx, 1);
  delete s.stock[id];
  delete s.locations[id];
  updated(s, now);
  return true;
}

export function saveProduct(s: GridStockState, a: Record<string, unknown>, now = Date.now()): Part {
  const editing = Boolean(a.id);
  const existing = editing ? s.parts.find(p => p.id === a.id) : null;
  if (editing && !existing) throw new Error('Produto não encontrado.');
  const sku = code(a.sku);
  const name = clean(a.name, 100);
  const category = clean(a.category, 60);
  const baseMin = integer(a.baseMin, true);
  const min = integer(a.min ?? 0, true);
  const w = warehouse(s, a.warehouse);
  const slot = location(a);
  const operator = clean(a.operator, 100) || 'Controle Operacional';
  if (!sku || !name || !category) throw new Error('Preencha código, nome e categoria do produto.');
  if (s.parts.some(p => p.id !== a.id && code(p.sku) === sku)) {
    throw new Error('Já existe um produto com este código.');
  }
  const qty = editing ? 0 : integer(a.qty, true);
  let p: Part;
  if (editing && existing) {
    p = existing;
    Object.assign(p, { sku, name, category, baseMin, min });
  } else {
    p = { id: `p${++s.productSeq}`, sku, name, category, baseMin, min, unit: 'un.' };
    s.parts.push(p);
    Object.values(s.stock).forEach(st => {
      st[p.id] = 0;
    });
    s.stock[w.id][p.id] = qty;
  }
  if (!s.locations[w.id]) s.locations[w.id] = {};
  s.locations[w.id][p.id] = slot;
  if (!editing && qty > 0) {
    record(
      s,
      {
        kind: 'entry',
        part: p.id,
        qty,
        warehouse: w.id,
        toAddress: { ...slot },
        note: 'Saldo inicial no cadastro do produto',
        operator,
      },
      now
    );
  } else {
    updated(s, now);
  }
  return p;
}

export function deleteProduct(s: GridStockState, id: string, now = Date.now()): boolean {
  const idx = s.parts.findIndex(p => p.id === id);
  if (idx === -1) throw new Error('Produto não encontrado.');
  const qty = Object.values(s.stock).reduce((sum, st) => sum + (st[id] || 0), 0);
  if (qty > 0) {
    throw new Error(`Não é possível excluir este produto pois ainda existem ${qty} unidades no estoque ou em campo.`);
  }
  s.parts.splice(idx, 1);
  Object.values(s.stock).forEach(st => {
    delete st[id];
  });
  Object.values(s.locations).forEach(loc => {
    delete loc[id];
  });
  updated(s, now);
  return true;
}

function initialsFromName(name: string): string {
  const words = clean(name, 80).split(/\s+/).filter(Boolean);
  if (!words.length) return 'TC';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export interface TechLoadItem {
  part: string;
  qty: number;
}

export interface InlineNewPart {
  sku: string;
  name: string;
  category?: string;
  corridor?: string;
  shelf?: string;
  baseQty: number;
  techQty: number;
}

export function saveTechnician(s: GridStockState, a: Record<string, unknown>, now = Date.now()): Technician {
  const editing = Boolean(a.id);
  const existing = editing ? s.technicians.find(t => t.id === a.id) : null;
  if (editing && !existing) throw new Error('Técnico não encontrado.');

  const name = clean(a.name, 80);
  if (!name) throw new Error('Informe o nome completo do técnico.');
  if (s.technicians.some(t => t.id !== a.id && code(t.name) === code(name))) {
    throw new Error('Já existe um técnico cadastrado com este nome.');
  }

  const selectedWh = a.warehouse ? s.warehouses.find(w => w.id === a.warehouse) : s.warehouses[0];
  const order = clean(a.order, 100) || existing?.order || 'Rota do dia';
  const vehicle = clean(a.vehicle, 40) || existing?.vehicle || (selectedWh ? selectedWh.code : 'CAMPO');
  const region = clean(a.region, 60) || existing?.region || (selectedWh ? selectedWh.name : 'Operação');
  const client = clean(a.client, 130) || existing?.client || order;
  const address = clean(a.address, 180) || existing?.address || region;

  const validColors: TechColor[] = ['mint', 'peach', 'blue', 'purple'];
  const color = validColors.includes(a.color as TechColor)
    ? (a.color as TechColor)
    : existing?.color || validColors[s.technicians.length % validColors.length];

  const loadItems: TechLoadItem[] = Array.isArray(a.load)
    ? (a.load as TechLoadItem[])
      .map(item => ({ part: String(item.part || ''), qty: Number(item.qty || 0) }))
      .filter(item => item.part && item.qty > 0)
    : [];

  const newParts: InlineNewPart[] = Array.isArray(a.newParts)
    ? (a.newParts as InlineNewPart[]).filter(np => clean(np.sku) && clean(np.name))
    : [];

  // Validate load items and newParts before mutating state
  if ((loadItems.length > 0 || newParts.length > 0) && !selectedWh) {
    throw new Error('Cadastre ou selecione um estoque base para retirar as peças do técnico.');
  }

  for (const item of loadItems) {
    if (!Number.isSafeInteger(item.qty) || item.qty < 1) {
      throw new Error('Informe uma quantidade inteira válida para as peças da saída.');
    }
    const p = s.parts.find(x => x.id === item.part);
    if (!p) throw new Error('Peça selecionada não encontrada.');
    const available = s.stock[selectedWh!.id]?.[p.id] ?? 0;
    if (item.qty > available) {
      throw new Error(`O estoque "${selectedWh!.name}" possui apenas ${available} un. de "${p.name}".`);
    }
  }

  for (const np of newParts) {
    const baseQty = integer(np.baseQty, true);
    const techQty = integer(np.techQty ?? 0, true);
    if (techQty > baseQty) {
      throw new Error(`A quantidade levada pelo técnico em "${clean(np.name)}" não pode ser maior que o saldo inicial (${baseQty}).`);
    }
    const skuCode = code(np.sku);
    if (s.parts.some(p => code(p.sku) === skuCode)) {
      throw new Error(`Já existe um produto com o código "${skuCode}".`);
    }
  }

  const hasLoad = loadItems.length > 0 || newParts.some(np => Number(np.techQty) > 0);
  const validStatuses: TechStatus[] = ['route', 'working', 'available', 'offline'];
  const status = validStatuses.includes(a.status as TechStatus)
    ? (a.status as TechStatus)
    : existing?.status || (hasLoad || clean(a.order) ? 'route' : 'available');

  const initials = clean(a.initials, 4).toUpperCase() || initialsFromName(name);
  const operator = clean(a.operator, 100) || 'Controle Operacional';

  let techRecord: Technician;
  if (editing && existing) {
    const checkedAt = status === 'working' ? existing.checkedAt || now : null;
    Object.assign(existing, { name, initials, color, vehicle, region, status, order, client, address, checkedAt });
    techRecord = existing;
    updated(s, now);
  } else {
    s.techSeq = Math.max(s.techSeq || 0, s.technicians.length);
    let id = `t${++s.techSeq}`;
    while (s.technicians.some(t => t.id === id)) id = `t${++s.techSeq}`;
    techRecord = {
      id,
      name,
      initials,
      color,
      vehicle,
      region,
      status,
      order,
      client,
      address,
      checkedAt: status === 'working' ? now : null,
    };
    s.technicians.push(techRecord);
    s.stock[techRecord.id] = Object.fromEntries(s.parts.map(p => [p.id, 0]));
    updated(s, now);
  }

  // Register any inline new products first
  for (const np of newParts) {
    const createdPart = saveProduct(
      s,
      {
        sku: np.sku,
        name: np.name,
        category: clean(np.category, 60) || 'Campo',
        warehouse: selectedWh!.id,
        corridor: clean(np.corridor, 40) || '01',
        shelf: clean(np.shelf, 40) || '01',
        baseMin: 2,
        min: 1,
        qty: Number(np.baseQty) || 0,
        operator,
      },
      now
    );
    const takeQty = Number(np.techQty) || 0;
    if (takeQty > 0) {
      apply(
        s,
        {
          kind: 'withdraw',
          warehouse: selectedWh!.id,
          technician: techRecord.id,
          part: createdPart.id,
          qty: takeQty,
          note: `Saída do dia · ${order}`,
          operator,
        },
        now
      );
    }
  }

  // Apply day load withdrawals for existing catalog parts
  for (const item of loadItems) {
    apply(
      s,
      {
        kind: 'withdraw',
        warehouse: selectedWh!.id,
        technician: techRecord.id,
        part: item.part,
        qty: item.qty,
        note: `Saída do dia · ${order}`,
        operator,
      },
      now
    );
  }

  return techRecord;
}

export function deleteTechnician(s: GridStockState, id: string, now = Date.now()): boolean {
  const idx = s.technicians.findIndex(t => t.id === id);
  if (idx === -1) throw new Error('Técnico não encontrado.');
  if (total(s, id) > 0) {
    throw new Error('Não é possível excluir um técnico que possui peças no veículo. Devolva ou zere o saldo antes de excluir.');
  }
  s.technicians.splice(idx, 1);
  delete s.stock[id];
  updated(s, now);
  return true;
}

export function apply(s: GridStockState, a: Record<string, unknown>, now = Date.now()): Movement {
  const kind = a.kind as MovementKind;
  if (kind === 'stockout') {
    const w = warehouse(s, a.warehouse);
    const p = s.parts.find(x => x.id === a.part);
    const qty = integer(a.qty);
    const note = clean(a.note);
    if (!p) throw new Error('Selecione um produto válido.');
    if (!note) throw new Error('Informe o motivo da saída.');
    const before = s.stock[w.id]?.[p.id] || 0;
    if (qty > before) throw new Error(`O estoque possui apenas ${before} unidades disponíveis.`);
    s.stock[w.id][p.id] = before - qty;
    return record(s, { kind, warehouse: w.id, part: p.id, qty, before, delta: -qty, note, operator: clean(a.operator, 100) || 'Operação' }, now);
  }
  if (kind === 'entry') {
    const w = warehouse(s, a.warehouse);
    const p = s.parts.find(x => x.id === a.part);
    const qty = integer(a.qty);
    const note = clean(a.note) || 'Entrada de estoque';
    const operator = clean(a.operator, 100) || 'Controle Operacional';
    if (!p) throw new Error('Selecione uma peça válida.');
    const current = s.stock[w.id]?.[p.id] || 0;
    if (!Number.isSafeInteger(current + qty)) throw new Error('A quantidade ultrapassa o limite permitido.');
    const hasSlotInput = clean(a.corridor) && clean(a.shelf);
    const toAddress = hasSlotInput ? location(a) : s.locations[w.id]?.[p.id] || location(a);
    if (!s.stock[w.id]) s.stock[w.id] = {};
    if (!s.locations[w.id]) s.locations[w.id] = {};
    s.stock[w.id][p.id] = current + qty;
    s.locations[w.id][p.id] = { ...toAddress };
    return record(
      s,
      { kind: 'entry', part: p.id, qty, warehouse: w.id, toAddress: { ...toAddress }, note, operator },
      now
    );
  }

  if (kind === 'transfer') {
    const from = warehouse(s, a.from);
    const to = warehouse(s, a.to);
    const p = s.parts.find(x => x.id === a.part);
    const qty = integer(a.qty);
    const note = clean(a.note);
    const operator = clean(a.operator, 100) || 'Controle Operacional';
    if (from.id === to.id) throw new Error('Selecione estoques de origem e destino diferentes.');
    if (!p) throw new Error('Selecione uma peça válida.');
    if (!note) throw new Error('Informe o motivo da transferência.');
    const source = s.stock[from.id]?.[p.id] || 0;
    const destination = s.stock[to.id]?.[p.id] || 0;
    if (qty > source) throw new Error(`O estoque de origem possui apenas ${source} unidades disponíveis.`);
    if (!Number.isSafeInteger(destination + qty)) throw new Error('A quantidade ultrapassa o limite permitido.');
    const fromAddress = s.locations[from.id]?.[p.id];
    if (!fromAddress) throw new Error('Cadastre o endereço do produto no estoque de origem.');
    const toAddress = s.locations[to.id]?.[p.id] || location(a);
    s.stock[from.id][p.id] -= qty;
    s.stock[to.id][p.id] = destination + qty;
    if (!s.locations[to.id]) s.locations[to.id] = {};
    s.locations[to.id][p.id] = { ...toAddress };
    return record(
      s,
      {
        kind: 'transfer',
        part: p.id,
        qty,
        from: from.id,
        to: to.id,
        fromAddress: { ...fromAddress },
        toAddress: { ...toAddress },
        note,
        operator,
      },
      now
    );
  }

  const t = s.technicians.find(x => x.id === a.technician);
  if (!t) throw new Error('Selecione um técnico válido.');
  const event: Omit<Movement, 'id' | 'ts'> = { kind, technician: t.id, note: clean(a.note), operator: clean(a.operator, 100) || t.name };

  if (kind === 'arrival') {
    if (t.status === 'working') throw new Error('A chegada neste atendimento já foi registrada.');
    if (!clean(a.order) || !clean(a.placement)) throw new Error('Informe a OS e o local de chegada.');
    event.order = clean(a.order);
    event.placement = clean(a.placement);
    t.status = 'working';
    t.checkedAt = now;
    t.order = event.order;
    t.client = event.placement;
  } else if (kind === 'finish') {
    if (t.status !== 'working') throw new Error('Registre a chegada antes de concluir o atendimento.');
    event.order = t.order;
    event.placement = t.client;
    t.status = 'available';
  } else {
    const p = s.parts.find(x => x.id === a.part);
    if (!p) throw new Error('Selecione uma peça válida.');
    const qty = integer(a.qty, kind === 'count' || kind === 'departure');
    const own = s.stock[t.id]?.[p.id] || 0;
    event.part = p.id;
    event.qty = qty;
    if (['withdraw', 'return'].includes(kind)) {
      const w = warehouse(s, a.warehouse || s.warehouses[0]?.id || 'base');
      const slot = s.locations[w.id]?.[p.id];
      const base = s.stock[w.id]?.[p.id] || 0;
      if (!slot) throw new Error('Cadastre corredor e prateleira deste produto no estoque escolhido.');
      event.warehouse = w.id;
      if (kind === 'withdraw') {
        if (qty > base) throw new Error(`A base possui apenas ${base} unidades disponíveis.`);
        if (!Number.isSafeInteger(own + qty)) throw new Error('A quantidade ultrapassa o limite permitido.');
        event.fromAddress = { ...slot };
        s.stock[w.id][p.id] -= qty;
        s.stock[t.id][p.id] = own + qty;
      } else {
        if (qty > own) throw new Error(`O técnico possui apenas ${own} unidades disponíveis.`);
        if (!event.note) throw new Error('Informe o motivo da devolução.');
        if (!Number.isSafeInteger(base + qty)) throw new Error('A quantidade ultrapassa o limite permitido.');
        event.toAddress = { ...slot };
        s.stock[t.id][p.id] -= qty;
        s.stock[w.id][p.id] = base + qty;
      }
    } else if (kind === 'use') {
      if (qty > own) throw new Error(`O técnico possui apenas ${own} unidades disponíveis.`);
      if (!clean(a.placement)) throw new Error('Informe ou ative a localização de onde a peça foi utilizada.');
      event.order = clean(a.order) || t.order || 'Campo';
      event.placement = clean(a.placement);
      t.client = event.placement;
      t.checkedAt = now;
      s.stock[t.id][p.id] -= qty;
      s.used += qty;
    } else if (kind === 'departure') {
      if (qty > own) throw new Error(`Seu estoque possui apenas ${own} unidades disponíveis.`);
      event.order = clean(a.order) || t.order;
    } else if (kind === 'count') {
      if (!event.note) throw new Error('Informe uma justificativa para o ajuste de contagem.');
      if (qty === own) throw new Error('A contagem informada é igual ao saldo atual.');
      event.before = own;
      event.delta = qty - own;
      s.stock[t.id][p.id] = qty;
    } else {
      throw new Error('Operação inválida.');
    }
  }
  return record(s, event, now);
}

export function total(s: GridStockState, loc: string): number {
  return Object.values(s.stock[loc] || {}).reduce((a, b) => a + b, 0);
}

export function alerts(s: GridStockState): AlertItem[] {
  return Object.entries(s.stock).flatMap(([loc, st]) =>
    s.parts
      .filter(p => {
        const isWh = s.warehouses.some(w => w.id === loc);
        return (!isWh || s.locations[loc]?.[p.id]) && (st[p.id] || 0) < (isWh ? p.baseMin : p.min);
      })
      .map(p => {
        const isWh = s.warehouses.some(w => w.id === loc);
        return {
          loc,
          part: p.id,
          qty: st[p.id] || 0,
          min: isWh ? p.baseMin : p.min,
        };
      })
  );
}
