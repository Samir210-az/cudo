import { useEffect, useState } from 'react';
import { updatePassword } from 'firebase/auth';
import { ErrorBox, Field, Loader, PageHead, useToast } from '../components/ui';
import { useAuth } from '../lib/auth';
import { useClub } from '../lib/clubs';
import { formatPhone, isValidPhone, normalizePhone } from '../lib/format';
import { useQuery } from '../lib/hooks';
import { ROOT_CLUB, saveSettings as persistSettings } from '../lib/db';
import { auth, emailToPhone } from '../lib/firebase';
import { fetchSettings } from '../lib/settings';

const FIELDS = ['club_name', 'tagline', 'phone', 'whatsapp', 'address', 'schedule', 'about'];

export default function Settings() {
  const notify = useToast();
  const { session } = useAuth();
  const { current } = useClub();
  const isRoot = current.id === ROOT_CLUB;
  const { data, loading, error, reload } = useQuery(fetchSettings, []);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');

  useEffect(() => {
    if (data) setForm(Object.fromEntries(FIELDS.map((k) => [k, data[k] ?? (k === 'club_name' ? 'HÜNƏR İDMAN KLUBU' : '')])));
  }, [data]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const saveSettings = async (e) => {
    e.preventDefault();
    if (!form.club_name.trim()) return notify('Adı yazın.', 'error');
    if (form.phone && !isValidPhone(form.phone)) return notify('Telefonu düzgün yazın.', 'error');
    if (isRoot && form.whatsapp && !isValidPhone(form.whatsapp)) return notify('WhatsApp nömrəsini düzgün yazın.', 'error');
    const clean = (v) => v.trim() || null;
    setBusy(true);
    try {
      await persistSettings({
        club_name: form.club_name.trim(),
        phone: form.phone ? normalizePhone(form.phone) : null,
        address: clean(form.address),
        schedule: clean(form.schedule),
        ...(isRoot && {
          tagline: clean(form.tagline),
          whatsapp: form.whatsapp ? normalizePhone(form.whatsapp) : null,
          about: clean(form.about),
        }),
        updated_at: new Date().toISOString(),
      });
      notify('Ayarlar saxlanıldı.');
      reload();
    } catch (saveError) {
      notify('Saxlanılmadı: ' + saveError.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const changePin = async (e) => {
    e.preventDefault();
    if (!/^\d{6,}$/.test(pin)) return notify('PİN ən azı 6 rəqəm olmalıdır.', 'error');
    if (pin !== pin2) return notify('PİN-lər eyni deyil.', 'error');
    try {
      await updatePassword(auth.currentUser, pin);
      setPin('');
      setPin2('');
      notify('PİN dəyişdirildi.');
    } catch (pinError) {
      notify(
        pinError.code === 'auth/requires-recent-login'
          ? 'Təhlükəsizlik üçün çıxış edib yenidən daxil olun, sonra PİN-i dəyişin.'
          : 'PİN dəyişmədi: ' + pinError.message,
        'error',
      );
    }
  };

  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (loading && !form) return <Loader />;
  if (!form) return null;

  return (
    <>
      <PageHead
        title="Ayarlar"
        subtitle={isRoot ? 'Bu məlumatlar ictimai saytda göstərilir' : 'Ad, ünvan, telefon və cədvəl ictimai saytın «Filiallar» bölməsində göstərilir'}
      />
      <div className="stack">
        <form className="card" onSubmit={saveSettings}>
          <h2>{isRoot ? 'Klub məlumatları' : 'Filial məlumatları'}</h2>
          <div className="form-grid">
            <Field label="Filialın adı" hint={isRoot ? 'Saytın əsas başlığı dəyişmir, ad yalnız məşq cədvəli və PDF-lərdə görünür' : undefined}><input value={form.club_name} onChange={set('club_name')} required /></Field>
            {isRoot && <Field label="Qısa təsvir"><input value={form.tagline} onChange={set('tagline')} /></Field>}
            <Field label="Telefon"><input type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} /></Field>
            {isRoot && <Field label="WhatsApp nömrəsi"><input type="tel" inputMode="tel" value={form.whatsapp} onChange={set('whatsapp')} /></Field>}
            <Field label="Ünvan" wide><input value={form.address} onChange={set('address')} /></Field>
            <Field label="Məşq cədvəli" hint="Günləri bir sətirdə, saatı ayrı sətirdə yazın. Saat yazılan sətir saytda rənglə seçilir" wide>
              <textarea value={form.schedule} onChange={set('schedule')} />
            </Field>
            {isRoot && <Field label="Klub haqqında" wide><textarea value={form.about} onChange={set('about')} /></Field>}
          </div>
          <div className="form-actions">
            <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Saxlanılır…' : 'Saxla'}</button>
          </div>
        </form>

        <form className="card" onSubmit={changePin}>
          <h2>Giriş PİN-i</h2>
          <p className="muted" style={{ marginBottom: 12 }}>
            Hesab: {formatPhone(emailToPhone(session?.user?.email))}. Təhlükəsizlik üçün PİN-i 8 rəqəm etməyi məsləhət görürük.
          </p>
          <div className="form-grid">
            <Field label="Yeni PİN">
              <input type="password" inputMode="numeric" autoComplete="new-password" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
            </Field>
            <Field label="PİN təkrar">
              <input type="password" inputMode="numeric" autoComplete="new-password" value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ''))} />
            </Field>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn">PİN-i dəyiş</button>
          </div>
        </form>
      </div>
    </>
  );
}
