import React, { useState } from 'react';
import { Plus, Trash2, RotateCcw, Tag } from 'lucide-react';
import { usePriceCatalog } from '../../../lib/priceCatalog';

const PriceCatalogSettings: React.FC = () => {
  const { catalog, setCatalog, reset } = usePriceCatalog();
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');

  const handleAdd = () => {
    const price = parseFloat(cost);
    if (!name.trim() || isNaN(price) || price <= 0) return;
    setCatalog([...catalog, { id: crypto.randomUUID(), name: name.trim(), cost: price }]);
    setName('');
    setCost('');
  };

  const update = (id: string, patch: Partial<{ name: string; cost: number }>) =>
    setCatalog(catalog.map(c => (c.id === id ? { ...c, ...patch } : c)));

  const inputCls =
    'bg-white px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-900 outline-none focus:border-blue-500';

  return (
    <div className="card-premium p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center">
            <Tag size={18} className="text-emerald-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Mis precios</h3>
            <p className="text-sm text-slate-500">Se usan al armar presupuestos</p>
          </div>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
          title="Volver a la lista inicial"
        >
          <RotateCcw size={13} /> Restablecer
        </button>
      </div>

      <ul className="mt-4 space-y-2">
        {catalog.map(item => (
          <li key={item.id} className="flex items-center gap-2">
            <input
              className={`${inputCls} flex-1 min-w-0`}
              value={item.name}
              onChange={e => update(item.id, { name: e.target.value })}
            />
            <input
              type="number"
              min="0"
              step="0.01"
              className={`${inputCls} w-28`}
              value={item.cost}
              onChange={e => update(item.id, { cost: parseFloat(e.target.value) || 0 })}
            />
            <button
              onClick={() => setCatalog(catalog.filter(c => c.id !== item.id))}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 cursor-pointer"
              title="Eliminar"
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>

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
      <p className="text-xs text-slate-400 mt-3">Los precios se guardan en este dispositivo.</p>
    </div>
  );
};

export default PriceCatalogSettings;
