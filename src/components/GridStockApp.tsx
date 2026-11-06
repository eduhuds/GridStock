'use client';

import StockWorkspace from './StockWorkspace';
import { defaultConfig, type CompanyConfig } from '@/lib/companyConfig';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  GridStockState,
  Part,
  Technician,
  Movement,
  MovementKind,
  SlotAddress,
  TechColor,
  TechStatus,
  emptyState,
  total as calcTotal,
  alerts as calcAlerts,
} from '@/lib/domain';
import type { UserAccount } from '@/lib/db';
import DashboardCharts from './DashboardCharts';

const iconPaths: Record<string, string> = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.4"/><rect x="14" y="3" width="7" height="7" rx="1.4"/><rect x="3" y="14" width="7" height="7" rx="1.4"/><rect x="14" y="14" width="7" height="7" rx="1.4"/>',
  box: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="M3 8v9l9 5 9-5V8M12 13v9M7.5 5.5l9 5"/>',
  arrows: '<path d="M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  shield: '<path d="M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4Z"/><path d="m8 12 3 3 5-6"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  alert: '<path d="m10.3 4-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3l-8-14a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
  reset: '<path d="M3 10a9 9 0 1 1 1 8M3 4v6h6"/>',
  help: '<rect x="4" y="3" width="16" height="19" rx="2"/><path d="M9 3v5h6V3M8 13h8M8 17h5"/>',
  van: '<path d="M3 5h11v12H3zM14 9h4l3 4v4h-7"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="18" r="2.5"/>',
  out: '<path d="M12 3v12m-4-4 4 4 4-4M4 15v6h16v-6"/>',
  in: '<path d="M12 16V4m-4 4 4-4 4 4M4 15v6h16v-6"/>',
  tool: '<path d="M14.7 6.3a5.5 5.5 0 0 0-7-2.8l3.1 3.1-3.7 3.7L4 7.2a5.5 5.5 0 0 0 7.1 7.1l7 7a2 2 0 0 0 2.8-2.8l-7-7a5.5 5.5 0 0 0 .8-5.2Z"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  edit: '<path d="m16 3 5 5-12 12-6 1 1-6L16 3ZM13 6l5 5"/>',
  route: '<circle cx="6" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="M8 5h7a4 4 0 0 1 0 8H9a3 3 0 0 0 0 6h7"/>',
  logout: '<path d="M9 21H4V3h5M13 8l5 4-5 4M9 12h12"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2m-9 0v14h10V6"/>',
};

function Icon({ name }: { name: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      dangerouslySetInnerHTML={{ __html: iconPaths[name] || iconPaths.box }}
    />
  );
}

function Badge({ label, color = '', dot = false }: { label: string; color?: string; dot?: boolean }) {
  return (
    <span className={`badge ${color}`}>
      {dot && <i className="dot" />}
      {label}
    </span>
  );
}

const statusMap: Record<TechStatus, [string, string]> = {
  route: ['Com carga do dia', 'blue'],
  working: ['Em campo', 'green'],
  available: ['Disponível', 'amber'],
  offline: ['Fora de turno', ''],
};

function parsePlacementGps(raw?: string | null): { text: string; coords: string | null; mapUrl: string | null } {
  if (!raw) return { text: '—', coords: null, mapUrl: null };
  const match = raw.match(/\[GPS:\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\]/i);
  if (!match) return { text: raw, coords: null, mapUrl: null };
  const lat = match[1];
  const lng = match[2];
  const cleanText = raw.replace(match[0], '').replace(/[·\s]+$/, '').trim() || `Lat ${lat}, Lng ${lng}`;
  return {
    text: cleanText,
    coords: `${lat}, ${lng}`,
    mapUrl: `https://www.google.com/maps?q=${lat},${lng}`,
  };
}

const kindMap: Record<MovementKind, [string, string, string]> = {
  stockout: ['Saída de estoque', 'amber', 'out'],
  withdraw: ['Retirada', 'green', 'out'],
  return: ['Devolução', 'blue', 'in'],
  use: ['Utilização', 'amber', 'tool'],
  count: ['Ajuste', 'purple', 'edit'],
  arrival: ['Chegada', 'green', 'pin'],
  finish: ['Conclusão', '', 'check'],
  transfer: ['Transferência', 'purple', 'arrows'],
  entry: ['Entrada de estoque', 'green', 'box'],
  departure: ['Saída do dia', 'blue', 'van'],
};

type PageId = 'overview' | 'warehouses' | 'stock' | 'products' | 'movements' | 'team';

type ModalState =
  | null
  | { type: 'movement'; kind: MovementKind; techId: string; partId: string; warehouseId: string }
  | { type: 'arrival'; techId: string; returnToUsePartId?: string }
  | { type: 'finish'; techId: string }
  | { type: 'detail'; techId: string }
  | { type: 'warehouse'; warehouseId?: string }
  | { type: 'product'; partId?: string }
  | { type: 'tech'; techId?: string }
  | { type: 'transfer'; fromId: string; toId: string; partId: string }
  | { type: 'system' }
  | { type: 'reset'; mode: 'seed' | 'empty' };

export default function GridStockApp({ entryRole = 'ops', company }: { entryRole?: 'ops' | 'tech'; company?: { slug: string; name: string; color: string; tagline: string; config: CompanyConfig } }) {
  const [companyConfig, setCompanyConfig] = useState<CompanyConfig>(company?.config || defaultConfig);
  const companySlug = company?.slug || '';
  const companyBase = companySlug ? `/empresa/${companySlug}` : '';
  useEffect(() => {
    if (!company) return;
    document.documentElement.style.setProperty('--green', company.color);
    document.title = `${company.name} · GRIDSTOCK`;
    return () => { document.documentElement.style.removeProperty('--green'); };
  }, [company]);
  const TOKEN_KEY = (entryRole === 'tech' ? 'gridstock-tech-auth-token' : 'gridstock-auth-token') + (companySlug ? `:${companySlug}` : '');
  const [state, setState] = useState<GridStockState>(() => emptyState());
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [authToken, setAuthToken] = useState<string>('');
  const [booting, setBooting] = useState<boolean>(true);

  const [view, setView] = useState<'ops' | 'tech'>('ops');
  const [page, setPage] = useState<PageId>('overview');
  const [techId, setTechId] = useState<string>('t1');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  const [query, setQuery] = useState<string>('');
  const [filterKind, setFilterKind] = useState<string>('');
  const [filterTech, setFilterTech] = useState<string>('');
  const [filterLoc, setFilterLoc] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [lowOnly, setLowOnly] = useState<boolean>(false);

  const [modal, setModal] = useState<ModalState>(null);
  const [formError, setFormError] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<string>('');
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Login states
  const [loginUser, setLoginUser] = useState<string>('');
  const [loginPass, setLoginPass] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [loginLoading, setLoginLoading] = useState<boolean>(false);
  const [companyChoices, setCompanyChoices] = useState<{ slug: string; name: string; color: string; token: string }[]>([]);

  // Dynamic modal form states
  const [moveTechId, setMoveTechId] = useState<string>('');
  const [movePartId, setMovePartId] = useState<string>('');
  const [moveWarehouseId, setMoveWarehouseId] = useState<string>('');
  const [moveQty, setMoveQty] = useState<number>(1);
  const [moveOrder, setMoveOrder] = useState<string>('');
  const [moveSite, setMoveSite] = useState<string>('');
  const [movePlacement, setMovePlacement] = useState<string>('');
  const [moveNote, setMoveNote] = useState<string>('');
  const [moveCorridor, setMoveCorridor] = useState<string>('');
  const [moveShelf, setMoveShelf] = useState<string>('');

  // Product modal warehouse selection
  const [prodWarehouseId, setProdWarehouseId] = useState<string>('');
  const [prodCorridor, setProdCorridor] = useState<string>('');
  const [prodShelf, setProdShelf] = useState<string>('');

  // Transfer modal state
  const [trFrom, setTrFrom] = useState<string>('');
  const [trTo, setTrTo] = useState<string>('');
  const [trPart, setTrPart] = useState<string>('');
  const [trQty, setTrQty] = useState<number>(1);
  const [trCorridor, setTrCorridor] = useState<string>('');
  const [trShelf, setTrShelf] = useState<string>('');
  const [trNote, setTrNote] = useState<string>('');

  // System user form state
  const [sysRole, setSysRole] = useState<'ops' | 'tech'>('ops');
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<UserAccount | null>(null);

  // Geolocation state for technician part usage
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [geoError, setGeoError] = useState<string>('');

  const captureGeolocation = useCallback(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setGeoStatus('error');
      setGeoError('Geolocalização não suportada neste navegador.');
      return;
    }
    setGeoStatus('loading');
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const accuracy = Math.round(pos.coords.accuracy || 0);
        setGeoCoords({ lat, lng, accuracy });
        setGeoStatus('success');
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
            { headers: { 'Accept-Language': 'pt-BR' } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data?.address || {};
            const road = addr.road || addr.pedestrian || addr.suburb || '';
            const house = addr.house_number ? `, ${addr.house_number}` : '';
            const suburb = addr.suburb || addr.neighbourhood || addr.city_district || '';
            const city = addr.city || addr.town || addr.municipality || '';
            const formatted = [
              road ? `${road}${house}` : '',
              suburb,
              city,
            ]
              .filter(Boolean)
              .join(' - ');
            if (formatted) {
              setMoveSite(formatted.slice(0, 130));
              return;
            }
          }
        } catch {
          // Fallback to coordinates if reverse geocoding is offline
        }
        setMoveSite(prev => (prev && prev !== 'Rota do dia' ? prev : `Localização GPS (${lat}, ${lng})`));
      },
      err => {
        setGeoStatus('error');
        setGeoError(
          err.code === 1
            ? 'Permissão de localização negada. Ative o GPS no navegador ou preencha o local manualmente.'
            : 'Não foi possível capturar o sinal de GPS automaticamente. Informe o local abaixo.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMsg(''), 4200);
  }, []);

  const clearFilters = useCallback(() => {
    setQuery('');
    setFilterKind('');
    setFilterTech('');
    setFilterLoc('');
    setFilterCategory('');
    setLowOnly(false);
  }, []);

  const applyServerPayload = useCallback(
    (data: { token?: string; user?: UserAccount; state?: GridStockState; users?: UserAccount[]; config?: CompanyConfig }) => {
      if (data.config) setCompanyConfig(data.config);
      if (data.token) {
        setAuthToken(data.token);
        localStorage.setItem(TOKEN_KEY, data.token);
      }
      if (data.user) {
        setCurrentUser(prev => {
          if (!prev || data.token || prev.id === data.user!.id) {
            if (data.user!.role === 'tech') {
              setView('tech');
              if (data.user!.technicianId) setTechId(data.user!.technicianId);
            }
            return data.user!;
          }
          return prev;
        });
      }
      if (data.state) {
        setState(data.state);
        if (data.state.technicians.length > 0) {
          setTechId(prev =>
            data.state!.technicians.some(t => t.id === prev) ? prev : data.state!.technicians[0].id
          );
        }
      }
      if (data.users) {
        setUsers(data.users);
      }
    },
    [TOKEN_KEY]
  );

  const apiCall = useCallback(
    async (method: string, url: string, body?: unknown, customToken?: string) => {
      const tk = customToken ?? authToken;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (companySlug) headers['X-Gridstock-Company'] = companySlug;
      if (tk) headers['Authorization'] = `Bearer ${tk}`;
      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 && url !== '/api/auth/login') {
        setAuthToken('');
        localStorage.removeItem(TOKEN_KEY);
        setCurrentUser(null);
        throw new Error(data.error || 'Sessão expirada. Faça login novamente.');
      }
      if (!res.ok) {
        throw new Error(data.error || 'Não foi possível concluir a operação.');
      }
      return data;
    },
    [authToken, TOKEN_KEY, companySlug]
  );

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY) || '';
    setAuthToken(savedToken);
    fetch('/api/bootstrap', {
      headers: { ...(savedToken ? { Authorization: `Bearer ${savedToken}` } : {}), ...(companySlug ? { 'X-Gridstock-Company': companySlug } : {}) },
    })
      .then(async res => {
        if (res.ok) {
          const data = await res.json();
          if (data.user.role === entryRole) applyServerPayload(data);
          else localStorage.removeItem(TOKEN_KEY);
        } else {
          localStorage.removeItem(TOKEN_KEY);
          setAuthToken('');
          setCurrentUser(null);
        }
      })
      .catch(() => {
        setCurrentUser(null);
      })
      .finally(() => {
        setBooting(false);
      });
  }, [applyServerPayload, entryRole, TOKEN_KEY, companySlug]);

  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape' && modal) {
        setModal(null);
        setFormError('');
      }
      if (ev.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modal]);

  useEffect(() => {
    if (!authToken || !currentUser) return;
    let active = true;
    const refresh = async () => {
      if (document.visibilityState !== 'visible' || modal) return;
      try {
        const data = await apiCall('GET', '/api/bootstrap');
        if (active) applyServerPayload(data);
      } catch { /* The next refresh retries temporary connection failures. */ }
    };
    const timer = setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [authToken, currentUser?.id, modal, apiCall, applyServerPayload]);

  // Helpers
  const partById = useCallback((id?: string) => state.parts.find(p => p.id === id), [state.parts]);
  const techById = useCallback((id?: string) => state.technicians.find(t => t.id === id), [state.technicians]);
  const warehouseById = useCallback((id?: string) => state.warehouses.find(w => w.id === id), [state.warehouses]);
  const isWarehouse = useCallback((id?: string) => Boolean(warehouseById(id)), [warehouseById]);
  const locName = useCallback(
    (id?: string) => warehouseById(id)?.name || techById(id)?.name || '—',
    [warehouseById, techById]
  );

  const currentTech: Technician | null = (() => {
    if (currentUser?.role === 'tech' && currentUser.technicianId) {
      return techById(currentUser.technicianId) || null;
    }
    return techById(techId) || state.technicians[0] || null;
  })();

  const fmtNum = (v: number) => Number(v || 0).toLocaleString('pt-BR');
  const fmtTime = (ts?: number | null) =>
    new Date(ts || Date.now()).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Fortaleza',
    });
  const fmtDate = (ts?: number | null) =>
    new Date(ts || Date.now()).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      timeZone: 'America/Fortaleza',
    });
  const slotLabel = (slot?: SlotAddress | null) =>
    slot ? `Corredor ${slot.corridor} · Prateleira ${slot.shelf}` : 'Sem endereço cadastrado';

  const warehousesTotal = state.warehouses.reduce((acc, w) => acc + calcTotal(state, w.id), 0);
  const totalAll = Object.keys(state.stock || {}).reduce((acc, l) => acc + calcTotal(state, l), 0);
  const allAlerts = calcAlerts(state);
  const warehouseLowAlerts = state.warehouses.flatMap(w =>
    state.parts
      .filter(p => {
        const slot = state.locations[w.id]?.[p.id];
        if (!slot) return false;
        const qty = state.stock[w.id]?.[p.id] ?? 0;
        const min = p.baseMin > 0 ? p.baseMin : 1;
        return qty < min;
      })
      .map(p => ({
        warehouse: w,
        part: p,
        qty: state.stock[w.id]?.[p.id] ?? 0,
        min: p.baseMin > 0 ? p.baseMin : 1,
        slot: state.locations[w.id]?.[p.id],
      }))
  );

  // Open Movement Modal helper
  const openMovementModal = (
    kind: MovementKind = 'withdraw',
    tid = currentTech?.id || techId,
    pid = '',
    wid = ''
  ) => {
    const defaultWid = wid && isWarehouse(wid) ? wid : state.warehouses[0]?.id || '';
    if (kind === 'transfer') {
      openTransferModal(defaultWid, '', pid);
      return;
    }
    if (!state.parts.length) {
      showToast('Cadastre pelo menos um produto antes de registrar movimentações.');
      if (view === 'ops') openProductModal();
      return;
    }
    if (!['entry', 'stockout'].includes(kind) && !state.technicians.length) {
      showToast('Cadastre pelo menos um técnico para movimentar peças de campo.');
      if (view === 'ops') openTechModal();
      return;
    }
    if (['withdraw', 'return', 'entry', 'stockout'].includes(kind) && !state.warehouses.length) {
      showToast('Cadastre pelo menos um estoque antes de realizar esta operação.');
      if (view === 'ops') openWarehouseModal();
      return;
    }
    const resolvedTech = view === 'tech' && currentTech ? currentTech : techById(tid) || state.technicians[0];
    const resolvedPart = partById(pid) || state.parts[0];
    const rTid = resolvedTech?.id || '';
    const rPid = resolvedPart?.id || '';

    setMoveTechId(rTid);
    setMovePartId(rPid);
    setMoveWarehouseId(defaultWid);
    setMoveQty(kind === 'count' ? state.stock[rTid]?.[rPid] ?? 0 : 1);
    setMoveOrder(resolvedTech?.order || '');
    setMoveSite(kind === 'use' ? '' : resolvedTech?.client || '');
    setMovePlacement('');
    setMoveNote('');
    setMoveCorridor('');
    setMoveShelf('');
    setFormError('');
    if (kind === 'use') {
      captureGeolocation();
    } else {
      setGeoStatus('idle');
      setGeoCoords(null);
      setGeoError('');
    }
    setModal({ type: 'movement', kind, techId: rTid, partId: rPid, warehouseId: defaultWid });
  };

  const openWarehouseModal = (wid?: string) => {
    setFormError('');
    setModal({ type: 'warehouse', warehouseId: wid });
  };

  const openProductModal = (pid?: string) => {
    if (!state.warehouses.length) {
      showToast('Cadastre primeiro um estoque para endereçar o produto.');
      openWarehouseModal();
      return;
    }
    const defaultWid =
      (filterLoc && isWarehouse(filterLoc)
        ? filterLoc
        : state.warehouses.find(w => state.locations[w.id]?.[pid || ''])?.id) || state.warehouses[0].id;
    const slot = pid ? state.locations[defaultWid]?.[pid] : undefined;
    setProdWarehouseId(defaultWid);
    setProdCorridor(slot?.corridor || '');
    setProdShelf(slot?.shelf || '');
    setFormError('');
    setModal({ type: 'product', partId: pid });
  };

  const openTechModal = (tid?: string) => {
    setFormError('');
    setModal({ type: 'tech', techId: tid });
  };

  const openTransferModal = (from = '', to = '', pid = '') => {
    if (!companyConfig.transfers) { showToast('Transferências desabilitadas para esta empresa.'); return; }
    if (state.warehouses.length < 2) {
      showToast('Cadastre pelo menos 2 estoques para realizar transferências entre bases.');
      openWarehouseModal();
      return;
    }
    const validFrom = isWarehouse(from) ? from : state.warehouses[0].id;
    const validTo = isWarehouse(to) && to !== validFrom ? to : state.warehouses.find(w => w.id !== validFrom)?.id || '';
    const availableParts = state.parts.filter(p => state.locations[validFrom]?.[p.id]);
    const validPart = availableParts.find(p => p.id === pid)?.id || availableParts[0]?.id || '';
    setTrFrom(validFrom);
    setTrTo(validTo);
    setTrPart(validPart);
    setTrQty(1);
    setTrCorridor('');
    setTrShelf('');
    setTrNote('');
    setFormError('');
    setModal({ type: 'transfer', fromId: validFrom, toId: validTo, partId: validPart });
  };

  const navigate = (p: PageId) => {
    setPage(p);
    clearFilters();
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogin = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setLoginError('');
    setCompanyChoices([]);
    setLoginLoading(true);
    try {
      const data = await apiCall('POST', '/api/auth/login', { username: loginUser, password: loginPass, role: entryRole });
      if (Array.isArray(data.companyChoices) && data.companyChoices.length > 0) {
        setCompanyChoices(data.companyChoices);
        return;
      }
      if (data.companySlug && data.companySlug !== companySlug) {
        const companyTokenKey = `${entryRole === 'tech' ? 'gridstock-tech-auth-token' : 'gridstock-auth-token'}:${data.companySlug}`;
        localStorage.setItem(companyTokenKey, data.token);
        window.location.href = entryRole === 'tech' ? `/empresa/${data.companySlug}/tecnico` : `/empresa/${data.companySlug}`;
        return;
      }
      applyServerPayload(data);
      setView(data.user.role === 'tech' ? 'tech' : 'ops');
      setPage('overview');
      clearFilters();
      showToast(`Bem-vindo, ${data.user.name}.`);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Falha no login.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiCall('POST', '/api/auth/logout');
    } catch {}
    setAuthToken('');
    localStorage.removeItem(TOKEN_KEY);
    setCurrentUser(null);
    setModal(null);
    showToast('Sessão encerrada.');
  };

  const filteredMovements = state.movements.filter(m => {
    const activeTid = currentTech?.id || techId;
    if (view !== 'ops' && m.technician !== activeTid) return false;
    if (filterKind && m.kind !== filterKind) return false;
    if (filterTech && m.technician !== filterTech) return false;
    if (query) {
      const p = partById(m.part);
      const t = techById(m.technician);
      const hay = [
        p?.name,
        p?.sku,
        m.order,
        m.placement,
        t?.name,
        m.operator,
        locName(m.from),
        locName(m.to),
        locName(m.warehouse),
        slotLabel(m.fromAddress),
        slotLabel(m.toAddress),
        m.note,
        m.id,
      ]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(query.toLowerCase())) return false;
    }
    return true;
  });

  const exportCSV = () => {
    const safe = (v: unknown) => {
      let s = String(v ?? '');
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return '"' + s.replace(/"/g, '""') + '"';
    };
    const cols = [
      'Registro',
      'Data',
      'Hora',
      'Responsável',
      'Tipo',
      'Código',
      'Peça',
      'Quantidade',
      'OS',
      'Local',
      'Origem',
      'Destino',
      'Endereço de origem',
      'Endereço de destino',
      'Observação',
    ];
    const rows = filteredMovements.map(m => [
      m.id,
      fmtDate(m.ts),
      fmtTime(m.ts),
      techById(m.technician)?.name || m.operator || 'Controle Operacional',
      kindMap[m.kind]?.[0] || m.kind,
      partById(m.part)?.sku || '',
      partById(m.part)?.name || '',
      m.part ? m.qty : '',
      m.order || '',
      m.placement || '',
      m.from ? locName(m.from) : m.kind === 'withdraw' ? locName(m.warehouse) : '',
      m.to ? locName(m.to) : ['return', 'entry'].includes(m.kind) ? locName(m.warehouse) : '',
      m.fromAddress ? slotLabel(m.fromAddress) : '',
      m.toAddress ? slotLabel(m.toAddress) : '',
      m.note || '',
    ]);
    const csv = '\uFEFF' + [cols, ...rows].map(r => r.map(safe).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gridstock-movimentacoes.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(`${filteredMovements.length} ${filteredMovements.length === 1 ? 'registro exportado' : 'registros exportados'}.`);
  };

  if (booting) {
    return (
      <div className="login-shell">
        <aside className="login-aside">
          <div className="brand">
            <img className="brand-mark" src="/gridstock-mark.svg" width={40} height={40} alt="" />
            <span className="brand-wordmark">{company ? company.name.toUpperCase() : <>GRID<span>STOCK</span><i aria-hidden="true">.</i></>}</span>
          </div>
          <div className="login-hero">
            <span className="eyebrow" style={{ color: 'var(--lime)' }}>CARREGANDO SISTEMA</span>
            <h1>Conectando ao banco de dados operacional...</h1>
          </div>
          <div className="small" style={{ color: '#8da396' }}>GRIDSTOCK · Next.js + TypeScript</div>
        </aside>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <div className="login-shell">
          <aside className="login-aside">
            <div className="brand">
              <img className="brand-mark" src="/gridstock-mark.svg" width={40} height={40} alt="" />
              <span className="brand-wordmark">{company ? company.name.toUpperCase() : <>GRID<span>STOCK</span><i aria-hidden="true">.</i></>}</span>
            </div>
            <div className="login-hero">
              <span className="eyebrow" style={{ color: 'var(--lime)' }}>{companyConfig.fieldService ? 'OPERAÇÃO E CAMPO EM TEMPO REAL' : 'ESTOQUE ORGANIZADO, OPERAÇÃO CONECTADA'}</span>
              <h1>Cada peça no lugar.<br /><span>Sua operação<br />em movimento.</span></h1>
              <p>
                {company?.tagline || (companyConfig.fieldService ? 'Conecte seus estoques à equipe em campo e acompanhe cada peça, da base ao atendimento.' : 'Acompanhe produtos, entradas, saídas e reposição em um só lugar.')}
              </p>
              {companyConfig.fieldService && <div className="login-flow" aria-label="Fluxo de estoque da base ao atendimento">
                <div><span className="flow-icon"><Icon name="box" /></span><strong>Na base</strong><small>Estoque organizado</small></div>
                <Icon name="arrow" />
                <div><span className="flow-icon"><Icon name="van" /></span><strong>Em campo</strong><small>Equipe conectada</small></div>
                <Icon name="arrow" />
                <div><span className="flow-icon"><Icon name="check" /></span><strong>No destino</strong><small>Uso registrado</small></div>
              </div>}
            </div>
            <div className="small" style={{ color: '#8da396' }}>GRIDSTOCK · Sistema de Gestão de Estoque em Movimento</div>
          </aside>
          <main className="login-main">
            <form className="login-card" onSubmit={handleLogin}>
              <div className="login-entry-icon"><Icon name={entryRole === 'tech' ? 'van' : 'grid'} /></div>
              <span className="page-eyebrow">{company ? `BEM-VINDO À ${company.name.toUpperCase()}` : 'BEM-VINDO AO GRIDSTOCK'}</span>
              <h2>{entryRole === 'tech' ? 'Área do técnico' : 'Controle operacional'}</h2>
              <p>{entryRole === 'tech' ? 'Entre para informar seu estoque pessoal e as peças que levará hoje.' : (companyConfig.fieldService ? 'Entre para acompanhar os estoques e a equipe em campo.' : 'Entre para gerenciar os produtos e estoques da sua empresa.')}</p>
              {loginError && <div className="error" role="alert">{loginError}</div>}
              {companyChoices.length > 0 && (
                <div className="panel" style={{ padding: '14px', marginBottom: '14px', background: '#f4f8f5', borderColor: '#cfe0d6' }}>
                  <strong style={{ display: 'block', marginBottom: '8px', fontSize: '0.92rem' }}>
                    Selecione a empresa que deseja acessar:
                  </strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {companyChoices.map(choice => (
                      <button
                        key={choice.slug}
                        type="button"
                        className="button secondary full"
                        style={{ justifyContent: 'space-between', borderColor: choice.color }}
                        onClick={() => {
                          const companyTokenKey = `${entryRole === 'tech' ? 'gridstock-tech-auth-token' : 'gridstock-auth-token'}:${choice.slug}`;
                          localStorage.setItem(companyTokenKey, choice.token);
                          window.location.href = entryRole === 'tech' ? `/empresa/${choice.slug}/tecnico` : `/empresa/${choice.slug}`;
                        }}
                      >
                        <span>{choice.name}</span>
                        <span className="muted small">/empresa/{choice.slug} →</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="field">
                <label htmlFor="login-user">Usuário</label>
                <input
                  className="input"
                  id="login-user"
                  name="username"
                  value={loginUser}
                  onChange={e => setLoginUser(e.target.value)}
                  placeholder={entryRole === 'tech' ? 'Seu usuário de técnico' : 'Seu usuário operacional'}
                  autoComplete="username"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="login-pass">Senha</label>
                <input
                  className="input"
                  id="login-pass"
                  name="password"
                  type="password"
                  value={loginPass}
                  onChange={e => setLoginPass(e.target.value)}
                  placeholder="Sua senha de acesso"
                  autoComplete="current-password"
                  required
                />
              </div>
              <button className="button full" type="submit" disabled={loginLoading}>
                <Icon name="check" />
                {loginLoading ? 'Autenticando...' : 'Entrar no sistema'}
              </button>
              <div className="login-hint">
                {entryRole === 'tech' ? 'Use o usuário e a senha fornecidos pelo operacional.' : (companyConfig.fieldService ? 'Cadastre a equipe e acompanhe as movimentações de cada técnico.' : 'Acesso exclusivo aos dados da sua empresa.')}
                <br />
                <a className="text-link" hidden={!companyConfig.fieldService} href={entryRole === 'tech' ? (companyBase || '/') : `${companyBase}/tecnico`}>
                  {entryRole === 'tech' ? 'Acesso do operacional' : 'Acesso exclusivo do técnico'}
                </a>
                {!company && <><br /><a className="text-link" href="/administracao">Administrar empresas</a></>}
              </div>
            </form>
          </main>
        </div>
        <div id="toast" role="status" aria-live="polite" className={toastMsg ? 'show' : ''}>{toastMsg}</div>
      </>
    );
  }

  if (!companyConfig.fieldService && currentUser.role === 'ops') return <StockWorkspace state={state} users={users} user={currentUser} name={company?.name || 'GRIDSTOCK'} config={companyConfig} api={apiCall} update={applyServerPayload} logout={handleLogout} />;

  const isOpsUser = currentUser.role === 'ops';
  const ops = view === 'ops' && isOpsUser;
  const pageTitle = ops
    ? {
        overview: 'Visão geral',
        stock: 'Inventário',
        warehouses: 'Estoques',
        products: 'Produtos',
        movements: 'Movimentações',
        team: 'Equipe em campo',
      }[page]
    : {
        overview: 'Minha jornada',
        stock: 'Meu estoque',
        movements: 'Minhas movimentações',
        warehouses: 'Minha jornada',
        products: 'Minha jornada',
        team: 'Minha jornada',
      }[page];

  const userInitials = ops
    ? currentUser.name
        .split(/\s+/)
        .map(w => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'OP'
    : currentTech?.initials || 'TC';
  const userName = ops ? currentUser.name : currentTech?.name || currentUser.name;
  const userRoleLabel = ops
    ? (company ? 'Administrador da empresa' : 'Controle operacional')
    : currentTech?.vehicle
    ? `Técnico · ${currentTech.vehicle}`
    : 'Técnico em campo';

  const renderOpsStats = () => {
    const on = state.technicians.filter(t => ['route', 'working'].includes(t.status)).length;
    return (
      <div className="stats">
        <div className="stat-card featured">
          <div className="stat-top">Peças em estoque<span className="stat-icon"><Icon name="box" /></span></div>
          <div className="stat-value mono">{fmtNum(totalAll)}</div>
          <div className="stat-foot">
            <span className="green">{fmtNum(warehousesTotal)} nos estoques</span> · {fmtNum(totalAll - warehousesTotal)} em campo
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-top">Técnicos em campo<span className="stat-icon"><Icon name="users" /></span></div>
          <div className="stat-value mono">{String(on).padStart(2, '0')}</div>
          <div className="stat-foot">
            {state.technicians.filter(t => t.status === 'working').length} em atendimento · {state.technicians.filter(t => t.status === 'route').length} a caminho
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-top">Movimentações<span className="stat-icon"><Icon name="arrows" /></span></div>
          <div className="stat-value mono">{fmtNum(state.movements.filter(m => m.part).length)}</div>
          <div className="stat-foot">
            <span className="green">{state.movements.filter(m => m.kind === 'use').length} utilizações</span> registradas no histórico
          </div>
        </div>
        <div className={`stat-card ${warehouseLowAlerts.length || allAlerts.length ? 'alert' : ''}`}>
          <div className="stat-top">Estoque baixo (Base)<span className="stat-icon"><Icon name="alert" /></span></div>
          <div className="stat-value mono">{String(warehouseLowAlerts.length).padStart(2, '0')}</div>
          <div className="stat-foot">
            {warehouseLowAlerts.length
              ? `${warehouseLowAlerts.length} peça(s) abaixo do mínimo no estoque`
              : 'Estoques base dentro do mínimo'}
          </div>
        </div>
      </div>
    );
  };

  const renderWarehouseLowStockBanner = () => {
    if (!ops || warehouseLowAlerts.length === 0) return null;
    return (
      <section
        className="panel"
        style={{
          marginBottom: 22,
          border: '1px solid #e2b96b',
          background: 'linear-gradient(180deg, #fffdf8 0%, #fcf6e8 100%)',
        }}
      >
        <div className="panel-head" style={{ borderBottomColor: '#efe1c1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              className="stat-icon"
              style={{ background: '#f5e3be', color: '#8f6214', width: 36, height: 36, borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="alert" />
            </span>
            <div>
              <h2 style={{ color: '#5c400c' }}>Alerta de Estoque Baixo no Almoxarifado</h2>
              <p style={{ color: '#826329' }}>
                As peças abaixo atingiram ou ficaram abaixo do estoque mínimo no próprio estoque base e precisam de reposição.
              </p>
            </div>
          </div>
          <Badge
            label={`${warehouseLowAlerts.length} ${warehouseLowAlerts.length === 1 ? 'item baixo no estoque' : 'itens baixos no estoque'}`}
            color="amber"
            dot
          />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Peça em baixa</th>
                <th>Estoque (Base)</th>
                <th>Corredor / Prateleira</th>
                <th>Saldo atual</th>
                <th>Mínimo da base</th>
                <th style={{ textAlign: 'right' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {warehouseLowAlerts.map(item => (
                <tr key={`${item.warehouse.id}-${item.part.id}`}>
                  <td>
                    <strong>{item.part.name}</strong>
                    <span className="cell-sub">{item.part.sku} · {item.part.category}</span>
                  </td>
                  <td>
                    <strong>{item.warehouse.name}</strong>
                    <span className="cell-sub">{item.warehouse.code} · {item.warehouse.city}</span>
                  </td>
                  <td>
                    {item.slot ? (
                      <span className="address-tag">C{item.slot.corridor} / P{item.slot.shelf}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <Badge
                      label={item.qty === 0 ? 'ZERADO (0 un.)' : `${item.qty} ${item.part.unit}`}
                      color="amber"
                    />
                  </td>
                  <td className="mono">{item.min} {item.part.unit}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="button secondary"
                      style={{ padding: '6px 12px', fontSize: '.78rem' }}
                      onClick={() => openMovementModal('entry', currentTech?.id || techId, item.part.id, item.warehouse.id)}
                    >
                      <Icon name="in" />Repor no estoque
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  };

  const renderTechStats = () => {
    if (!currentTech) return null;
    const a = allAlerts.filter(x => x.loc === currentTech.id);
    return (
      <div className="stats">
        <div className="stat-card featured">
          <div className="stat-top">Peças comigo<span className="stat-icon"><Icon name="box" /></span></div>
          <div className="stat-value mono">{fmtNum(calcTotal(state, currentTech.id))}</div>
          <div className="stat-foot">
            <span className="green">{state.parts.filter(p => (state.stock[currentTech.id]?.[p.id] || 0) > 0).length} tipos</span> disponíveis no veículo
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-top">Minhas movimentações<span className="stat-icon"><Icon name="arrows" /></span></div>
          <div className="stat-value mono">{state.movements.filter(m => m.technician === currentTech.id && m.part).length}</div>
          <div className="stat-foot">Retiradas, usos, devoluções e ajustes</div>
        </div>
        <div className="stat-card">
          <div className="stat-top">Peças utilizadas<span className="stat-icon"><Icon name="tool" /></span></div>
          <div className="stat-value mono">
            {state.movements.filter(m => m.technician === currentTech.id && m.kind === 'use').reduce((s, m) => s + (m.qty || 0), 0)}
          </div>
          <div className="stat-foot">Com OS e local de aplicação</div>
        </div>
        <div className={`stat-card ${a.length ? 'alert' : ''}`}>
          <div className="stat-top">Abaixo do mínimo<span className="stat-icon"><Icon name="alert" /></span></div>
          <div className="stat-value mono">{String(a.length).padStart(2, '0')}</div>
          <div className="stat-foot">{a.length ? 'Confira a necessidade de reposição' : 'Estoque dentro do mínimo'}</div>
        </div>
      </div>
    );
  };

  const renderMovementTable = (rows: Movement[]) => {
    if (!rows.length) {
      return (
        <div className="empty">
          <Icon name="search" />
          <div>Nenhuma movimentação encontrada.</div>
          <p>Registre uma nova movimentação ou altere os filtros de busca.</p>
        </div>
      );
    }
    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Peça / registro</th>
              <th>Responsável</th>
              <th>Movimentação</th>
              <th>Qtd.</th>
              <th>Local / destino</th>
              <th>Data e hora</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(m => {
              const p = partById(m.part);
              const t = techById(m.technician);
              const k = kindMap[m.kind] || ['Registro', '', 'box'];
              const qty =
                m.kind === 'count'
                  ? `${(m.delta || 0) > 0 ? '+' : ''}${m.delta}`
                  : m.kind === 'departure' ? `${m.qty}`
                  : m.kind === 'transfer'
                  ? `↔ ${m.qty}`
                  : m.part
                  ? `${['use', 'return'].includes(m.kind) ? '−' : '+'}${m.qty}`
                  : '—';
              const tFirst = t ? t.name.split(' ')[0] : 'Técnico';
              const gpsInfo = parsePlacementGps(m.placement);
              const destination =
                m.kind === 'transfer'
                  ? `${locName(m.from)} → ${locName(m.to)}`
                  : m.kind === 'withdraw'
                  ? `${locName(m.warehouse || 'base')} → ${tFirst}`
                  : m.kind === 'return'
                  ? `${tFirst} → ${locName(m.warehouse || 'base')}`
                  : m.kind === 'entry'
                  ? locName(m.warehouse)
                  : m.kind === 'count'
                  ? `${m.before} → ${m.qty} un. · ${m.note}`
                  : m.kind === 'departure'
                  ? `Saída do dia · ${m.note || 'Estoque pessoal'}`
                  : gpsInfo.text;
              const sub = m.order || (m.toAddress || m.fromAddress ? slotLabel(m.toAddress || m.fromAddress) : '');
              return (
                <tr key={m.id}>
                  <td>
                    <div className="cell-main">
                      <span className="item-icon"><Icon name={p ? 'box' : k[2]} /></span>
                      <div>
                        <strong>{p ? p.name : `${k[0]} em campo`}</strong>
                        <span className="cell-sub">{p ? p.sku : m.order || 'OS'} · {m.id}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <strong>{t ? t.name : m.operator || 'Controle Operacional'}</strong>
                    <span className="cell-sub">{t ? t.vehicle : 'Controle operacional'}</span>
                  </td>
                  <td><Badge label={k[0]} color={k[1]} /></td>
                  <td className={`quantity ${['use', 'return'].includes(m.kind) ? 'negative' : ''}`}>{qty}</td>
                  <td>
                    <span title={m.note}>{destination}</span>
                    {gpsInfo.mapUrl && (
                      <a
                        href={gpsInfo.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-link"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '.76rem', marginLeft: 8 }}
                        title={`Coordenadas GPS: ${gpsInfo.coords}`}
                      >
                        <Icon name="pin" />Ver no Mapa
                      </a>
                    )}
                    {sub && <span className="cell-sub">{sub}</span>}
                  </td>
                  <td className="mono">
                    {fmtTime(m.ts)}
                    <span className="cell-sub">{fmtDate(m.ts)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderSetupPanel = () => {
    const hasW = state.warehouses.length > 0;
    const hasP = state.parts.length > 0;
    const hasT = state.technicians.length > 0;
    if (hasW && hasP && hasT) return null;
    return (
      <section className="setup-panel">
        <div className="setup-head">
          <div>
            <h2>Configuração da Operação</h2>
            <p>Cadastre os estoques, produtos e a equipe da sua operação abaixo.</p>
          </div>
          <button hidden={!!company} className="button secondary" onClick={() => setModal({ type: 'reset', mode: 'seed' })}>
            <Icon name="box" />Carregar base de exemplo
          </button>
        </div>
        <div className="setup-grid">
          <div className={`setup-step ${hasW ? 'done' : ''}`}>
            <div>
              <div className="setup-step-top">
                <span>PASSO 1</span>
                {hasW ? <Badge label={`${state.warehouses.length} cadastrado(s)`} color="green" /> : <Badge label="Pendente" color="amber" />}
              </div>
              <h3>Estoques / Almoxarifados</h3>
              <p>Cadastre suas bases físicas com código, cidade, endereço e responsável.</p>
            </div>
            <button className={`button ${hasW ? 'secondary' : ''}`} onClick={() => openWarehouseModal()}>
              <Icon name="plus" />Cadastrar estoque
            </button>
          </div>
          <div className={`setup-step ${hasP ? 'done' : ''}`}>
            <div>
              <div className="setup-step-top">
                <span>PASSO 2</span>
                {hasP ? <Badge label={`${state.parts.length} cadastrado(s)`} color="green" /> : <Badge label="Pendente" color="amber" />}
              </div>
              <h3>Catálogo de Produtos</h3>
              <p>Registre SKUs únicos, estoque mínimo, saldo inicial, corredor e prateleira.</p>
            </div>
            <button className={`button ${hasP ? 'secondary' : ''}`} onClick={() => openProductModal()}>
              <Icon name="plus" />Cadastrar produto
            </button>
          </div>
          <div className={`setup-step ${hasT ? 'done' : ''}`}>
            <div>
              <div className="setup-step-top">
                <span>PASSO 3</span>
                {hasT ? <Badge label={`${state.technicians.length} cadastrado(s)`} color="green" /> : <Badge label="Pendente" color="amber" />}
              </div>
              <h3>Equipe em Campo</h3>
              <p>Cadastre seus técnicos, veículos, regiões de atendimento e credenciais de acesso.</p>
            </div>
            <button className={`button ${hasT ? 'secondary' : ''}`} onClick={() => openTechModal()}>
              <Icon name="plus" />Cadastrar técnico
            </button>
          </div>
        </div>
      </section>
    );
  };

  const renderOverview = () => {
    const whPct = totalAll > 0 ? Math.round((warehousesTotal / totalAll) * 100) : 0;
    const fieldPct = totalAll > 0 ? Math.round(((totalAll - warehousesTotal) / totalAll) * 100) : 0;
    const colors = ['#567c48', '#91a979', '#b1c497', '#c7d5b4', '#a5bc90', '#d2dec3', '#dde5d4'];
    const locs = [...state.warehouses.map(w => w.id), ...state.technicians.map(t => t.id)];
    const maxLoc = Math.max(1, ...locs.map(l => calcTotal(state, l)));

    return (
      <div className="overview-dashboard">
        <div className="page-heading">
          <div>
            <span className="page-eyebrow">PAINEL OPERACIONAL</span>
            <h1>Visão geral da operação</h1>
            <p>Tudo o que está nos estoques e em campo, em um só lugar.</p>
          </div>
          <div className="heading-actions">
            <span className="date-chip">
              <Icon name="calendar" />
              {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', timeZone: 'America/Fortaleza' })}
            </span>
            <button className="button" onClick={() => openMovementModal('withdraw')}>
              <Icon name="plus" />Registrar movimentação
            </button>
          </div>
        </div>
        {renderOpsStats()}
        <DashboardCharts state={state} onOpenStock={() => navigate('stock')} />
        {renderSetupPanel()}
        {renderWarehouseLowStockBanner()}
        <div className="grid-main dashboard-locations">
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Onde está o estoque</h2>
                <p>Distribuição de peças por localização</p>
              </div>
              <Badge label={`${fmtNum(totalAll)} peças`} />
            </div>
            <div className="stock-dist">
              {locs.length ? (
                locs.map((l, i) => (
                  <div
                    key={l}
                    className="dist-row"
                    style={{ '--c': colors[i % colors.length] } as React.CSSProperties}
                  >
                    <span className="dist-label" title={locName(l)}>
                      <i />
                      {locName(l)}
                    </span>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${(calcTotal(state, l) / maxLoc) * 100}%` }} />
                    </div>
                    <span className="dist-value mono">{fmtNum(calcTotal(state, l))}</span>
                  </div>
                ))
              ) : (
                <div className="empty" style={{ padding: '24px 0' }}>
                  <p>Cadastre estoques e técnicos para visualizar a distribuição de peças.</p>
                </div>
              )}
              <div className="dist-summary">
                <span><strong>{whPct}%</strong> nos estoques</span>
                <span><strong>{fieldPct}%</strong> em campo</span>
                <span>Saldos em tempo real</span>
              </div>
            </div>
          </section>
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Equipe em movimento</h2>
                <p>Situação atual dos técnicos</p>
              </div>
              <button className="text-link" onClick={() => navigate('team')}>
                Ver equipe <Icon name="arrow" />
              </button>
            </div>
            <div className="team-list">
              {state.technicians.length ? (
                state.technicians.slice(0, 5).map(t => (
                  <button
                    key={t.id}
                    className="team-row"
                    onClick={() => setModal({ type: 'detail', techId: t.id })}
                  >
                    <div className={`avatar ${t.color}`}>{t.initials}</div>
                    <div className="team-info">
                      <strong>{t.name}</strong>
                      <small>{t.vehicle} · {t.region}</small>
                    </div>
                    <Badge label={statusMap[t.status][0]} color={statusMap[t.status][1]} dot />
                    <Icon name="chevron" />
                  </button>
                ))
              ) : (
                <div className="empty" style={{ padding: '28px 10px' }}>
                  <p>Nenhum técnico cadastrado.</p>
                  <button className="button secondary" style={{ marginTop: 10 }} onClick={() => openTechModal()}>
                    <Icon name="plus" />Cadastrar técnico
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
        {allAlerts.length > 0 && (
          <div className="notice">
            <Icon name="alert" />
            <span>
              <strong>{allAlerts.length} saldos abaixo do mínimo.</strong> Confira as peças que precisam de reposição.
            </span>
            <button
              className="text-link"
              onClick={() => {
                setPage('stock');
                clearFilters();
                setLowOnly(true);
                showToast('Exibindo peças abaixo do estoque mínimo.');
              }}
            >
              Ver alertas <Icon name="arrow" />
            </button>
          </div>
        )}
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Últimas movimentações</h2>
              <p>Rastreabilidade completa de cada operação realizada.</p>
            </div>
            <button className="text-link" onClick={() => navigate('movements')}>
              Ver todas <Icon name="arrow" />
            </button>
          </div>
          <div className="dashboard-desktop-activity">{renderMovementTable(state.movements.slice(0, 5))}</div>
          <div className="dashboard-mobile-activity">
            {state.movements.length ? state.movements.slice(0, 5).map(movement => (
              <article className="dashboard-activity-card" key={movement.id}>
                <div><Badge label={kindMap[movement.kind]?.[0] || 'Registro'} color={kindMap[movement.kind]?.[1]} /><time dateTime={new Date(movement.ts).toISOString()}>{fmtDate(movement.ts)} · {fmtTime(movement.ts)}</time></div>
                <strong>{partById(movement.part)?.name || movement.order || 'Atividade em campo'}</strong>
                <p>{techById(movement.technician)?.name || movement.operator || 'Controle operacional'}</p>
                <div><span>{movement.id}</span><strong>{movement.kind === 'count' ? `${fmtNum(movement.before || 0)} → ${fmtNum(movement.qty || 0)} un.` : movement.qty !== undefined ? `${fmtNum(movement.qty)} un.` : '—'}</strong></div>
              </article>
            )) : <div className="empty">Nenhuma movimentação registrada ainda.</div>}
          </div>
          <div className="table-footer">
            <span>Últimos {Math.min(5, state.movements.length)} de {state.movements.length} registros</span>
            <span>Horário de Fortaleza · UTC−3</span>
          </div>
        </section>
      </div>
    );
  };

  const renderStockPage = () => {
    const locs = !ops ? (currentTech ? [currentTech.id] : []) : filterLoc ? [filterLoc] : Object.keys(state.stock);
    const rows = locs
      .flatMap(l =>
        state.parts
          .filter(p => !isWarehouse(l) || state.locations[l]?.[p.id])
          .map(p => ({
            p,
            loc: l,
            qty: state.stock[l]?.[p.id] ?? 0,
            min: isWarehouse(l) ? p.baseMin : p.min,
            slot: state.locations[l]?.[p.id],
          }))
      )
      .filter(
        r =>
          (!query ||
            `${r.p.name} ${r.p.sku} ${locName(r.loc)} ${slotLabel(r.slot)}`
              .toLowerCase()
              .includes(query.toLowerCase())) &&
          (!filterCategory || r.p.category === filterCategory) &&
          (!lowOnly || r.qty < r.min)
      );

    return (
      <>
        <div className="page-heading">
          <div>
            <h1>{ops ? 'Inventário' : 'Meu estoque'}</h1>
            <p>{ops ? 'Cada peça, em cada estoque, no endereço certo.' : 'Seu inventário em campo, sempre à mão.'}</p>
          </div>
          <div className="heading-actions">
            {ops ? (
              <>
                <button className="button secondary" onClick={() => openMovementModal('entry')}>
                  <Icon name="in" />Entrada de estoque
                </button>
                <button hidden={!companyConfig.transfers} className="button secondary" onClick={() => openTransferModal()}>
                  <Icon name="arrows" />Transferir peças
                </button>
                <button className="button" onClick={() => openProductModal()}>
                  <Icon name="plus" />Cadastrar produto
                </button>
              </>
            ) : (
              isOpsUser &&
              state.technicians.length > 0 && (
                <select
                  className="tech-select"
                  value={currentTech?.id || ''}
                  onChange={e => {
                    setTechId(e.target.value);
                    clearFilters();
                  }}
                  aria-label="Selecionar técnico"
                >
                  {state.technicians.map(t => (
                    <option key={t.id} value={t.id}>{t.name} · {t.vehicle}</option>
                  ))}
                </select>
              )
            )}
          </div>
        </div>
        {ops ? renderOpsStats() : renderTechStats()}
        {ops && renderWarehouseLowStockBanner()}
        {ops && renderDailyDepartures()}
        {!ops && currentTech && (
          <div className="stock-note">
            <Icon name="van" />
            Estoque sob sua responsabilidade · {currentTech.vehicle}
            <button
              className="text-link"
              style={{ marginLeft: 'auto' }}
              onClick={() => openMovementModal('count', currentTech.id)}
            >
              <Icon name="edit" />Atualizar contagem
            </button>
          </div>
        )}
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>{ops ? 'Inventário por localização' : 'Peças no meu veículo'}</h2>
              <p>Quantidade disponível e mínimo de referência</p>
            </div>
            {(currentTech || ops) && (
              <button className="text-link" onClick={() => openMovementModal('count', currentTech?.id)}>
                Ajustar contagem <Icon name="edit" />
              </button>
            )}
          </div>
          <div className="toolbar">
            <div className="search">
              <Icon name="search" />
              <input
                className="input"
                aria-label="Buscar peça ou código"
                placeholder="Peça, código, corredor ou prateleira..."
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
            {ops && (
              <select
                aria-label="Filtrar localização"
                value={filterLoc}
                onChange={e => setFilterLoc(e.target.value)}
              >
                <option value="">Todas as localizações</option>
                <optgroup label="Estoques">
                  {state.warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Técnicos">
                  {state.technicians.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </optgroup>
              </select>
            )}
            <select
              aria-label="Filtrar categoria"
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
            >
              <option value="">Todas as categorias</option>
              {[...new Set(state.parts.map(p => p.category))].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              aria-label="Filtrar situação do saldo"
              value={lowOnly ? 'low' : ''}
              onChange={e => setLowOnly(e.target.value === 'low')}
            >
              <option value="">Todos os saldos</option>
              <option value="low">Abaixo do mínimo</option>
            </select>
          </div>
          {rows.length ? (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Peça</th>
                      {ops && <th>Localização</th>}
                      {ops && <th>Endereço físico</th>}
                      <th>Disponível</th>
                      <th>Mínimo</th>
                      <th>Situação</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={`${r.loc}-${r.p.id}`}>
                        <td>
                          <div className="cell-main">
                            <span className="item-icon"><Icon name="box" /></span>
                            <div>
                              <strong>{r.p.name}</strong>
                              <span className="cell-sub">{r.p.sku} · {r.p.category}</span>
                            </div>
                          </div>
                        </td>
                        {ops && (
                          <td>
                            <strong>{locName(r.loc)}</strong>
                            <span className="cell-sub">
                              {isWarehouse(r.loc) ? 'Almoxarifado' : techById(r.loc)?.vehicle || 'Veículo'}
                            </span>
                          </td>
                        )}
                        {ops && (
                          <td>
                            {r.slot ? (
                              <>
                                <span className="address-tag">C{r.slot.corridor} / P{r.slot.shelf}</span>
                                <span className="cell-sub">Corredor / Prateleira</span>
                              </>
                            ) : (
                              <span className="muted">No veículo</span>
                            )}
                          </td>
                        )}
                        <td><strong>{r.qty} {r.p.unit}</strong></td>
                        <td>{r.min} {r.p.unit}</td>
                        <td>
                          <Badge
                            label={r.qty < r.min ? 'Estoque baixo' : 'Regular'}
                            color={r.qty < r.min ? 'amber' : 'green'}
                          />
                        </td>
                        <td>
                          <button
                            className="text-link"
                            onClick={() =>
                              openMovementModal(
                                isWarehouse(r.loc) ? 'withdraw' : view === 'tech' ? 'use' : 'withdraw',
                                isWarehouse(r.loc) ? currentTech?.id || techId : r.loc,
                                r.p.id,
                                isWarehouse(r.loc) ? r.loc : state.warehouses[0]?.id || 'base'
                              )
                            }
                          >
                            {isWarehouse(r.loc) ? 'Retirar' : 'Movimentar'} <Icon name="arrow" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="table-footer">
                <span>{rows.length} {rows.length === 1 ? 'saldo encontrado' : 'saldos encontrados'}</span>
                <span>Atualizado às {fmtTime(state.updatedAt)}</span>
              </div>
            </>
          ) : (
            <div className="empty">
              <Icon name="search" />
              <div>Nenhuma peça encontrada.</div>
              <p>Cadastre um produto, dê entrada no estoque ou altere os filtros.</p>
            </div>
          )}
        </section>
      </>
    );
  };

  const renderWarehousesPage = () => (
    <>
      <div className="page-heading">
        <div>
          <h1>Estoques</h1>
          <p>Uma rede conectada. Cada base com seu próprio saldo e endereçamento.</p>
        </div>
        <div className="heading-actions">
          <button hidden={!companyConfig.transfers} className="button secondary" onClick={() => openTransferModal()}>
            <Icon name="arrows" />Transferir peças
          </button>
          <button className="button" onClick={() => openWarehouseModal()}>
            <Icon name="plus" />Cadastrar estoque
          </button>
        </div>
      </div>
      <div className="stats">
        <div className="stat-card featured">
          <div className="stat-top">Estoques cadastrados<span className="stat-icon"><Icon name="box" /></span></div>
          <div className="stat-value mono">{String(state.warehouses.length).padStart(2, '0')}</div>
          <div className="stat-foot">Bases e almoxarifados da operação</div>
        </div>
        <div className="stat-card">
          <div className="stat-top">Peças armazenadas<span className="stat-icon"><Icon name="grid" /></span></div>
          <div className="stat-value mono">{fmtNum(warehousesTotal)}</div>
          <div className="stat-foot">Soma dos saldos em todos os estoques</div>
        </div>
        <div className="stat-card">
          <div className="stat-top">Transferências<span className="stat-icon"><Icon name="arrows" /></span></div>
          <div className="stat-value mono">{String(state.movements.filter(m => m.kind === 'transfer').length).padStart(2, '0')}</div>
          <div className="stat-foot">Movimentações entre estoques</div>
        </div>
        <div className="stat-card">
          <div className="stat-top">Endereços cadastrados<span className="stat-icon"><Icon name="pin" /></span></div>
          <div className="stat-value mono">
            {Object.values(state.locations).reduce((acc, slots) => acc + Object.keys(slots).length, 0)}
          </div>
          <div className="stat-foot">Produto + estoque + corredor + prateleira</div>
        </div>
      </div>
      {renderWarehouseLowStockBanner()}
      <div className="warehouse-grid">
        {state.warehouses.map(w => {
          const count = Object.keys(state.locations[w.id] || {}).length;
          const lowInWh = warehouseLowAlerts.filter(a => a.warehouse.id === w.id);
          return (
            <article key={w.id} className="panel warehouse-card">
              <div className="warehouse-card-top">
                <span className="warehouse-symbol"><Icon name="box" /></span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {lowInWh.length > 0 && (
                    <Badge
                      label={`${lowInWh.length} ${lowInWh.length === 1 ? 'peça baixa' : 'peças baixas'}`}
                      color="amber"
                      dot
                    />
                  )}
                  <Badge label={w.code} color="green" />
                </div>
              </div>
              <h2>{w.name}</h2>
              <p className="warehouse-city"><Icon name="pin" />{w.city}</p>
              <div className="warehouse-totals">
                <div>
                  <strong>{fmtNum(calcTotal(state, w.id))}</strong>
                  <small>peças disponíveis</small>
                </div>
                <div>
                  <strong>{count}</strong>
                  <small>produtos endereçados</small>
                </div>
              </div>
              <div className="warehouse-meta">
                <span>Responsável <strong>{w.responsible}</strong></span>
                <p>{w.address || 'Endereço da base não informado'}</p>
              </div>
              <div className="warehouse-buttons">
                <button
                  className="button secondary"
                  onClick={() => {
                    setPage('stock');
                    clearFilters();
                    setFilterLoc(w.id);
                  }}
                >
                  Ver inventário <Icon name="arrow" />
                </button>
                <button
                  className="icon-button"
                  onClick={() => openWarehouseModal(w.id)}
                  title="Editar estoque"
                  aria-label={`Editar ${w.name}`}
                >
                  <Icon name="edit" />
                </button>
                <button
                  className="icon-button"
                  hidden={!companyConfig.transfers} onClick={() => openTransferModal(w.id)}
                  title={`Transferir de ${w.name}`}
                  aria-label={`Transferir de ${w.name}`}
                >
                  <Icon name="arrows" />
                </button>
              </div>
            </article>
          );
        })}
        <button className="warehouse-add" onClick={() => openWarehouseModal()}>
          <span><Icon name="plus" /></span>
          <strong>Adicionar um estoque</strong>
          <p>Organize mais uma base da operação</p>
        </button>
      </div>
    </>
  );

  const renderProductsPage = () => {
    const rows = state.parts.filter(
      p =>
        (!filterLoc || state.locations[filterLoc]?.[p.id]) &&
        (!query ||
          [
            p.name,
            p.sku,
            p.category,
            ...state.warehouses
              .filter(w => state.locations[w.id]?.[p.id])
              .map(w => `${w.name} ${slotLabel(state.locations[w.id][p.id])}`),
          ]
            .join(' ')
            .toLowerCase()
            .includes(query.toLowerCase()))
    );

    return (
      <>
        <div className="page-heading">
          <div>
            <h1>Produtos</h1>
            <p>Um cadastro por produto. Um endereço em cada estoque.</p>
          </div>
          <div className="heading-actions">
            <button className="button secondary" onClick={() => openMovementModal('entry')}>
              <Icon name="in" />Entrada de saldo
            </button>
            <button className="button" onClick={() => openProductModal()}>
              <Icon name="plus" />Cadastrar produto
            </button>
          </div>
        </div>
        <div className="stock-note">
          <Icon name="pin" />O mesmo produto pode estar em corredores e prateleiras diferentes em cada estoque.
        </div>
        {renderWarehouseLowStockBanner()}
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Catálogo de produtos</h2>
              <p>{state.parts.length} {state.parts.length === 1 ? 'produto cadastrado' : 'produtos cadastrados'} · código único em toda a rede</p>
            </div>
            <Badge label="Endereçamento físico" color="green" />
          </div>
          <div className="toolbar">
            <div className="search">
              <Icon name="search" />
              <input
                className="input"
                aria-label="Buscar produtos"
                placeholder="Produto, código ou endereço..."
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
            <select
              aria-label="Filtrar estoque do produto"
              value={filterLoc}
              onChange={e => setFilterLoc(e.target.value)}
            >
              <option value="">Todos os estoques</option>
              {state.warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          {rows.length ? (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>Categoria</th>
                      <th>Saldo total</th>
                      <th>Estoque / corredor / prateleira</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(p => (
                      <tr key={p.id}>
                        <td>
                          <div className="cell-main">
                            <span className="item-icon"><Icon name="box" /></span>
                            <div>
                              <strong>{p.name}</strong>
                              <span className="cell-sub">{p.sku} · Mín. base: {p.baseMin} · Mín. técnico: {p.min}</span>
                            </div>
                          </div>
                        </td>
                        <td>{p.category}</td>
                        <td>
                          <strong>
                            {fmtNum(Object.values(state.stock).reduce((acc, st) => acc + (st[p.id] || 0), 0))} {p.unit}
                          </strong>
                          <span className="cell-sub">Base + técnicos</span>
                        </td>
                        <td>
                          <div className="product-addresses">
                            {state.warehouses
                              .filter(w => state.locations[w.id]?.[p.id])
                              .map(w => {
                                const a = state.locations[w.id][p.id];
                                return (
                                  <span key={w.id}>
                                    <strong>{w.name}</strong>
                                    <span className="address-tag">C{a.corridor} / P{a.shelf}</span>
                                  </span>
                                );
                              })}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="row-actions">
                            <button
                              className="text-link"
                              onClick={() => openMovementModal('entry', currentTech?.id || techId, p.id)}
                            >
                              + Entrada
                            </button>
                            <button className="text-link" onClick={() => openProductModal(p.id)}>
                              Editar / endereçar <Icon name="edit" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="table-footer">
                <span>{rows.length} {rows.length === 1 ? 'produto encontrado' : 'produtos encontrados'}</span>
                <span>Saldo consolidado da rede</span>
              </div>
            </>
          ) : (
            <div className="empty">
              <Icon name="search" />
              <div>Nenhum produto encontrado.</div>
              <p>Cadastre um produto ou altere a busca.</p>
            </div>
          )}
        </section>
      </>
    );
  };

  const renderMovementsPage = () => (
    <>
      <div className="page-heading">
        <div>
          <h1>{ops ? 'Movimentações' : 'Minhas movimentações'}</h1>
          <p>{ops ? 'Rastreabilidade da base até o ponto de utilização.' : 'Todos os seus registros, em um único histórico.'}</p>
        </div>
        <div className="heading-actions">
          {!ops && isOpsUser && state.technicians.length > 0 && (
            <select
              className="tech-select"
              value={currentTech?.id || ''}
              onChange={e => {
                setTechId(e.target.value);
                clearFilters();
              }}
              aria-label="Selecionar técnico"
            >
              {state.technicians.map(t => (
                <option key={t.id} value={t.id}>{t.name} · {t.vehicle}</option>
              ))}
            </select>
          )}
          <button className="button" onClick={() => openMovementModal('withdraw')}>
            <Icon name="plus" />Novo registro
          </button>
        </div>
      </div>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Histórico de movimentações</h2>
            <p>Entradas, retiradas, utilizações, devoluções, transferências e chegadas</p>
          </div>
          <button className="text-link" onClick={exportCSV}>
            <Icon name="download" />Exportar CSV
          </button>
        </div>
        <div className="toolbar">
          <div className="search">
            <Icon name="search" />
            <input
              className="input"
              placeholder="Buscar peça, OS ou local..."
              aria-label="Buscar no histórico"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <select
            aria-label="Filtrar tipo de movimentação"
            value={filterKind}
            onChange={e => setFilterKind(e.target.value)}
          >
            <option value="">Todas as movimentações</option>
            {Object.entries(kindMap).map(([k, v]) => (
              <option key={k} value={k}>{v[0]}</option>
            ))}
          </select>
          {ops && (
            <select
              aria-label="Filtrar técnico"
              value={filterTech}
              onChange={e => setFilterTech(e.target.value)}
            >
              <option value="">Todos os técnicos</option>
              {state.technicians.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
        </div>
        {renderMovementTable(filteredMovements)}
        <div className="table-footer">
          <span>{filteredMovements.length} {filteredMovements.length === 1 ? 'registro encontrado' : 'registros encontrados'}</span>
          <span>Mais recentes primeiro</span>
        </div>
      </section>
    </>
  );

  const renderTeamPage = () => (
    <>
      <div className="page-heading">
        <div>
          <h1>Equipe e Estoque Pessoal</h1>
          <p>Controle com o que cada técnico saiu hoje, o estoque pessoal em mãos e onde as peças foram utilizadas.</p>
        </div>
        <div className="heading-actions">
          <button className="button" onClick={() => openTechModal()}>
            <Icon name="plus" />Cadastrar técnico e saída
          </button>
        </div>
      </div>
      <div className="stats">
        <div className="stat-card featured">
          <div className="stat-top">Técnicos cadastrados<span className="stat-icon"><Icon name="users" /></span></div>
          <div className="stat-value mono">{String(state.technicians.length).padStart(2, '0')}</div>
          <div className="stat-foot">Com controle individual de estoque</div>
        </div>
        <div className="stat-card">
          <div className="stat-top">Com peças em mãos<span className="stat-icon"><Icon name="van" /></span></div>
          <div className="stat-value mono">{String(state.technicians.filter(t => calcTotal(state, t.id) > 0).length).padStart(2, '0')}</div>
          <div className="stat-foot">Técnicos com estoque pessoal ativo</div>
        </div>
        <div className="stat-card">
          <div className="stat-top">Total com técnicos<span className="stat-icon"><Icon name="box" /></span></div>
          <div className="stat-value mono">{String(state.technicians.reduce((acc, t) => acc + calcTotal(state, t.id), 0)).padStart(2, '0')}</div>
          <div className="stat-foot">Unidades em posse da equipe hoje</div>
        </div>
        <div className="stat-card">
          <div className="stat-top">Peças utilizadas<span className="stat-icon"><Icon name="pin" /></span></div>
          <div className="stat-value mono">{String(state.movements.filter(m => m.kind === 'use').reduce((acc, m) => acc + (m.qty || 0), 0)).padStart(2, '0')}</div>
          <div className="stat-foot">Baixas rastreadas com localização</div>
        </div>
      </div>
      {state.technicians.length ? (
        <div className="tech-grid">
          {state.technicians.map(t => {
            const linkedUser = users.find(u => u.technicianId === t.id);
            const tAlerts = allAlerts.filter(a => a.loc === t.id).length;
            const activeItems = state.parts
              .map(p => ({ part: p, qty: state.stock[t.id]?.[p.id] ?? 0 }))
              .filter(item => item.qty > 0);
            const lastUse = state.movements.find(m => m.technician === t.id && m.kind === 'use');
            const lastGps = parsePlacementGps(lastUse?.placement || t.client);
            return (
              <article key={t.id} className="panel tech-card">
                <div className="tech-card-head">
                  <div className={`avatar ${t.color}`}>{t.initials}</div>
                  <div>
                    <h3>{t.name}</h3>
                    <span className="muted small">
                      {t.vehicle}{linkedUser ? ` · @${linkedUser.username}` : ''}
                    </span>
                  </div>
                  <Badge
                    label={calcTotal(state, t.id) > 0 ? `${calcTotal(state, t.id)} un. consigo` : 'Estoque zerado'}
                    color={calcTotal(state, t.id) > 0 ? 'green' : 'amber'}
                    dot
                  />
                </div>
                <div className="tech-meta">
                  <div>
                    <small>ESTOQUE PESSOAL</small>
                    <strong>{calcTotal(state, t.id)} peças · {activeItems.length} tipos</strong>
                  </div>
                  <div>
                    <small>SAÍDA / ROTA DO DIA</small>
                    <strong>{t.order || 'Estoque de campo'}</strong>
                  </div>
                  <div>
                    <small>ÚLTIMO USO DE PEÇA</small>
                    <strong>
                      {lastUse ? `${fmtTime(lastUse.ts)} · ${lastGps.text.slice(0, 26)}` : 'Nenhum uso hoje'}
                    </strong>
                  </div>
                  <div>
                    <small>REPOSIÇÃO</small>
                    <strong>{tAlerts} {tAlerts === 1 ? 'saldo em atenção' : 'saldos em atenção'}</strong>
                  </div>
                </div>
                <div className="tech-kit-list">
                  {activeItems.length > 0 ? (
                    activeItems.slice(0, 6).map(({ part, qty }) => (
                      <span key={part.id} className="tech-kit-chip">
                        {part.name} <strong className="mono">{qty} {part.unit}</strong>
                      </span>
                    ))
                  ) : (
                    <span className="muted small">Nenhuma peça no estoque pessoal deste técnico.</span>
                  )}
                  {activeItems.length > 6 && (
                    <span className="tech-kit-chip">+{activeItems.length - 6} mais</span>
                  )}
                </div>
                <div className="tech-card-actions">
                  <button className="button secondary" onClick={() => setModal({ type: 'detail', techId: t.id })}>
                    Ver estoque e histórico <Icon name="arrow" />
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => openTechModal(t.id)}
                    title="Editar técnico ou abastecer saída do dia"
                    aria-label={`Editar ${t.name}`}
                  >
                    <Icon name="edit" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <section className="panel">
          <div className="empty">
            <Icon name="users" />
            <div>Nenhum técnico cadastrado.</div>
            <p>Clique em &ldquo;Cadastrar técnico&rdquo; para adicionar sua equipe de campo.</p>
          </div>
        </section>
      )}
    </>
  );

  const renderDailyDepartures = (technicianId?: string) => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Fortaleza' });
    const latest = new Map<string, Movement>();
    for (const movement of state.movements) {
      if (movement.kind !== 'departure' || (technicianId && movement.technician !== technicianId)) continue;
      if (new Date(movement.ts).toLocaleDateString('en-CA', { timeZone: 'America/Fortaleza' }) !== today) continue;
      const key = `${movement.technician}:${movement.part}`;
      if (!latest.has(key)) latest.set(key, movement);
    }
    const departures = [...latest.values()].filter(m => (m.qty || 0) > 0);
    return (
      <section className="panel" style={{ marginBottom: 22 }}>
        <div className="panel-head"><div><h2>Peças de saída do dia</h2>
          <p>Última declaração de cada peça hoje · {technicianId ? 'Visível ao operacional' : 'Informada pelos técnicos · atualização a cada 15 segundos'}</p></div></div>
        {departures.length ? renderMovementTable(departures) : <div className="empty">Nenhuma peça declarada para hoje.</div>}
      </section>
    );
  };

  const renderTechJourney = () => {
    if (!currentTech) {
      return (
        <>
          <div className="page-heading">
            <div>
              <h1>Espaço do Técnico</h1>
              <p>Nenhum técnico cadastrado ainda.</p>
            </div>
            {isOpsUser && (
              <div className="heading-actions">
                <button className="button" onClick={() => openTechModal()}>
                  <Icon name="plus" />Cadastrar técnico
                </button>
              </div>
            )}
          </div>
          <section className="panel">
            <div className="empty">
              <Icon name="van" />
              <div>Cadastre um técnico na operação.</div>
              <p>Para operar o estoque em campo, cadastre ao menos um técnico e seu veículo.</p>
            </div>
          </section>
        </>
      );
    }
    if (page === 'stock') return renderStockPage();
    if (page === 'movements') return renderMovementsPage();

    return (
      <>
        <div className="page-heading">
          <div>
            <span className="page-eyebrow">SEU ESPAÇO EM CAMPO</span>
            <h1>Olá, {currentTech.name.split(' ')[0]}.</h1>
            <p>Seu dia em campo começa por aqui.</p>
          </div>
          <div className="heading-actions">
            {isOpsUser && state.technicians.length > 0 && (
              <select
                className="tech-select"
                value={currentTech.id}
                onChange={e => {
                  setTechId(e.target.value);
                  clearFilters();
                }}
                aria-label="Selecionar técnico"
              >
                {state.technicians.map(t => (
                  <option key={t.id} value={t.id}>{t.name} · {t.vehicle}</option>
                ))}
              </select>
            )}
          </div>
        </div>
        {renderTechStats()}
        {renderDailyDepartures(currentTech.id)}
        <div className="grid-main">
          <section className="tech-hero">
            <div className="hero-top">
              <span className="eyebrow">
                MEU ESTOQUE PESSOAL E SAÍDA DO DIA · {currentTech.order || 'Campo'}
              </span>
              <Badge
                label={`${calcTotal(state, currentTech.id)} peças comigo`}
                color={calcTotal(state, currentTech.id) > 0 ? 'green' : 'amber'}
                dot
              />
            </div>
            <div>
              <h2>{calcTotal(state, currentTech.id)} unidades no estoque pessoal</h2>
              <p>
                <Icon name="pin" />
                Ao dar baixa em uma peça utilizada, o sistema ativa o GPS para registrar onde ela foi aplicada.
              </p>
            </div>
            <div className="hero-bottom">
              <button className="button lime" onClick={() => openMovementModal('use', currentTech.id)}>
                <Icon name="pin" />Utilizar peça (ativar localização)
              </button>
              <span className="muted">
                Baixa imediata do seu estoque<br />com localização GPS
              </span>
            </div>
            <button
              className="text-link"
              style={{ color: '#c1d6ac', marginTop: 17, position: 'relative', zIndex: 1 }}
              onClick={() => openMovementModal('departure', currentTech.id)}
            >
              Declarar peças de saída do dia <Icon name="arrow" />
            </button>
          </section>
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Movimente seu estoque</h2>
                <p>Cada registro mantém a operação atualizada</p>
              </div>
            </div>
            <div className="quick-actions">
              <button className="quick-action" onClick={() => openMovementModal('departure', currentTech.id)}>
                <span className="quick-icon"><Icon name="van" /></span>
                <div><strong>Registrar saída do dia</strong><small>Declare as peças do seu estoque que levará hoje</small></div>
                <Icon name="chevron" />
              </button>
              <button className="quick-action" onClick={() => openMovementModal('withdraw', currentTech.id)}>
                <span className="quick-icon"><Icon name="out" /></span>
                <div>
                  <strong>Retirar peças</strong>
                  <small>Da base para o seu veículo</small>
                </div>
                <Icon name="chevron" />
              </button>
              <button className="quick-action" onClick={() => openMovementModal('return', currentTech.id)}>
                <span className="quick-icon"><Icon name="in" /></span>
                <div>
                  <strong>Devolver peças</strong>
                  <small>Retorne o que não foi utilizado</small>
                </div>
                <Icon name="chevron" />
              </button>
              <button className="quick-action" onClick={() => openMovementModal('count', currentTech.id)}>
                <span className="quick-icon"><Icon name="edit" /></span>
                <div>
                  <strong>Informar estoque pessoal</strong>
                  <small>Informe o total de peças que já possui</small>
                </div>
                <Icon name="chevron" />
              </button>
            </div>
          </section>
        </div>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Meu estoque em campo</h2>
              <p>Peças disponíveis no {currentTech.vehicle}</p>
            </div>
            <button className="text-link" onClick={() => navigate('stock')}>
              Ver inventário <Icon name="arrow" />
            </button>
          </div>
          {state.parts.length ? (
            <div className="inventory-grid">
              {state.parts.slice(0, 6).map(p => {
                const qty = state.stock[currentTech.id]?.[p.id] ?? 0;
                const low = qty < p.min;
                return (
                  <article key={p.id} className="inventory-card">
                    <div className="inventory-top">
                      <span className="item-icon"><Icon name="box" /></span>
                      <Badge label={low ? 'Repor' : 'Disponível'} color={low ? 'amber' : 'green'} />
                    </div>
                    <h3>{p.name}</h3>
                    <span className="sku">{p.sku}</span>
                    <div className="inventory-bottom">
                      <div>
                        <strong>{qty}</strong>
                        <small>{p.unit}</small>
                      </div>
                      <button
                        className="button secondary"
                        disabled={qty === 0}
                        onClick={() => openMovementModal('use', currentTech.id, p.id)}
                      >
                        Usar peça <Icon name="arrow" />
                      </button>
                    </div>
                    <div className="inventory-track">
                      <span
                        style={{
                          width: `${Math.min(100, (qty / Math.max(1, p.min * 3)) * 100)}%`,
                          background: low ? '#cbaa72' : undefined,
                        }}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty">
              <Icon name="box" />
              <div>Nenhum produto cadastrado no catálogo.</div>
              <p>Aguarde o cadastro de produtos pela operação.</p>
            </div>
          )}
        </section>
        <section className="panel" style={{ marginTop: 22 }}>
          <div className="panel-head">
            <div>
              <h2>Minha atividade recente</h2>
              <p>Seu histórico de peças e atendimentos</p>
            </div>
            <button className="text-link" onClick={() => navigate('movements')}>
              Ver histórico <Icon name="arrow" />
            </button>
          </div>
          {renderMovementTable(state.movements.filter(m => m.technician === currentTech.id).slice(0, 4))}
        </section>
      </>
    );
  };

  const renderModal = () => {
    if (!modal) return null;

    if (modal.type === 'movement') {
      const kind = modal.kind;
      const labels: Record<string, [string, string, string]> = {
        withdraw: ['Registrar retirada', 'Escolha o estoque de origem para abastecer o técnico.', 'Confirmar retirada'],
        return: ['Registrar devolução', 'Escolha o estoque que receberá as peças devolvidas.', 'Confirmar devolução'],
        use: ['Registrar utilização', 'Vincule a peça ao atendimento e ao local onde foi aplicada.', 'Confirmar utilização'],
        count: ['Informar estoque pessoal', 'Informe o total que você já possui de cada peça do catálogo e a origem ou justificativa.', 'Salvar estoque pessoal'],
        departure: ['Registrar saída do dia', 'Informe quantas unidades do seu estoque levará hoje. O registro mantém o saldo e fica visível ao operacional. Para corrigir, registre novamente o total da peça.', 'Registrar saída'],
        stockout: ['Saída de estoque', 'Registre uma baixa por venda, consumo ou perda.', 'Confirmar saída'],
        entry: ['Entrada de estoque', 'Adicione novas unidades compradas ou recebidas diretamente em uma base.', 'Confirmar entrada'],
      };
      const [title, sub, submitLabel] = labels[kind] || labels.withdraw;
      const tabs: [MovementKind, string][] = [
        ['withdraw', 'Retirada'],
        ['use', 'Utilização'],
        ['return', 'Devolução'],
        ['count', 'Estoque pessoal'],
        ['departure', 'Saída do dia'],
        ...(ops ? ([['entry', 'Entrada'], ...(companyConfig.stockOut ? [['stockout', 'Saída de estoque']] : []), ...(companyConfig.transfers ? [['transfer', 'Transferir']] : [])] as [MovementKind, string][]) : []),
      ];

      const selTech = techById(moveTechId);
      const baseQty = state.stock[moveWarehouseId]?.[movePartId] ?? 0;
      const ownQty = selTech ? state.stock[selTech.id]?.[movePartId] ?? 0 : 0;
      const nextQty = kind === 'departure' ? ownQty : kind === 'count' ? moveQty : kind === 'withdraw' ? ownQty + moveQty : ownQty - moveQty;
      const existingSlot = state.locations[moveWarehouseId]?.[movePartId];

      const handleMovementSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        setFormError('');
        try {
          const payload: Record<string, unknown> = {
            kind,
            technician: moveTechId,
            part: movePartId,
            warehouse: moveWarehouseId,
            qty: moveQty,
            note: moveNote,
          };
          if (kind === 'use') {
            payload.order = moveOrder || selTech?.order || 'Campo';
            const basePlace = [moveSite.trim(), movePlacement.trim()].filter(Boolean).join(' · ');
            const gpsSuffix = geoCoords ? ` [GPS: ${geoCoords.lat}, ${geoCoords.lng}]` : '';
            payload.placement = `${basePlace || (geoCoords ? `Lat ${geoCoords.lat}, Lng ${geoCoords.lng}` : '')}${gpsSuffix}`.trim();
          }
          if (kind === 'entry' && !existingSlot) {
            payload.corridor = moveCorridor;
            payload.shelf = moveShelf;
          }
          const res = await apiCall('POST', '/api/movements', payload);
          applyServerPayload(res);
          setModal(null);
          showToast(`${kind === 'count' ? 'Contagem atualizada' : `${kindMap[kind][0]} registrada`}. Saldos atualizados.`);
        } catch (err) {
          setFormError(err instanceof Error ? err.message : 'Erro na movimentação.');
        }
      };

      return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <section className="modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <h2>{title}</h2>
                <p>{sub}</p>
              </div>
              <button className="modal-close" type="button" onClick={() => setModal(null)} aria-label="Fechar janela">
                <Icon name="close" />
              </button>
            </div>
            <form onSubmit={handleMovementSubmit}>
              <div className="modal-body">
                <div className="form-tabs" aria-label="Tipo de registro">
                  {tabs.map(([k, v]) => (
                    <button
                      key={k}
                      type="button"
                      className={kind === k ? 'active' : ''}
                      onClick={() => openMovementModal(k, moveTechId, movePartId, moveWarehouseId)}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                {formError && <div className="error" role="alert">{formError}</div>}
                {!['entry', 'stockout'].includes(kind) && (
                  ops ? (
                    <div className="field">
                      <label htmlFor="move-tech">Técnico responsável</label>
                      <select
                        id="move-tech"
                        value={moveTechId}
                        onChange={e => {
                          const nextTid = e.target.value;
                          setMoveTechId(nextTid);
                          const t = techById(nextTid);
                          if (t && kind === 'use') {
                            setMoveOrder(t.order);
                            setMoveSite(t.client);
                          }
                          if (kind === 'count') {
                            setMoveQty(state.stock[nextTid]?.[movePartId] ?? 0);
                          }
                        }}
                      >
                        {state.technicians.map(t => (
                          <option key={t.id} value={t.id}>{t.name} · {t.vehicle}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    selTech && (
                      <div className="stock-note">
                        <Icon name="van" />{selTech.name} · {selTech.vehicle}
                      </div>
                    )
                  )
                )}
                <div className="field">
                  <label htmlFor="move-part">Peça</label>
                  <select
                    id="move-part"
                    value={movePartId}
                    onChange={e => {
                      const nextPid = e.target.value;
                      setMovePartId(nextPid);
                      if (kind === 'count') {
                        setMoveQty(state.stock[moveTechId]?.[nextPid] ?? 0);
                      }
                    }}
                  >
                    {state.parts.map(x => (
                      <option key={x.id} value={x.id}>{x.sku} · {x.name}</option>
                    ))}
                  </select>
                </div>
                {['withdraw', 'return', 'entry', 'stockout'].includes(kind) && (
                  <div className="field">
                    <label htmlFor="move-warehouse">
                      {['withdraw', 'stockout'].includes(kind) ? 'Estoque de origem' : kind === 'entry' ? 'Estoque de destino' : 'Estoque de devolução'}
                    </label>
                    <select
                      id="move-warehouse"
                      value={moveWarehouseId}
                      onChange={e => setMoveWarehouseId(e.target.value)}
                    >
                      {state.warehouses.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                    <small>{slotLabel(existingSlot)}</small>
                  </div>
                )}
                {kind === 'entry' && !existingSlot && (
                  <div className="form-grid">
                    <div className="field">
                      <label htmlFor="entry-corridor">Corredor no estoque *</label>
                      <input
                        className="input"
                        id="entry-corridor"
                        value={moveCorridor}
                        onChange={e => setMoveCorridor(e.target.value)}
                        placeholder="Ex.: A ou 01"
                        maxLength={40}
                        required
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="entry-shelf">Prateleira no estoque *</label>
                      <input
                        className="input"
                        id="entry-shelf"
                        value={moveShelf}
                        onChange={e => setMoveShelf(e.target.value)}
                        placeholder="Ex.: 03"
                        maxLength={40}
                        required
                      />
                    </div>
                  </div>
                )}
                <div className="balance-preview">
                  {['entry', 'stockout'].includes(kind) ? (
                    <>
                      <span>Saldo atual na base: <strong>{baseQty} un.</strong></span>
                      <span>
                        Após movimentação:{' '}
                        <strong>
                          {!Number.isSafeInteger(moveQty) || moveQty < 1 ? 'Quantidade inválida' : `${kind === 'stockout' ? baseQty - moveQty : baseQty + moveQty} un.`}
                        </strong>
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        {kind === 'withdraw' ? 'Base: ' : 'Saldo atual: '}
                        <strong>{kind === 'withdraw' ? baseQty : ownQty} un.</strong>
                      </span>
                      <span>
                        {kind === 'withdraw'
                          ? 'Técnico'
                          : kind === 'return'
                          ? 'Base após retorno'
                          : kind === 'count'
                          ? 'Após ajuste'
                          : kind === 'departure' ? 'Saldo pessoal' : 'Após utilização'}
                        :{' '}
                        <strong>
                          {!Number.isSafeInteger(moveQty) ||
                          moveQty < (['count', 'departure'].includes(kind) ? 0 : 1) ||
                          (kind === 'withdraw' && moveQty > baseQty) ||
                          (['return', 'use', 'departure'].includes(kind) && moveQty > ownQty)
                            ? 'Quantidade inválida'
                            : `${kind === 'return' ? baseQty + moveQty : nextQty} un.`}
                        </strong>
                      </span>
                    </>
                  )}
                </div>
                <div className="field">
                  <label htmlFor="move-qty">
                    {kind === 'count' ? 'Quantidade encontrada na contagem' : 'Quantidade (unidades)'}
                  </label>
                  <input
                    className="input"
                    id="move-qty"
                    type="number"
                    min={['count', 'departure'].includes(kind) ? 0 : 1}
                    step={1}
                    value={moveQty}
                    onChange={e => setMoveQty(Number(e.target.value))}
                    required
                  />
                  <small>
                    {kind === 'count'
                      ? 'O saldo será substituído pela contagem informada.'
                      : kind === 'departure' ? 'Informe o total levado hoje. Zero cancela a declaração anterior desta peça no dia.' : 'Use apenas números inteiros. O saldo não pode ficar negativo.'}
                  </small>
                </div>
                {kind === 'use' && (
                  <>
                    <div
                      className="stock-note"
                      style={{
                        background: geoStatus === 'success' ? '#eef5ea' : geoStatus === 'error' ? '#faf2e3' : '#f4f7f2',
                        color: geoStatus === 'success' ? '#2d4b22' : geoStatus === 'error' ? '#8c6d32' : '#43553b',
                        flexWrap: 'wrap',
                        gap: 8,
                      }}
                    >
                      <Icon name="pin" />
                      <div style={{ flex: 1, minWidth: 200 }}>
                        {geoStatus === 'loading' && (
                          <strong>Ativando GPS para identificar onde a peça está sendo utilizada...</strong>
                        )}
                        {geoStatus === 'success' && geoCoords && (
                          <>
                            <strong>Localização GPS capturada automaticamente</strong>
                            <div className="small muted">
                              Coordenadas: {geoCoords.lat}, {geoCoords.lng} (precisão ±{geoCoords.accuracy}m)
                            </div>
                          </>
                        )}
                        {geoStatus === 'error' && (
                          <>
                            <strong>GPS não capturado automaticamente</strong>
                            <div className="small">{geoError}</div>
                          </>
                        )}
                        {geoStatus === 'idle' && (
                          <strong>Clique ao lado para ativar sua localização GPS atual</strong>
                        )}
                      </div>
                      <button
                        type="button"
                        className="button secondary"
                        style={{ padding: '6px 12px', fontSize: '.78rem' }}
                        onClick={captureGeolocation}
                      >
                        <Icon name="pin" />
                        {geoStatus === 'loading' ? 'Buscando GPS...' : 'Atualizar localização GPS'}
                      </button>
                    </div>
                    <div className="form-grid">
                      <div className="field">
                        <label htmlFor="move-place">Endereço / Local de utilização (GPS) *</label>
                        <input
                          className="input"
                          id="move-place"
                          value={moveSite}
                          onChange={e => setMoveSite(e.target.value)}
                          placeholder="Preenchido pelo GPS ou digite o endereço/cliente"
                          maxLength={130}
                          required
                        />
                        <small>Identifica para a empresa onde a peça do seu estoque pessoal foi aplicada.</small>
                      </div>
                      <div className="field">
                        <label htmlFor="move-order">OS / Referência (opcional)</label>
                        <input
                          className="input"
                          id="move-order"
                          value={moveOrder}
                          onChange={e => setMoveOrder(e.target.value)}
                          placeholder="Ex.: OS-2048"
                          maxLength={100}
                        />
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor="move-placement">Complemento / Ponto de aplicação (opcional)</label>
                      <input
                        className="input"
                        id="move-placement"
                        value={movePlacement}
                        onChange={e => setMovePlacement(e.target.value)}
                        maxLength={150}
                        placeholder="Ex.: poste 14, rack principal, caixa CTO, sala 03"
                      />
                    </div>
                  </>
                )}
                <div className="field">
                  <label htmlFor="move-note">
                    {kind === 'return'
                      ? 'Motivo da devolução *'
                      : kind === 'count'
                      ? 'Justificativa do ajuste *'
                      : kind === 'entry'
                      ? 'Nota fiscal / origem da entrada'
                      : 'Observações (opcional)'}
                  </label>
                  <textarea
                    id="move-note"
                    value={moveNote}
                    onChange={e => setMoveNote(e.target.value)}
                    maxLength={300}
                    required={['return', 'count'].includes(kind)}
                    placeholder={
                      kind === 'return'
                        ? 'Ex.: sobra do atendimento, peça sem uso e em boas condições'
                        : kind === 'count'
                        ? 'Ex.: diferença identificada na conferência do veículo'
                        : kind === 'entry'
                        ? 'Ex.: NF 45890 · reposição de fornecedor'
                        : 'Detalhes adicionais sobre este registro'
                    }
                  />
                </div>
                <div className="form-note">
                  <Icon name="shield" />Registro auditado e gravado no banco de dados da operação.
                </div>
              </div>
              <div className="modal-footer">
                <button className="button secondary" type="button" onClick={() => setModal(null)}>Cancelar</button>
                <button className="button" type="submit"><Icon name="check" />{submitLabel}</button>
              </div>
            </form>
          </section>
        </div>
      );
    }

    if (modal.type === 'arrival') {
      const t = techById(modal.techId);
      if (!t) return null;
      return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <section className="modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <h2>Registrar chegada</h2>
                <p>Confirme o local e avise a operação que o atendimento começou.</p>
              </div>
              <button className="modal-close" type="button" onClick={() => setModal(null)} aria-label="Fechar janela">
                <Icon name="close" />
              </button>
            </div>
            <form
              onSubmit={async ev => {
                ev.preventDefault();
                setFormError('');
                const fd = Object.fromEntries(new FormData(ev.currentTarget));
                try {
                  const res = await apiCall('POST', '/api/movements', {
                    ...fd,
                    kind: 'arrival',
                    technician: t.id,
                  });
                  applyServerPayload(res);
                  showToast('Chegada registrada. A operação já pode acompanhar.');
                  if (modal.returnToUsePartId) {
                    openMovementModal('use', t.id, modal.returnToUsePartId);
                  } else {
                    setModal(null);
                  }
                } catch (err) {
                  setFormError(err instanceof Error ? err.message : 'Erro ao registrar chegada.');
                }
              }}
            >
              <div className="modal-body">
                <div className="stock-note"><Icon name="van" />{t.name} · {t.vehicle}</div>
                {formError && <div className="error" role="alert">{formError}</div>}
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="arrival-order">Ordem de serviço *</label>
                    <input
                      id="arrival-order"
                      className="input"
                      name="order"
                      defaultValue={t.order === 'Sem OS' ? '' : t.order}
                      placeholder="Ex.: OS-2048"
                      maxLength={100}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="arrival-place">Local de chegada *</label>
                    <input
                      id="arrival-place"
                      className="input"
                      name="placement"
                      defaultValue={t.client === 'Base Operacional' ? '' : t.client}
                      placeholder="Nome do cliente ou local"
                      maxLength={150}
                      required
                    />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="arrival-note">Observações (opcional)</label>
                  <textarea name="note" id="arrival-note" maxLength={300} placeholder="Ex.: aguardando liberação na recepção" />
                </div>
                <div className="balance-preview">
                  <span>Após confirmar</span>
                  <strong>Em atendimento</strong>
                </div>
                <div className="form-note">
                  <Icon name="clock" />O horário da confirmação será registrado no histórico da operação.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="button secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="button"><Icon name="pin" />Confirmar chegada</button>
              </div>
            </form>
          </section>
        </div>
      );
    }

    if (modal.type === 'finish') {
      const t = techById(modal.techId);
      if (!t) return null;
      return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <section className="modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <h2>Concluir atendimento</h2>
                <p>{t.order} · {t.client}</p>
              </div>
              <button className="modal-close" type="button" onClick={() => setModal(null)} aria-label="Fechar janela">
                <Icon name="close" />
              </button>
            </div>
            <div className="modal-body">
              <div className="guide-summary">
                As peças utilizadas permanecem vinculadas à OS. Após concluir, o técnico ficará disponível. Peças restantes continuam no seu estoque e podem ser devolvidas à base.
              </div>
              {formError && <div className="error" role="alert">{formError}</div>}
            </div>
            <div className="modal-footer">
              <button className="button secondary" onClick={() => setModal(null)}>Voltar</button>
              <button
                className="button"
                onClick={async () => {
                  try {
                    const res = await apiCall('POST', '/api/movements', { kind: 'finish', technician: t.id });
                    applyServerPayload(res);
                    setModal(null);
                    showToast('Atendimento concluído. Técnico disponível.');
                  } catch (err) {
                    setFormError(err instanceof Error ? err.message : 'Erro ao concluir.');
                  }
                }}
              >
                <Icon name="check" />Concluir atendimento
              </button>
            </div>
          </section>
        </div>
      );
    }

    if (modal.type === 'detail') {
      const t = techById(modal.techId);
      if (!t) return null;
      const events = state.movements.filter(m => m.technician === t.id);
      const a = allAlerts.filter(x => x.loc === t.id);
      return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <section className="modal wide" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <h2>{t.name}</h2>
                <p>{t.vehicle} · {t.region} · {statusMap[t.status][0]}</p>
              </div>
              <button className="modal-close" type="button" onClick={() => setModal(null)} aria-label="Fechar janela">
                <Icon name="close" />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-stats">
                <div><small>ESTOQUE PESSOAL ATUAL</small><strong>{calcTotal(state, t.id)}</strong></div>
                <div><small>SALDOS EM ATENÇÃO</small><strong>{a.length}</strong></div>
                <div><small>ÚLTIMO USO DE PEÇA</small><strong style={{ fontSize: 18 }}>{t.checkedAt ? fmtTime(t.checkedAt) : '—'}</strong></div>
              </div>
              <div className="stock-note">
                <Icon name="pin" />
                <span>
                  {t.order || 'Estoque pessoal'} · {parsePlacementGps(t.client).text}<br />
                  <span className="small muted">{t.region}</span>
                </span>
                <button
                  type="button"
                  className="text-link"
                  style={{ marginLeft: 'auto' }}
                  onClick={() => openTechModal(t.id)}
                >
                  <Icon name="edit" />Editar / Abastecer saída
                </button>
              </div>
              <h3 style={{ marginBottom: 12 }}>Estoque pessoal com o técnico</h3>
              {state.parts.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Peça</th><th>Saldo</th><th>Situação</th></tr>
                    </thead>
                    <tbody>
                      {state.parts.map(p => {
                        const q = state.stock[t.id]?.[p.id] ?? 0;
                        return (
                          <tr key={p.id}>
                            <td><strong>{p.name}</strong><span className="cell-sub">{p.sku}</span></td>
                            <td>{q} un.</td>
                            <td><Badge label={q < p.min ? 'Repor' : 'Regular'} color={q < p.min ? 'amber' : 'green'} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted small">Nenhum produto cadastrado.</p>
              )}
              <h3 style={{ margin: '24px 0 8px' }}>Histórico de saídas e peças utilizadas</h3>
              {events.length ? (
                events.slice(0, 6).map(m => {
                  const evGps = parsePlacementGps(m.placement);
                  return (
                    <div key={m.id} className="timeline-item">
                      <Icon name={kindMap[m.kind]?.[2] || 'box'} />
                      <div>
                        <strong>
                          {kindMap[m.kind]?.[0] || m.kind}
                          {m.part ? ` · ${partById(m.part)?.name || ''} · ${m.qty} un.` : ''}
                        </strong>
                        <p>
                          {evGps.text !== '—' ? evGps.text : m.note || 'Base operacional'}{' '}
                          {m.order ? `· ${m.order}` : ''}
                          {evGps.mapUrl && (
                            <a
                              href={evGps.mapUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-link"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '.76rem', marginLeft: 8 }}
                            >
                              <Icon name="pin" />Ver localização no Mapa
                            </a>
                          )}
                        </p>
                        <p>{fmtDate(m.ts)} às {fmtTime(m.ts)}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="muted small">Nenhuma atividade registrada.</p>
              )}
            </div>
            <div className="modal-footer">
              <button className="button secondary" onClick={() => setModal(null)}>Fechar</button>
              <button
                className="button"
                onClick={() => {
                  setTechId(t.id);
                  setView('tech');
                  setPage('overview');
                  clearFilters();
                  setModal(null);
                }}
              >
                <Icon name="van" />Abrir visão do técnico
              </button>
            </div>
          </section>
        </div>
      );
    }

    if (modal.type === 'warehouse') {
      const w = warehouseById(modal.warehouseId);
      const editing = Boolean(w);
      return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <section className="modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <h2>{editing ? 'Editar estoque' : 'Cadastrar estoque'}</h2>
                <p>{editing ? 'Atualize os dados cadastrais desta base operacional.' : 'Crie uma base para organizar produtos e receber transferências.'}</p>
              </div>
              <button className="modal-close" type="button" onClick={() => setModal(null)} aria-label="Fechar janela">
                <Icon name="close" />
              </button>
            </div>
            <form
              onSubmit={async ev => {
                ev.preventDefault();
                setFormError('');
                const fd = Object.fromEntries(new FormData(ev.currentTarget));
                try {
                  const res = await apiCall('POST', '/api/warehouses', fd);
                  applyServerPayload(res);
                  setModal(null);
                  setPage('warehouses');
                  clearFilters();
                  showToast(editing ? 'Estoque atualizado com sucesso.' : 'Estoque cadastrado. Pronto para receber produtos.');
                } catch (err) {
                  setFormError(err instanceof Error ? err.message : 'Erro ao salvar estoque.');
                }
              }}
            >
              <div className="modal-body">
                {formError && <div className="error" role="alert">{formError}</div>}
                <input type="hidden" name="id" value={w?.id || ''} />
                <div className="field">
                  <label htmlFor="wh-name">Nome do estoque *</label>
                  <input className="input" name="name" id="wh-name" defaultValue={w?.name || ''} placeholder="Ex.: Almoxarifado Parangaba" maxLength={80} required />
                </div>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="wh-code">Código do estoque *</label>
                    <input className="input" name="code" id="wh-code" defaultValue={w?.code || ''} placeholder="Ex.: PRG" pattern="[A-Za-z0-9-]{2,12}" maxLength={12} required />
                    <small>Código único, com 2 a 12 caracteres.</small>
                  </div>
                  <div className="field">
                    <label htmlFor="wh-city">Cidade / UF *</label>
                    <input className="input" name="city" id="wh-city" defaultValue={w?.city || ''} placeholder="Ex.: Fortaleza, CE" maxLength={100} required />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="wh-responsible">Responsável pelo estoque *</label>
                  <input className="input" name="responsible" id="wh-responsible" defaultValue={w?.responsible || ''} placeholder="Nome do responsável" maxLength={100} required />
                </div>
                <div className="field">
                  <label htmlFor="wh-address">Endereço da base (opcional)</label>
                  <input className="input" name="address" id="wh-address" defaultValue={w?.address || ''} placeholder="Rua, número e bairro" maxLength={180} />
                </div>
                {!editing && (
                  <div className="guide-summary">
                    O estoque começa vazio. Para abastecê-lo, transfira peças de outra base ou cadastre um produto com saldo inicial.
                  </div>
                )}
              </div>
              <div className="modal-footer">
                {editing && w && (
                  <button
                    type="button"
                    className="button danger"
                    style={{ marginRight: 'auto' }}
                    onClick={async () => {
                      setFormError('');
                      try {
                        const res = await apiCall('DELETE', `/api/warehouses/${encodeURIComponent(w.id)}`);
                        applyServerPayload(res);
                        setModal(null);
                        setPage('warehouses');
                        showToast('Estoque excluído com sucesso.');
                      } catch (err) {
                        setFormError(err instanceof Error ? err.message : 'Erro ao excluir estoque.');
                      }
                    }}
                  >
                    <Icon name="trash" />Excluir
                  </button>
                )}
                <button type="button" className="button secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="button"><Icon name="check" />{editing ? 'Salvar alterações' : 'Salvar estoque'}</button>
              </div>
            </form>
          </section>
        </div>
      );
    }

    if (modal.type === 'product') {
      const p = partById(modal.partId);
      const editing = Boolean(p);
      return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <section className="modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <h2>{editing ? 'Editar produto e endereço' : 'Cadastrar produto'}</h2>
                <p>{editing ? 'Atualize o cadastro e defina o endereço no estoque selecionado.' : 'Defina o código, o estoque e o endereço físico da peça.'}</p>
              </div>
              <button className="modal-close" type="button" onClick={() => setModal(null)} aria-label="Fechar janela">
                <Icon name="close" />
              </button>
            </div>
            <form
              onSubmit={async ev => {
                ev.preventDefault();
                setFormError('');
                const fd = Object.fromEntries(new FormData(ev.currentTarget));
                try {
                  const res = await apiCall('POST', '/api/products', fd);
                  applyServerPayload(res);
                  setModal(null);
                  setPage('products');
                  clearFilters();
                  showToast(editing ? 'Produto e endereço atualizados.' : 'Produto cadastrado com corredor e prateleira.');
                } catch (err) {
                  setFormError(err instanceof Error ? err.message : 'Erro ao salvar produto.');
                }
              }}
            >
              <div className="modal-body">
                {formError && <div className="error" role="alert">{formError}</div>}
                <input type="hidden" name="id" value={p?.id || ''} />
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="product-sku">Código / SKU *</label>
                    <input className="input" name="sku" id="product-sku" defaultValue={p?.sku || ''} placeholder="Ex.: GS-009" maxLength={50} required />
                  </div>
                  <div className="field">
                    <label htmlFor="product-category">Categoria *</label>
                    <input className="input" name="category" id="product-category" defaultValue={p?.category || ''} placeholder="Ex.: Conectividade" list="category-options" maxLength={60} required />
                    <datalist id="category-options">
                      {[...new Set(state.parts.map(x => x.category))].map(c => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="product-name">Nome do produto *</label>
                  <input className="input" name="name" id="product-name" defaultValue={p?.name || ''} placeholder="Ex.: Conector RJ45 CAT6" maxLength={100} required />
                </div>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="product-min">Estoque mínimo por base *</label>
                    <input className="input" name="baseMin" id="product-min" type="number" min={0} step={1} defaultValue={p?.baseMin ?? 10} required />
                  </div>
                  <div className="field">
                    <label htmlFor="product-tech-min">Mínimo por técnico *</label>
                    <input className="input" name="min" id="product-tech-min" type="number" min={0} step={1} defaultValue={p?.min ?? 2} required />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="product-qty">{editing ? 'Saldo no estoque selecionado (consulta)' : 'Quantidade inicial (unidades) *'}</label>
                  {editing ? (
                    <input className="input" type="number" value={state.stock[prodWarehouseId]?.[p!.id] ?? 0} disabled />
                  ) : (
                    <input className="input" name="qty" id="product-qty" type="number" min={0} step={1} defaultValue={0} required />
                  )}
                </div>
                <div className="form-section-label"><Icon name="pin" />ENDEREÇO DO PRODUTO</div>
                <div className="field">
                  <label htmlFor="product-warehouse">Estoque do produto *</label>
                  <select
                    id="product-warehouse"
                    name="warehouse"
                    value={prodWarehouseId}
                    onChange={e => {
                      const nextWid = e.target.value;
                      setProdWarehouseId(nextWid);
                      const slot = p ? state.locations[nextWid]?.[p.id] : undefined;
                      setProdCorridor(slot?.corridor || '');
                      setProdShelf(slot?.shelf || '');
                    }}
                  >
                    {state.warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                    ))}
                  </select>
                </div>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="product-corridor">Corredor *</label>
                    <input
                      className="input"
                      id="product-corridor"
                      name="corridor"
                      value={prodCorridor}
                      onChange={e => setProdCorridor(e.target.value)}
                      placeholder="Ex.: A ou 01"
                      maxLength={40}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="product-shelf">Prateleira *</label>
                    <input
                      className="input"
                      id="product-shelf"
                      name="shelf"
                      value={prodShelf}
                      onChange={e => setProdShelf(e.target.value)}
                      placeholder="Ex.: 03"
                      maxLength={40}
                      required
                    />
                  </div>
                </div>
                <div className="form-note">
                  <Icon name="help" />
                  {editing
                    ? 'O endereço pertence ao estoque escolhido. Saldos são alterados por movimentações.'
                    : 'O saldo inicial entra no estoque selecionado e o produto fica disponível no catálogo da rede.'}
                </div>
              </div>
              <div className="modal-footer">
                {editing && p && (
                  <button
                    type="button"
                    className="button danger"
                    style={{ marginRight: 'auto' }}
                    onClick={async () => {
                      setFormError('');
                      try {
                        const res = await apiCall('DELETE', `/api/products/${encodeURIComponent(p.id)}`);
                        applyServerPayload(res);
                        setModal(null);
                        setPage('products');
                        showToast('Produto excluído do catálogo.');
                      } catch (err) {
                        setFormError(err instanceof Error ? err.message : 'Erro ao excluir produto.');
                      }
                    }}
                  >
                    <Icon name="trash" />Excluir
                  </button>
                )}
                <button type="button" className="button secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="button"><Icon name="check" />{editing ? 'Salvar alterações' : 'Salvar produto'}</button>
              </div>
            </form>
          </section>
        </div>
      );
    }

    if (modal.type === 'tech') {
      const t = techById(modal.techId);
      const editing = Boolean(t);
      const linkedUser = editing ? users.find(u => u.technicianId === t?.id) : undefined;

      return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <section className="modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <h2>{editing ? 'Editar técnico' : 'Cadastrar técnico'}</h2>
                <p>
                  {editing
                    ? 'Atualize os dados e o acesso individual do técnico.'
                    : 'Cadastre o técnico. Ele poderá informar seu estoque e registrar as saídas na área do técnico.'}
                </p>
              </div>
              <button className="modal-close" type="button" onClick={() => setModal(null)} aria-label="Fechar janela">
                <Icon name="close" />
              </button>
            </div>
            <form
              onSubmit={async ev => {
                ev.preventDefault();
                setFormError('');
                const fd = Object.fromEntries(new FormData(ev.currentTarget));
                try {
                  const res = await apiCall('POST', '/api/technicians', fd);
                  applyServerPayload(res);
                  setModal(null);
                  setPage('team');
                  clearFilters();
                  showToast(
                    editing
                      ? 'Cadastro do técnico atualizado.'
                      : 'Técnico cadastrado. O estoque pode ser informado na área do técnico.'
                  );
                } catch (err) {
                  setFormError(err instanceof Error ? err.message : 'Erro ao salvar técnico.');
                }
              }}
            >
              <div className="modal-body">
                {formError && <div className="error" role="alert">{formError}</div>}
                <input type="hidden" name="id" value={t?.id || ''} />
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="tech-name">Nome completo do técnico *</label>
                    <input
                      className="input"
                      id="tech-name"
                      name="name"
                      defaultValue={t?.name || ''}
                      placeholder="Ex.: Rafael Lima"
                      maxLength={80}
                      required
                    />
                  </div>
                </div>

                <div className="form-section-label">
                  <Icon name="shield" />CREDENCIAIS DE ACESSO DO TÉCNICO (OPCIONAL)
                </div>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="tech-username">Usuário de login</label>
                    <input
                      className="input"
                      id="tech-username"
                      name="username"
                      defaultValue={linkedUser?.username || ''}
                      placeholder="Ex.: rafael"
                      maxLength={50}
                    />
                    <small>Acesso individual em /tecnico para controlar estoque pessoal e saídas do dia.</small>
                  </div>
                  <div className="field">
                    <label htmlFor="tech-password">
                      {linkedUser ? 'Nova senha (deixe vazio p/ manter)' : 'Senha de acesso'}
                    </label>
                    <input
                      className="input"
                      id="tech-password"
                      name="password"
                      type="password"
                      placeholder={linkedUser ? '••••••••' : 'Mínimo de 4 caracteres'}
                      minLength={4}
                      autoComplete="new-password"
                      maxLength={60}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                {editing && t && (
                  <button
                    type="button"
                    className="button danger"
                    style={{ marginRight: 'auto' }}
                    onClick={async () => {
                      setFormError('');
                      try {
                        const res = await apiCall('DELETE', `/api/technicians/${encodeURIComponent(t.id)}`);
                        applyServerPayload(res);
                        setModal(null);
                        setPage('team');
                        showToast('Técnico excluído com sucesso.');
                      } catch (err) {
                        setFormError(err instanceof Error ? err.message : 'Erro ao excluir técnico.');
                      }
                    }}
                  >
                    <Icon name="trash" />Excluir
                  </button>
                )}
                <button type="button" className="button secondary" onClick={() => setModal(null)}>
                  Cancelar
                </button>
                <button type="submit" className="button">
                  <Icon name="check" />
                  {editing ? 'Salvar técnico' : 'Cadastrar técnico'}
                </button>
              </div>
            </form>
          </section>
        </div>
      );
    }

    if (modal.type === 'transfer') {
      const originParts = state.parts.filter(p => state.locations[trFrom]?.[p.id]);
      const activePartId = originParts.some(p => p.id === trPart) ? trPart : originParts[0]?.id || '';
      const fromSlot = state.locations[trFrom]?.[activePartId];
      const toSlot = state.locations[trTo]?.[activePartId];
      const fromQty = state.stock[trFrom]?.[activePartId] || 0;
      const toQty = state.stock[trTo]?.[activePartId] || 0;
      const valid = Number.isSafeInteger(trQty) && trQty > 0 && trQty <= fromQty && trFrom !== trTo;

      return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <section className="modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <h2>Transferir entre estoques</h2>
                <p>Movimente peças entre bases com saldo e endereço rastreáveis.</p>
              </div>
              <button className="modal-close" type="button" onClick={() => setModal(null)} aria-label="Fechar janela">
                <Icon name="close" />
              </button>
            </div>
            <form
              onSubmit={async ev => {
                ev.preventDefault();
                setFormError('');
                try {
                  const res = await apiCall('POST', '/api/movements', {
                    kind: 'transfer',
                    from: trFrom,
                    to: trTo,
                    part: activePartId,
                    qty: trQty,
                    corridor: trCorridor,
                    shelf: trShelf,
                    note: trNote,
                  });
                  applyServerPayload(res);
                  setModal(null);
                  showToast('Transferência concluída. Saldos dos dois estoques atualizados.');
                } catch (err) {
                  setFormError(err instanceof Error ? err.message : 'Erro na transferência.');
                }
              }}
            >
              <div className="modal-body">
                {formError && <div className="error" role="alert">{formError}</div>}
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="transfer-from">Estoque de origem *</label>
                    <select
                      id="transfer-from"
                      value={trFrom}
                      onChange={e => {
                        const nextFrom = e.target.value;
                        setTrFrom(nextFrom);
                        if (nextFrom === trTo) {
                          setTrTo(state.warehouses.find(w => w.id !== nextFrom)?.id || nextFrom);
                        }
                      }}
                    >
                      {state.warehouses.map(w => (
                        <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="transfer-to">Estoque de destino *</label>
                    <select id="transfer-to" value={trTo} onChange={e => setTrTo(e.target.value)}>
                      {state.warehouses.map(w => (
                        <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="transfer-part">Produto *</label>
                  <select
                    id="transfer-part"
                    value={activePartId}
                    onChange={e => setTrPart(e.target.value)}
                    required
                  >
                    {originParts.length ? (
                      originParts.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.sku} · {p.name} ({state.stock[trFrom]?.[p.id] || 0} un.)
                        </option>
                      ))
                    ) : (
                      <option value="">Nenhum produto neste estoque</option>
                    )}
                  </select>
                  <small>Origem: {slotLabel(fromSlot)}</small>
                </div>
                <div className="field">
                  <label htmlFor="transfer-qty">Quantidade a transferir *</label>
                  <input
                    className="input"
                    id="transfer-qty"
                    type="number"
                    min={1}
                    step={1}
                    value={trQty}
                    onChange={e => setTrQty(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="form-section-label"><Icon name="pin" />ARMAZENAMENTO NO DESTINO</div>
                {toSlot ? (
                  <div className="stock-note"><Icon name="pin" />{slotLabel(toSlot)}</div>
                ) : (
                  <>
                    <div className="form-grid">
                      <div className="field">
                        <label htmlFor="transfer-corridor">Corredor no destino *</label>
                        <input
                          className="input"
                          id="transfer-corridor"
                          value={trCorridor}
                          onChange={e => setTrCorridor(e.target.value)}
                          placeholder="Ex.: B"
                          maxLength={40}
                          required
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="transfer-shelf">Prateleira no destino *</label>
                        <input
                          className="input"
                          id="transfer-shelf"
                          value={trShelf}
                          onChange={e => setTrShelf(e.target.value)}
                          placeholder="Ex.: 02"
                          maxLength={40}
                          required
                        />
                      </div>
                    </div>
                    <p className="small muted" style={{ fontSize: 10, margin: '-5px 0 18px' }}>
                      Primeiro envio deste produto: informe onde ele será guardado.
                    </p>
                  </>
                )}
                <div className="transfer-preview">
                  <div>
                    <small>ORIGEM · {locName(trFrom)}</small>
                    <strong>{fromQty} <span>→</span> {valid ? fromQty - trQty : '—'} <em>un.</em></strong>
                  </div>
                  <div>
                    <small>DESTINO · {locName(trTo)}</small>
                    <strong>{toQty} <span>→</span> {valid ? toQty + trQty : '—'} <em>un.</em></strong>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="transfer-note">Motivo da transferência *</label>
                  <textarea
                    id="transfer-note"
                    value={trNote}
                    onChange={e => setTrNote(e.target.value)}
                    placeholder="Ex.: reposição para a equipe de Messejana"
                    maxLength={300}
                    required
                  />
                </div>
                <div className="form-note">
                  <Icon name="shield" />Ao confirmar, a quantidade sai da origem e entra no destino. O total da rede permanece igual.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="button secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="button" disabled={!originParts.length}>
                  <Icon name="arrows" />Confirmar transferência
                </button>
              </div>
            </form>
          </section>
        </div>
      );
    }

    if (modal.type === 'system') {
      return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <section className="modal wide" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <h2>Acessos e Banco de Dados</h2>
                <p>Gerencie contas de usuários (Operação e Técnicos) e os dados do servidor.</p>
              </div>
              <button className="modal-close" type="button" onClick={() => setModal(null)} aria-label="Fechar janela">
                <Icon name="close" />
              </button>
            </div>
            <div className="modal-body">
              {formError && <div className="error" role="alert">{formError}</div>}
              {confirmDeleteUser && (
                <div
                  role="alertdialog"
                  aria-labelledby="confirm-del-user-title"
                  style={{
                    background: '#fff5f4',
                    border: '1px solid #f2b8b5',
                    borderRadius: 8,
                    padding: '14px 16px',
                    marginBottom: 16,
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div>
                    <strong id="confirm-del-user-title" style={{ color: '#8c1d18', display: 'block', marginBottom: 2 }}>
                      Tem certeza de que deseja remover este usuário?
                    </strong>
                    <span className="small" style={{ color: '#5f2120' }}>
                      O acesso de <strong>{confirmDeleteUser.name}</strong> (<code>@{confirmDeleteUser.username}</code>) será revogado imediatamente.
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => setConfirmDeleteUser(null)}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="button danger"
                      onClick={async () => {
                        const target = confirmDeleteUser;
                        setConfirmDeleteUser(null);
                        setFormError('');
                        try {
                          const res = await apiCall('DELETE', `/api/users/${encodeURIComponent(target.id)}`);
                          applyServerPayload({ users: res.users });
                          showToast('Usuário removido.');
                        } catch (err) {
                          setFormError(err instanceof Error ? err.message : 'Erro ao remover usuário.');
                        }
                      }}
                    >
                      <Icon name="trash" />
                      Sim, remover
                    </button>
                  </div>
                </div>
              )}
              <h3 style={{ marginBottom: 10 }}>Usuários com acesso ao sistema</h3>
              <div className="table-wrap" style={{ border: '1px solid var(--line)', borderRadius: 8, marginBottom: 20 }}>
                <table>
                  <thead>
                    <tr><th>Nome</th><th>Usuário</th><th>Perfil</th><th /></tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td><strong>{u.name}</strong></td>
                        <td className="mono">@{u.username}</td>
                        <td>
                          {u.role === 'ops' ? (
                            <Badge label="Operação" color="green" />
                          ) : (
                            <Badge label={`Técnico · ${techById(u.technicianId || '')?.name || 'Campo'}`} color="blue" />
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {u.id !== currentUser.id ? (
                            <button
                              type="button"
                              className="text-link danger"
                              onClick={() => {
                                setFormError('');
                                setConfirmDeleteUser(u);
                              }}
                            >
                              Remover
                            </button>
                          ) : (
                            <span className="muted small">Sessão atual</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <form
                style={{ background: '#fafbf8', border: '1px solid var(--line)', borderRadius: 8, padding: 16, marginBottom: 22 }}
                onSubmit={async ev => {
                  ev.preventDefault();
                  setFormError('');
                  const formEl = ev.currentTarget;
                  const fd = Object.fromEntries(new FormData(formEl));
                  try {
                    const res = await apiCall('POST', '/api/users', fd);
                    applyServerPayload({ users: res.users });
                    formEl.reset();
                    setSysRole('ops');
                    showToast('Usuário salvo com sucesso.');
                  } catch (err) {
                    setFormError(err instanceof Error ? err.message : 'Erro ao salvar usuário.');
                  }
                }}
              >
                <h3 style={{ marginBottom: 12 }}>Adicionar novo usuário</h3>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="u-name">Nome *</label>
                    <input className="input" id="u-name" name="name" placeholder="Ex.: Carlos Souza" required />
                  </div>
                  <div className="field">
                    <label htmlFor="u-login">Login *</label>
                    <input className="input" id="u-login" name="username" placeholder="Ex.: carlos" required />
                  </div>
                </div>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="u-pass">Senha *</label>
                    <input className="input" id="u-pass" name="password" type="password" placeholder="Mínimo 4 caracteres" required />
                  </div>
                  <div className="field">
                    <label htmlFor="u-role">Perfil de acesso *</label>
                    <select
                      id="u-role"
                      name="role"
                      value={sysRole}
                      onChange={e => setSysRole(e.target.value as 'ops' | 'tech')}
                    >
                      <option value="ops">Controle Operacional (Total)</option>
                      <option value="tech" disabled={!state.technicians.length}>Técnico em campo</option>
                    </select>
                  </div>
                </div>
                {sysRole === 'tech' && (
                  <div className="field">
                    <label htmlFor="u-tech">Técnico vinculado *</label>
                    <select id="u-tech" name="technicianId">
                      {state.technicians.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.vehicle})</option>
                      ))}
                    </select>
                  </div>
                )}
                <button type="submit" className="button"><Icon name="plus" />Salvar usuário</button>
              </form>
              {!company && <><div className="form-section-label"><Icon name="box" />MANUTENÇÃO DO BANCO DE DADOS</div>
              <div className="guide-summary" style={{ marginBottom: 12 }}>
                Você pode iniciar o banco de dados completamente limpo (zerado) para cadastrar apenas os dados reais da sua empresa, ou carregar o cenário de exemplo para testes.
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => { setFormError(''); setModal({ type: 'reset', mode: 'seed' }); }}
                >
                  <Icon name="box" />Carregar dados de exemplo
                </button>
                <button
                  type="button"
                  className="button danger"
                  onClick={() => { setFormError(''); setModal({ type: 'reset', mode: 'empty' }); }}
                >
                  <Icon name="reset" />Zerar banco de dados (iniciar limpo)
                </button>
              </div></>}
              {company && <p className="guide-summary">Administrador da empresa: gerencie os usuários desta operação. Perfil, módulos e limites são definidos pelo administrador da plataforma.</p>}
            </div>
            <div className="modal-footer">
              <button className="button secondary" onClick={() => setModal(null)}>Fechar</button>
            </div>
          </section>
        </div>
      );
    }

    if (modal.type === 'reset') {
      const isSeed = modal.mode === 'seed';
      return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <section className="modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <h2>{isSeed ? 'Carregar dados de exemplo?' : 'Zerar banco de dados?'}</h2>
                <p>
                  {isSeed
                    ? 'Preenche o banco SQLite com estoques, produtos, técnicos e movimentações de demonstração.'
                    : 'Remove todos os estoques, produtos, técnicos e movimentações para começar do zero.'}
                </p>
              </div>
              <button className="modal-close" type="button" onClick={() => setModal(null)} aria-label="Fechar janela">
                <Icon name="close" />
              </button>
            </div>
            <div className="modal-body">
              {formError && <div className="error" role="alert">{formError}</div>}
              <p className="small muted" style={{ lineHeight: 1.8 }}>
                {isSeed
                  ? 'Os cadastros atuais serão substituídos pela base de exemplo (2 estoques, 8 produtos e 6 técnicos, com logins criados automaticamente conforme a senha padrão configurada no ambiente).'
                  : 'Todos os cadastros de estoques, produtos, técnicos e histórico serão apagados do banco de dados SQLite. Sua conta de Controle Operacional será mantida.'}
              </p>
            </div>
            <div className="modal-footer">
              <button className="button secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button
                className={`button ${isSeed ? '' : 'danger'}`}
                onClick={async () => {
                  setFormError('');
                  try {
                    const res = await apiCall('POST', '/api/system/reset', { mode: modal.mode });
                    applyServerPayload(res);
                    clearFilters();
                    setModal(null);
                    setPage('overview');
                    showToast(
                      isSeed
                        ? 'Dados de exemplo carregados no banco de dados.'
                        : 'Banco de dados zerado. Pronto para seus cadastros reais.'
                    );
                  } catch (err) {
                    setFormError(err instanceof Error ? err.message : 'Erro ao redefinir banco.');
                  }
                }}
              >
                <Icon name={isSeed ? 'check' : 'reset'} />
                {isSeed ? 'Carregar base de exemplo' : 'Confirmar limpeza total'}
              </button>
            </div>
          </section>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <a className="skip-link" href="#main-content">Ir para o conteúdo</a>
      <div className="app-shell">
        {sidebarOpen && <button className="sidebar-backdrop" aria-label="Fechar navegação" onClick={() => setSidebarOpen(false)} />}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} id="sidebar" aria-label="Menu principal">
          <button className="sidebar-close icon-button" aria-label="Fechar menu" onClick={() => setSidebarOpen(false)}><Icon name="close" /></button>
          <div className="brand">
            <img className="brand-mark" src="/gridstock-mark.svg" width={40} height={40} alt="" />
            <span className="brand-wordmark">{company ? company.name.toUpperCase() : <>GRID<span>STOCK</span><i aria-hidden="true">.</i></>}</span>
          </div>
          <div className="workspace">
            <div className="workspace-icon"><Icon name="box" /></div>
            <div>
              <strong>Rede de estoques</strong>
              <small>{state.warehouses.length} {state.warehouses.length === 1 ? 'estoque ativo' : 'estoques ativos'} · Online</small>
            </div>
          </div>
          <div className="nav-label">{ops ? 'OPERAÇÃO' : 'ESPAÇO DO TÉCNICO'}</div>
          <nav className="nav" aria-label="Páginas do sistema">
            <button
              className={`nav-button ${page === 'overview' ? 'active' : ''}`}
              aria-label={ops ? 'Visão geral' : 'Minha jornada'}
              aria-current={page === 'overview' ? 'page' : undefined}
              title={ops ? 'Visão geral' : 'Minha jornada'}
              onClick={() => navigate('overview')}
            >
              <Icon name="grid" />
              <span>{ops ? 'Visão geral' : 'Minha jornada'}</span>
            </button>
            {ops && (
              <button
                className={`nav-button ${page === 'warehouses' ? 'active' : ''}`}
              aria-label={'Estoques'}
              aria-current={page === 'warehouses' ? 'page' : undefined}
              title={'Estoques'}
                onClick={() => navigate('warehouses')}
              >
                <Icon name="box" />
                <span>Estoques</span>
                <span className="nav-count">{state.warehouses.length}</span>
              </button>
            )}
            <button
              className={`nav-button ${page === 'stock' ? 'active' : ''}`}
              aria-label={ops ? 'Inventário' : 'Meu estoque'}
              aria-current={page === 'stock' ? 'page' : undefined}
              title={ops ? 'Inventário' : 'Meu estoque'}
              onClick={() => navigate('stock')}
            >
              <Icon name="grid" />
              <span>{ops ? 'Inventário' : 'Meu estoque'}</span>
            </button>
            {ops && (
              <button
                className={`nav-button ${page === 'products' ? 'active' : ''}`}
              aria-label={'Produtos'}
              aria-current={page === 'products' ? 'page' : undefined}
              title={'Produtos'}
                onClick={() => navigate('products')}
              >
                <Icon name="box" />
                <span>Produtos</span>
                <span className="nav-count">{state.parts.length}</span>
              </button>
            )}
            <button
              className={`nav-button ${page === 'movements' ? 'active' : ''}`}
              aria-label={ops ? 'Movimentações' : 'Minhas movimentações'}
              aria-current={page === 'movements' ? 'page' : undefined}
              title={ops ? 'Movimentações' : 'Minhas movimentações'}
              onClick={() => navigate('movements')}
            >
              <Icon name="arrows" />
              <span>{ops ? 'Movimentações' : 'Minhas movimentações'}</span>
            </button>
            {ops && (
              <button
                className={`nav-button ${page === 'team' ? 'active' : ''}`}
              aria-label={'Equipe em campo'}
              aria-current={page === 'team' ? 'page' : undefined}
              title={'Equipe em campo'}
                onClick={() => navigate('team')}
              >
                <Icon name="users" />
                <span>Equipe em campo</span>
                <span className="nav-count">{state.technicians.length}</span>
              </button>
            )}
          </nav>
          <div className="sidebar-help">
            <Icon name="shield" />
            <strong>{isOpsUser ? (company ? 'Administração da empresa' : 'Administração e acessos') : 'Operação rastreada'}</strong>
            <p>
              {isOpsUser
                ? (company ? 'Gerencie os usuários e logins da sua empresa.' : 'Gerencie usuários, logins da equipe e manutenção do banco de dados.')
                : 'Registre chegadas, aplicações em OS e devoluções em tempo real.'}
            </p>
            {isOpsUser ? (
              <button onClick={() => { setFormError(''); setConfirmDeleteUser(null); setModal({ type: 'system' }); }}>
                {company ? 'Usuários da empresa' : 'Acessos e banco de dados'} <Icon name="arrow" />
              </button>
            ) : (
              <button onClick={handleLogout}>
                Encerrar sessão <Icon name="logout" />
              </button>
            )}
          </div>
          <div className="profile">
            <div className={`avatar ${ops ? 'mint' : currentTech?.color || 'mint'}`}>{userInitials}</div>
            <div>
              <strong>{userName}</strong>
              <small>{userRoleLabel}</small>
            </div>
            <button
              className="icon-button"
              onClick={handleLogout}
              title="Sair da conta"
              aria-label="Sair da conta"
              style={{ marginLeft: 'auto', borderColor: '#344d40', color: '#b6c6bc' }}
            >
              <Icon name="logout" />
            </button>
          </div>
        </aside>
        <main className="main">
          <header className="topbar">
            <button
              className="icon-button mobile-menu"
              onClick={() => setSidebarOpen(prev => !prev)}
              aria-label={sidebarOpen ? 'Fechar navegação' : 'Abrir navegação'}
              aria-expanded={sidebarOpen}
              aria-controls="sidebar"
            >
              <Icon name="menu" />
            </button>
            <div className="breadcrumb">
              <span className="breadcrumb-home"><img src="/gridstock-mark.svg" width={22} height={22} alt="" /> {company?.name.toUpperCase() || 'GRIDSTOCK'}</span> <Icon name="chevron" />
              <strong>{pageTitle}</strong>
            </div>
            <div className="top-actions">
              {isOpsUser ? (
                <div className="view-switch" aria-label="Escolher visão">
                  <button
                    className={ops ? 'active' : ''}
                    aria-pressed={ops}
                    onClick={() => {
                      setView('ops');
                      setPage('overview');
                      clearFilters();
                    }}
                  >
                    <Icon name="grid" />Operação
                  </button>
                  <button
                    className={!ops ? 'active' : ''}
                    aria-pressed={!ops}
                    onClick={() => {
                      setView('tech');
                      setPage('overview');
                      clearFilters();
                    }}
                  >
                    <Icon name="van" />Técnico em campo
                  </button>
                </div>
              ) : (
                <Badge label={userRoleLabel} color="green" dot />
              )}
              <button
                className="icon-button"
                onClick={() => {
                  setPage('stock');
                  clearFilters();
                  setLowOnly(true);
                  showToast('Exibindo peças abaixo do estoque mínimo.');
                }}
                title="Ver alertas de estoque mínimo"
                aria-label="Ver alertas de estoque"
              >
                <Icon name="bell" />
              </button>
              {isOpsUser && (
                <button
                  className="icon-button"
                  onClick={() => { setFormError(''); setConfirmDeleteUser(null); setModal({ type: 'system' }); }}
                  title="Acessos e banco de dados"
                  aria-label="Configurações do sistema"
                >
                  <Icon name="users" />
                </button>
              )}
              <div className="avatar top-avatar">{userInitials}</div>
            </div>
          </header>
          <div className="content" id="main-content" tabIndex={-1}>
            {ops ? (
              page === 'overview' ? (
                renderOverview()
              ) : page === 'stock' ? (
                renderStockPage()
              ) : page === 'warehouses' ? (
                renderWarehousesPage()
              ) : page === 'products' ? (
                renderProductsPage()
              ) : page === 'movements' ? (
                renderMovementsPage()
              ) : (
                renderTeamPage()
              )
            ) : (
              renderTechJourney()
            )}
            <footer className="footer">
              <span>GRIDSTOCK <span>© 2026</span> · Gestão de Estoque e Operação de Campo</span>
              <span><i className="live-dot" /> Banco de dados sincronizado · {fmtTime(state.updatedAt)}</span>
            </footer>
          </div>
        </main>
      </div>
      {renderModal()}
      <div id="toast" role="status" aria-live="polite" className={toastMsg ? 'show' : ''}>
        {toastMsg}
      </div>
    </>
  );
}

