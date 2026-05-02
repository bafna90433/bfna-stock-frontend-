import React, { useState, useEffect } from 'react';
import { Package, Box, Layers } from 'lucide-react';

interface SmartStockInputProps {
  pcsPerInner: number;
  pcsPerCarton: number;
  value: number;
  onChange: (totalPcs: number) => void;
  label?: string;
  currentStock?: number;
}

const SmartStockInput: React.FC<SmartStockInputProps> = ({
  pcsPerInner,
  pcsPerCarton,
  value,
  onChange,
  label = 'Stock Entry',
  currentStock,
}) => {
  const [cartons, setCartons] = useState(0);
  const [inners, setInners]   = useState(0);
  const [pcs, setPcs]         = useState(0);

  // When external value resets (e.g. form reset), clear fields
  useEffect(() => {
    if (value === 0) { setCartons(0); setInners(0); setPcs(0); }
  }, [value]);

  // Recalculate total whenever any field changes
  useEffect(() => {
    const safeCarton = pcsPerCarton > 0 ? pcsPerCarton : 1;
    const safeInner  = pcsPerInner  > 0 ? pcsPerInner  : 1;
    const total = (cartons * safeCarton) + (inners * safeInner) + pcs;
    onChange(total);
  }, [cartons, inners, pcs, pcsPerInner, pcsPerCarton]);

  const safeCarton = pcsPerCarton > 0 ? pcsPerCarton : 1;
  const safeInner  = pcsPerInner  > 0 ? pcsPerInner  : 1;
  const total      = (cartons * safeCarton) + (inners * safeInner) + pcs;

  const hasCarton = pcsPerCarton > 1;
  const hasInner  = pcsPerInner  > 1;

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'white',
    border: '1px solid var(--border)', borderRadius: 10,
    padding: '0.6rem 0.85rem', fontSize: '1rem', fontWeight: 700,
    color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-mono)',
    textAlign: 'center', boxSizing: 'border-box',
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
        <label className="form-label" style={{ marginBottom: 0 }}>{label}</label>
        {currentStock !== undefined && (
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--success)', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 6, padding: '1px 8px', fontFamily: 'var(--font-mono)' }}>
            Stock: {currentStock} pcs
          </span>
        )}
      </div>

      {/* Entry boxes */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Carton */}
        {hasCarton && (
          <div style={{ flex: 1, minWidth: 90 }}>
            <div style={{
              background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)',
              borderRadius: 12, padding: '0.75rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <Box size={12} /> Carton
              </div>
              <input
                type="number" min="0" style={inputStyle}
                value={cartons || ''}
                placeholder="0"
                onChange={e => setCartons(Math.max(0, Number(e.target.value) || 0))}
              />
              <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.3rem', textAlign: 'center' }}>
                1 Carton = {safeCarton} Pcs
              </div>
            </div>
          </div>
        )}

        {/* Inner */}
        {hasInner && (
          <div style={{ flex: 1, minWidth: 90 }}>
            <div style={{
              background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.18)',
              borderRadius: 12, padding: '0.75rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem', fontSize: '0.7rem', fontWeight: 700, color: '#06B6D4', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <Layers size={12} /> Inner
              </div>
              <input
                type="number" min="0" style={inputStyle}
                value={inners || ''}
                placeholder="0"
                onChange={e => setInners(Math.max(0, Number(e.target.value) || 0))}
              />
              <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.3rem', textAlign: 'center' }}>
                1 Inner = {safeInner} Pcs
              </div>
            </div>
          </div>
        )}

        {/* Loose Pcs */}
        <div style={{ flex: 1, minWidth: 90 }}>
          <div style={{
            background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)',
            borderRadius: 12, padding: '0.75rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem', fontSize: '0.7rem', fontWeight: 700, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Package size={12} /> Loose Pcs
            </div>
            <input
              type="number" min="0" style={inputStyle}
              value={pcs || ''}
              placeholder="0"
              onChange={e => setPcs(Math.max(0, Number(e.target.value) || 0))}
            />
            <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.3rem', textAlign: 'center' }}>
              Individual pieces
            </div>
          </div>
        </div>
      </div>

      {/* Calculation breakdown */}
      {total > 0 && (
        <div style={{
          marginTop: '0.75rem',
          padding: '0.75rem 1rem',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(6,182,212,0.06))',
          border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem',
        }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {[
              hasCarton && cartons > 0 && `${cartons} × ${safeCarton}`,
              hasInner  && inners  > 0 && `${inners} × ${safeInner}`,
              pcs > 0 && `${pcs}`,
            ].filter(Boolean).join(' + ')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total</span>
            <span style={{
              fontSize: '1.35rem', fontWeight: 800,
              color: '#10B981', fontFamily: 'var(--font-display)',
              letterSpacing: '-0.03em',
            }}>
              {total.toLocaleString()}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Pcs</span>
          </div>
        </div>
      )}

      {total === 0 && (
        <div style={{
          marginTop: '0.6rem', padding: '0.5rem 0.85rem',
          background: 'var(--bg3)', borderRadius: 8,
          fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'center',
        }}>
          Enter qty above — mix Carton + Inner + Pcs as needed
        </div>
      )}
    </div>
  );
};

export default SmartStockInput;
