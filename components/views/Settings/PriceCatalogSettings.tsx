import React, { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, RotateCcw, Tag } from 'lucide-react';
import { usePriceCatalog, type CatalogItem } from '../../../lib/priceCatalog';
import ConfirmModal from '../../ConfirmModal';

function sameCatalog(a: CatalogItem[], b: CatalogItem[]) {
  return a.length === b.length && a.every((item, i) => item.id === b[i].id && item.name === b[i].name && item.cost === b[i].cost);
}

function readyToSave(items: CatalogItem[]) {
  return items.every(item => item.name.trim().length > 0 && item.cost > 0);
}

const PriceCatalogSettings: React.FC = () => {
  const { catalog, setCatalog, reset, isSaving, canEdit } = usePriceCatalog();
  const [items, setItems] = useState<CatalogItem[]>(catalog);
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const seenCatalog = useRef(catalog);

  useEffect(() => {
    const previous = seenCatalog.current;
    seenCatalog.current = catalog;
    setItems(current => {
      if (sameCatalog(current, catalog) || sameCatalog(current, previous)) {
        return sameCatalog(current, catalog) ? current : catalog;
      }
      return current;
    });
  }, [catalog]);

  useEffect(() => {
    if (!canEdit || sameCatalog(items, catalog) || !readyToSave(items)) return;
    const timer = window.setTimeout(() => setCatalog(items), 800);
    return () => window.clearTimeout(timer);
  }, [items, catalog, canEdit, setCatalog]);

  const handleAdd = () => {
    if (!canEdit) return;
    const price = parseFloat(cost);
    if (!name.trim() || isNaN(price) || price <= 0) return;
    setItems([...items, { id: crypto.randomUUID(), name: name.trim(), cost: price }]);
    setName('');
    setCost('');
  };

  const update = (id: string, patch: Partial<{ name: string; cost: number }>) => {
    if (!canEdit) return;
    setItems(items.map(c => (c.id === id ? { ...c, ...patch } : c)));
  };

  const inputCls =
    'bg-white px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500';

  return (
    <div className="card-premium p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center">
            <Tag size={18} className="text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Mis precios</h3>
              {isSaving && (
                <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full animate-pulse">
                  Guardando en la nube...
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">Se usan al armar presupuestos en toda la clínica</p>
          </div>
        </div>
        {canEdit && (
          <button
            onClick={() => setConfirmReset(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
            title="Volver a la lista inicial"
          >
            <RotateCcw size={13} /> Restablecer
          </button>
        )}
      </div>

      <ul className="mt-4 space-y-2">
        {items.map(item => (
          <li key={item.id} className="flex items-center gap-2">
            <input
              disabled={!canEdit}
              className={`${inputCls} flex-1 min-w-0`}
              value={item.name}
              onChange={e => update(item.id, { name: e.target.value })}
            />
            <input
              disabled={!canEdit}
              type="number"
              min="0"
              step="0.01"
              className={`${inputCls} w-28`}
              value={item.cost}
              onChange={e => {
                const raw = e.target.value;
                if (raw.trim() === '') return;
                const price = parseFloat(raw);
                if (Number.isNaN(price)) return;
                update(item.id, { cost: price });
              }}
            />
            {canEdit && (
              <button
                onClick={() => setItems(items.filter(c => c.id !== item.id))}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 cursor-pointer"
                title="Eliminar"
              >
                <Trash2 size={14} />
              </button>
            )}
          </li>
        ))}
      </ul>

      {canEdit ? (
        <div className="mt-4 pt-4 border-t border-slate-200 flex items-center gap-2">
          <input
            className={`${inputCls} flex-1 min-w-0`}
            placeholder="Nuevo tratamiento"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <input
            type="number"
            min="0"
            step="0.01"
            className={`${inputCls} w-28`}
            placeholder="Precio"
            value={cost}
            onChange={e => setCost(e.target.value)}
          />
          <button
            onClick={handleAdd}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Plus size={14} /> Agregar
          </button>
        </div>
      ) : (
        <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-lg mt-3">
          Solo propietarios y administradores pueden modificar el catálogo de precios de la clínica.
        </p>
      )}
      <p className="text-xs text-slate-400 mt-3">
        El cambio se guarda un momento después de escribir. Restablecer pide confirmación.
      </p>
      <ConfirmModal
        isOpen={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          reset();
        }}
        title="Volver a la lista inicial"
        description="Se reemplazan los precios de la clínica por la lista inicial. Los presupuestos ya creados no cambian."
        confirmLabel="Restablecer"
        variant="warning"
      />
    </div>
  );
};

export default PriceCatalogSettings;
