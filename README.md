# HÜNƏR İDMAN KLUBU

HÜNƏR İDMAN KLUBU üçün ictimai sayt və admin paneli. Vite + React, giriş və verilənlər bazası Firebase-dədir (Authentication + Firestore).

## Qurulum

1. Firebase-də layihə açın və Web tətbiqi əlavə edin. Konfiqurasiya dəyərlərini götürün.
2. Authentication → Sign-in method bölməsində **Email/Password** aktiv edin.
3. Firestore Database yaradın (production mode) və `firestore.rules` faylının məzmununu Rules bölməsinə yapışdırın. `ADMIN_TELEFON` hissəsini admin nömrəsi ilə əvəz edin.
4. Authentication → Users bölməsində admin əlavə edin:
   - Email: `telefon@cudo-klub.vercel.app` (məsələn, `0551234567@cudo-klub.vercel.app`)
   - Password: ən azı 6, tövsiyə olunan 8 rəqəmli PİN
5. Vercel-də Environment Variables əlavə edin (`.env.example` faylına bax).

Admin saytda telefon nömrəsi və PİN ilə daxil olur. Telefon arxa planda `telefon@VITE_LOGIN_DOMAIN` emailinə çevrilir. Məlumata yalnız `firestore.rules`-dakı siyahıda olan emaillər çata bilir.

## İşə salma

```
npm install
npm run dev
```
