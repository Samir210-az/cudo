import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Field, PageHead, useToast } from '../components/ui';
import { createClub, getClub } from '../lib/db';
import { slugify } from '../lib/format';
import { useClub } from '../lib/clubs';

export default function Clubs() {
  const notify = useToast();
  const navigate = useNavigate();
  const { clubs, current, switchClub, reload } = useClub();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const open = (id) => {
    switchClub(id);
    navigate('/panel');
  };

  const create = async (e) => {
    e.preventDefault();
    const branchName = name.trim();
    if (!branchName) return notify('Filialın adını yazın.', 'error');
    const base = slugify(branchName);
    if (!base) return notify('Ad ən azı bir hərf və ya rəqəm içərməlidir.', 'error');
    setBusy(true);
    try {
      let id = base;
      for (let n = 2; await getClub(id); n += 1) id = `${base}-${n}`;
      await createClub(id, { club_name: branchName, created_at: new Date().toISOString() });
      await reload();
      switchClub(id);
      notify('Filial yaradıldı. Ünvan və telefonunu Ayarlar bölməsində doldurun.');
      navigate('/panel/ayarlar');
    } catch (err) {
      notify('Filial yaradılmadı: ' + err.message, 'error');
      setBusy(false);
    }
  };

  return (
    <>
      <PageHead title="Filiallar" subtitle="Hər filialın uşaqları, məşqləri, işçiləri və maliyyəsi ayrıca saxlanılır" />
      <div className="stack">
        <section className="card">
          <div className="list">
            {clubs.map((club) => (
              <div className="row" key={club.id}>
                <div className="row-main">
                  <div className="row-title">
                    {club.club_name}
                    {club.id === current.id && <span className="badge ok" style={{ marginLeft: 8 }}>Aktiv</span>}
                  </div>
                  <div className="row-sub">{club.address || 'Ünvan yazılmayıb'}</div>
                </div>
                {club.id !== current.id && (
                  <button type="button" className="btn sm" onClick={() => open(club.id)}>Aç</button>
                )}
              </div>
            ))}
          </div>
        </section>

        <form className="card" onSubmit={create}>
          <h2>Yeni filial əlavə et</h2>
          <div className="form-grid">
            <Field label="Filialın adı">
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Yaradılır…' : 'Filial yarat'}</button>
          </div>
        </form>
      </div>
    </>
  );
}
