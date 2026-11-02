# Cüdo Klub

Cüdo klubu üçün ictimai sayt və admin paneli. Vite + React, verilənlər bazası və giriş Supabase-dədir.

## Qurulum

1. Supabase-də yeni layihə açın və `supabase/schema.sql` faylını SQL Editor-də işə salın.
2. Authentication → Sign In / Providers bölməsində **Allow new users to sign up** seçimini söndürün, **Confirm email** seçimini də söndürün.
3. Authentication → Users bölməsində admin əlavə edin:
   - Email: `telefon@cudo-klub.vercel.app` (məsələn, `0551234567@cudo-klub.vercel.app`)
   - Password: ən azı 6, tövsiyə olunan 8 rəqəmli PİN
   - **Auto Confirm User** işarəli olsun
4. Vercel-də Environment Variables əlavə edin:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_LOGIN_DOMAIN` (yalnız email domenini dəyişsəniz)

Admin saytda telefon nömrəsi və PİN ilə daxil olur. Telefon arxa planda `telefon@VITE_LOGIN_DOMAIN` emailinə çevrilir.

## İşə salma

```
npm install
npm run dev
```
