import { useState } from 'react';
import { Field, Modal, useToast } from './ui';
import { add, update } from '../lib/db';
import { todayISO } from '../lib/format';

export default function CompetitionModal({ competition, onClose, onSaved }) {
  const notify = useToast();
  const [name, setName] = useState(competition?.name || '');
  const [heldOn, setHeldOn] = useState(competition?.held_on || todayISO());
  const [location, setLocation] = useState(competition?.location || '');
  const [note, setNote] = useState(competition?.note || '');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return notify('Yarışın adını yazın.', 'error');
    const payload = {
      name: name.trim(),
      held_on: heldOn,
      location: location.trim() || null,
      note: note.trim() || null,
    };
    setBusy(true);
    try {
      let id = competition?.id;
      if (id) await update('competitions', id, payload);
      else id = await add('competitions', payload);
      notify('Yarış saxlanıldı.');
      onSaved(id);
      onClose();
    } catch (err) {
      notify('Saxlanılmadı: ' + err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={competition ? 'Yarışı redaktə et' : 'Yeni yarış'} onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <Field label="Yarışın adı" wide>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Tarix">
          <input type="date" value={heldOn} onChange={(e) => setHeldOn(e.target.value)} required />
        </Field>
        <Field label="Yer">
          <input value={location} onChange={(e) => setLocation(e.target.value)} />
        </Field>
        <Field label="Qeyd" wide>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? 'Saxlanılır…' : 'Saxla'}
          </button>
          <button type="button" className="btn" onClick={onClose}>Ləğv et</button>
        </div>
      </form>
    </Modal>
  );
}
