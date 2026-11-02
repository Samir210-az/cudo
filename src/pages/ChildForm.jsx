import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ErrorBox, Field, Loader, PageHead, useToast } from '../components/ui';
import { calcAge, isValidPhone, normalizePhone, todayISO } from '../lib/format';
import { useQuery } from '../lib/hooks';
import { supabase, unwrap } from '../lib/supabase';

const BELTS = ['Ağ', 'Sarı', 'Narıncı', 'Yaşıl', 'Mavi', 'Qəhvəyi', 'Qara'];
const MAX_SCAN = 5 * 1024 * 1024;
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };

const EMPTY = {
  first_name: '', last_name: '', father_name: '', birth_date: '', gender: '',
  id_series: '', id_fin: '', school: '', grade: '', joined_at: todayISO(),
  belt: '', weight_kg: '', parent_name: '', parent_phone: '', monthly_fee: '',
  status: 'aktiv', note: '',
};

const text = (v) => (v ?? '').toString().trim() || null;

export default function ChildForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const notify = useToast();
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const { data: existing, loading, error, reload } = useQuery(async () => {
    if (!editing) return null;
    return unwrap(await supabase.from('children').select('*').eq('id', id).single());
  }, [id]);

  useEffect(() => {
    if (!existing) return;
    setForm(
      Object.fromEntries(Object.keys(EMPTY).map((k) => [k, existing[k] ?? ''])),
    );
  }, [existing]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    if (!form.first_name.trim() || !form.last_name.trim()) return 'Ad və soyad mütləqdir.';
    if (!form.birth_date) return 'Doğum tarixini seçin.';
    if (form.birth_date > todayISO()) return 'Doğum tarixi gələcəkdə ola bilməz.';
    if (calcAge(form.birth_date) > 30) return 'Doğum tarixini yoxlayın.';
    if (form.joined_at && form.joined_at < form.birth_date) return 'Qeydiyyat tarixi doğum tarixindən əvvəl ola bilməz.';
    if (form.id_fin && !/^[A-Z0-9]{7}$/i.test(form.id_fin.trim())) return 'FİN 7 simvoldan ibarət olmalıdır.';
    if (form.parent_phone && !isValidPhone(form.parent_phone)) return 'Valideyn telefonunu düzgün yazın.';
    if (form.monthly_fee !== '' && Number(form.monthly_fee) < 0) return 'Aylıq ödəniş mənfi ola bilməz.';
    if (file) {
      if (!EXT[file.type]) return 'Skan yalnız JPG, PNG, WEBP və ya PDF ola bilər.';
      if (file.size > MAX_SCAN) return 'Skan faylı 5 MB-dan çox olmamalıdır.';
    }
    return '';
  };

  const submit = async (e) => {
    e.preventDefault();
    const problem = validate();
    if (problem) return notify(problem, 'error');

    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      father_name: text(form.father_name),
      birth_date: form.birth_date,
      gender: form.gender || null,
      id_series: text(form.id_series)?.toUpperCase() ?? null,
      id_fin: text(form.id_fin)?.toUpperCase() ?? null,
      school: text(form.school),
      grade: form.grade === '' ? null : Number(form.grade),
      joined_at: form.joined_at || todayISO(),
      belt: form.belt || null,
      weight_kg: form.weight_kg === '' ? null : Number(form.weight_kg),
      parent_name: text(form.parent_name),
      parent_phone: form.parent_phone ? normalizePhone(form.parent_phone) : null,
      monthly_fee: Number(form.monthly_fee || 0),
      status: form.status,
      note: text(form.note),
    };

    setBusy(true);
    try {
      const saved = editing
        ? unwrap(await supabase.from('children').update(payload).eq('id', id).select('id').single())
        : unwrap(await supabase.from('children').insert(payload).select('id').single());

      if (file) {
        const path = `${saved.id}/${Date.now()}.${EXT[file.type]}`;
        const { error: upError } = await supabase.storage.from('id-scans').upload(path, file, { contentType: file.type });
        if (upError) {
          notify('Məlumat saxlanıldı, lakin skan yüklənmədi: ' + upError.message, 'error');
        } else {
          unwrap(await supabase.from('children').update({ id_scan_path: path }).eq('id', saved.id).select('id').single());
          if (existing?.id_scan_path) await supabase.storage.from('id-scans').remove([existing.id_scan_path]);
        }
      }
      notify(editing ? 'Dəyişikliklər saxlanıldı.' : 'Uşaq əlavə edildi.');
      navigate(`/panel/usaqlar/${saved.id}`, { replace: true });
    } catch (err) {
      notify('Saxlanılmadı: ' + err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (editing && loading && !existing) return <Loader />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  return (
    <>
      <PageHead
        title={editing ? 'Məlumatları redaktə et' : 'Yeni uşaq'}
        back={
          <Link className="back-link" to={editing ? `/panel/usaqlar/${id}` : '/panel/usaqlar'}>
            ← Geri
          </Link>
        }
      />
      <form className="card" onSubmit={submit} noValidate>
        <div className="form-grid">
          <p className="form-section">Şəxsi məlumatlar</p>
          <Field label="Soyad *">
            <input value={form.last_name} onChange={set('last_name')} autoComplete="off" required />
          </Field>
          <Field label="Ad *">
            <input value={form.first_name} onChange={set('first_name')} autoComplete="off" required />
          </Field>
          <Field label="Ata adı">
            <input value={form.father_name} onChange={set('father_name')} autoComplete="off" />
          </Field>
          <Field label="Doğum tarixi *">
            <input type="date" value={form.birth_date} max={todayISO()} onChange={set('birth_date')} required />
          </Field>
          <Field label="Cins">
            <select value={form.gender} onChange={set('gender')}>
              <option value="">Seçilməyib</option>
              <option value="oğlan">Oğlan</option>
              <option value="qız">Qız</option>
            </select>
          </Field>

          <p className="form-section">Şəxsiyyət vəsiqəsi</p>
          <Field label="Seriya və nömrə" hint="Məsələn: AA1234567">
            <input value={form.id_series} onChange={set('id_series')} autoCapitalize="characters" autoComplete="off" />
          </Field>
          <Field label="FİN">
            <input value={form.id_fin} onChange={set('id_fin')} maxLength={7} autoCapitalize="characters" autoComplete="off" />
          </Field>
          <Field
            label="Vəsiqənin skanı və ya şəkli"
            hint={existing?.id_scan_path ? 'Fayl yüklənib. Yenisini seçsəniz əvəz olunacaq.' : 'JPG, PNG, WEBP və ya PDF, ən çox 5 MB. Bağlı yerdə saxlanılır.'}
            wide
          >
            <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </Field>

          <p className="form-section">Təhsil</p>
          <Field label="Məktəb">
            <input value={form.school} onChange={set('school')} placeholder="Məsələn: 132 nömrəli məktəb" />
          </Field>
          <Field label="Sinif">
            <select value={form.grade} onChange={set('grade')}>
              <option value="">Seçilməyib</option>
              <option value="0">Məktəbəqədər</option>
              {Array.from({ length: 11 }, (_, i) => i + 1).map((g) => (
                <option key={g} value={g}>{g}-ci sinif</option>
              ))}
            </select>
          </Field>

          <p className="form-section">Klubda</p>
          <Field label="Klubda qeydiyyat tarixi">
            <input type="date" value={form.joined_at} max={todayISO()} onChange={set('joined_at')} />
          </Field>
          <Field label="Kəmər">
            <select value={form.belt} onChange={set('belt')}>
              <option value="">Təyin edilməyib</option>
              {BELTS.map((b) => <option key={b}>{b}</option>)}
            </select>
          </Field>
          <Field label="Çəki (kq)">
            <input type="number" inputMode="decimal" min="1" step="0.1" value={form.weight_kg} onChange={set('weight_kg')} />
          </Field>
          <Field label="Aylıq ödəniş (₼)">
            <input type="number" inputMode="decimal" min="0" step="0.01" value={form.monthly_fee} onChange={set('monthly_fee')} />
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={set('status')}>
              <option value="aktiv">Aktiv</option>
              <option value="passiv">Passiv</option>
            </select>
          </Field>

          <p className="form-section">Valideyn</p>
          <Field label="Valideynin adı">
            <input value={form.parent_name} onChange={set('parent_name')} autoComplete="off" />
          </Field>
          <Field label="Valideynin telefonu">
            <input type="tel" inputMode="tel" value={form.parent_phone} onChange={set('parent_phone')} placeholder="055 123 45 67" />
          </Field>
          <Field label="Qeyd" wide>
            <textarea value={form.note} onChange={set('note')} />
          </Field>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? 'Saxlanılır…' : 'Saxla'}
          </button>
          <Link className="btn" to={editing ? `/panel/usaqlar/${id}` : '/panel/usaqlar'}>
            Ləğv et
          </Link>
        </div>
      </form>
    </>
  );
}
