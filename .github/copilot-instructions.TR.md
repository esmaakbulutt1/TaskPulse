# Copilot Instructions - Türkçe

> English: [copilot-instructions.md](copilot-instructions.md) - Araçlar İngilizce dosyayı okur; bu dosya insan okuru için çeviridir. Kurallar değiştiğinde ikisini de güncelle.

Bu repoda calisirken uyulacak kurallar. Kurulum ve komutlar README.md'de; bu dosya yalnizca kurallari icerir.

## Proje

pnpm monorepo icinde NestJS + TypeScript + Drizzle (PostgreSQL) API iskeleti. `apps/api`
calismaya hazir; `apps/web` bos (framework proje baslarken secilir) ve `packages/shared` iki
ucun paylastigi sabitleri, tipleri ve API client'ini tutar.

## Stack

| Katman | Secim |
| --- | --- |
| Backend | NestJS 11 + Express 5 + `ws`, `/api/v1/*` altinda REST, TypeScript, **CommonJS** |
| DB | PostgreSQL 16 + Drizzle ORM (hicbir yerde Prisma yok) |
| Auth | JWT, access 15 dakika + refresh 30 gun, DB'de takip edilir. Web: **httpOnly cookie**; mobil: `/auth/mobile/*` altinda **Bearer**. Roller: `admin` \| `user` |
| Dokuman | class-validator DTO'larindan uretilen Swagger, `/api/docs`, yalnizca development |
| Deploy | Docker Compose; Traefik compose dosyasinda degil, ortak VPS instance'idir |

## API nasil bolunmus (modul once)

`apps/api/src` katmana gore degil MODULE gore bolunur: bir is icin acilacak klasor bellidir.

```
src/
├─ main.ts        bootstrap
├─ app.module.ts  HER modul; once altyapi (core), sonra ozellikler (modules)
├─ core/          MODULE OZGU HICBIR SEY YOK: config, db, health, http, realtime, security,
│                 storage, utils
└─ modules/       auth/ example/ uploads/
```

Bir modulun ici: `<name>.service.ts` (DB ile konusan tek katman) + `<name>.controller.ts` +
`dto/` + `<name>.module.ts` + `index.ts`. Bir modul birden fazla kitleye hizmet ediyorsa HTTP
yuzeyi dosyaya gore ayrilir (`public-<name>.controller.ts`, `mobile-<name>.controller.ts`); servis
ve sema tek kopya kalir. `auth/`, tek bir `AuthService` uzerinde cookie controller'i ve Bearer
controller'i barindirir.

**Iki kural, asla bozma:**

1. **Moduller birbirine sadece `index.ts` uzerinden ulasir.** `modules/x/` icinden
   `modules/y/y.service` import edilmez.
2. **`core` hicbir module bagli degildir.** core'daki bir dosyanin module ihtiyaci varsa tasarim
   yanlistir. Token imzalamak core'un, login endpoint'i module isidir.

Controller'lar HTTP yuzeyini yonetir: DTO alir, `ServiceResponse` dondurur. Sorgu kurmazlar ve
response zarfini kurmazlar; `ResponseTransformInterceptor` `success` ve `timestamp` alanlarini
ekler. Servisler mesaji stabil bir KOD olan Nest HTTP exception'lari firlatir:
`throw new NotFoundException('example_not_found')`.

## Sozlesme ve validasyon

- Istek validasyonu **class-validator DTO'lari** ve `@ApiProperty` ile yapilir. Swagger bunlardan
  uretilir; boylece dokumante edilen endpoint ile valide edilen endpoint birbirinden ayrilamaz.
- `packages/shared` her iki ucun ihtiyacini tutar: rol/durum listeleri, upload limitleri, response
  tipleri ve tipli API client. Enum listeleri orada tanimlanir ve `pgEnum` tarafindan kullanilir;
  veritabani tipi ile client tipi birbirinden sapmaz.
- Shared'in Nest'e runtime bagimliligi yoktur ve API shared'in `dist`'ine karsi derlenir:
  ilk `api` build'inden once `pnpm --filter shared build` calistirilir.
- Tekrarlanan normalizasyonlar (`trim`, `trimLowercase`) her DTO'nun icine degil,
  `core/http/transforms.ts` icine yazilir.
- Route parametreleri WHERE sorgusuna gittigi icin `:id` her zaman valide edilir:
  `core/http/pipes` icinden `@Param('id', ParseUuid)`. Hazir `ParseUUIDPipe` kod yerine duz metin
  firlatir.

## Response sekli

Basariyi interceptor olusturur, elle olusturulmaz:

```json
{ "success": true, "message": "...", "data": {}, "meta": {}, "timestamp": "..." }
```

Hatayi `AllExceptionsFilter` olusturur. `error`, client'larin switch ettigi stabil bir KOD'dur;
`details` alan bazli validasyon mesajlarini tasir. **500 hatasi mesajini asla sizdirmaz**; sebep
sadece loga yazilir.

## Veritabani

- Tablolar `core/db/schema/<table-name>.ts` icinde, dosya basina bir tablo olarak tutulur ve
  hepsi drizzle-kit'in giris noktasi olan `schema/index.ts`'ten yeniden export edilir.
- **SQL elle yazilmaz:** semayi duzenle -> `pnpm --filter api db:generate` -> uretilen SQL'i oku
  -> `db:migrate`. Migration'lar siralidir, atlanmaz ve geri alinmaz; geri donus yeni bir
  migration ile yapilir.
- Servisler `@Inject(DRIZZLE) private readonly db: Database` ile enjeksiyon alir.
- Satir silmek yerine soft delete (`is_deleted`) kullanilir. `is_active` farkli bir seydir:
  kullaniciya gorunen acik/kapali anahtardir (devre disi hesap veya sahibinin duraklattigi satir).
  Iki davranisa da ihtiyaci olan tabloda iki kolon da bulunur; tek bayrak ikisinin yerine gecemez.

## Pazarliga kapali kurallar

- Her public (kimliksiz) endpoint kendi `@Throttle` dekoratorune sahip olmali, kati sekilde valide
  edilmeli ve gerektiginden fazla alan dondurmemelidir.
- Sahiplik her sorgunun parcasi olmalidir. Bir satira yalnizca id ile erisilmez. Baska birinin
  satiri 403 degil 404 dondurur; satirin varligi sizdirilmaz.
- Refresh token deseni korunur: rotation + reuse detection + family revoke. Refresh endpoint'inde
  cache ve otomatik retry yoktur.
- Auth cookie'leri `httpOnly` + `sameSite: 'lax'` olarak kalir; production'da `secure` olur ve
  refresh cookie'si `/api/v1/auth` path'iyle sinirli kalir. Web yuzeyinde token'lar response body'de
  asla gorunmez.
- `/api/v1/auth/mobile/*` tek istisnadir. Cihazin cookie jar'i olmadigi icin token cifti body'de
  verilir ve cihaz bunu kendisi saklar. Bu handler'lar cookie ayarlamaz; ayni servis, ayni rotation
  ve ayni reuse detection devam eder. Istisna `/auth/*` yoluna genisletilmez.
- WebSocket handshake'i ACCESS token'i `?token=` olarak kabul eder. Cihaz ne cookie ne de header
  ayarlayabilir. Refresh token URL'e asla konmaz; upgrade URL'lerini loglayan her sey bu parametreyi
  maskeler.
- `ValidationPipe`, `whitelist: true` ile calisir; kapatilmaz. Bu ayar client'in body icine
  `role: "admin"` sızdırmasını engeller.
- Para ve diger kritik aritmetik yalnizca sunucuda ve transaction icinde yapilir. Client'in
  hesapladigi deger asla guvenilir kabul edilmez.
- Diske dokunan tek sinif `core/storage/storage.service.ts`'dir. `/api/uploads/*` yolu `/api/v1`
  prefix'inin disinda kalir; bu URL'ler veritabaninda tutulur.
- Tek bir API instance'i varsayilir; WS durumu bellektedir. Yatay olcekleme once Redis pub/sub
  gerektirir.
- `NODE_ENV=production` iken Swagger kapali kalir.

## Commit'ler

Conventional Commits: `<type>(<scope>): <subject>`. Kucuk harf, emir kipi, sonda nokta yok ve
yaklasik 72 karakterden kisa. Tipler: `feat`, `fix`, `docs`, `refactor`, `chore`, `build`, `test`,
`style`, `perf`. Kapsam `api`, `web`, `shared`, `db` veya daha dar olan modul adidir.

```text
feat(notes): add the notes module with CRUD endpoints
fix(auth): clear the refresh cookie on the path it was set on
chore(deps): bump drizzle-orm to 0.45.2
```

Bu commit turlerini onermek beklenir. Dosya adlarini tekrar etmek yerine diff'in gercekte ne
 yaptigini once oku. Yeni bir uygulama birden fazla commit'e bolunur: shared sozlesmesi, tablo +
migration, modul ve frontend route'u. Staged degisiklik bunlardan birden fazlasini kapsiyorsa
bolmeyi oner.

## Gelistirme

Claude Code kendi basina dev sunucusu baslatmaz; kullanici `pnpm dev` komutunu kendi terminalinde
calistirir. Bir seyi dogrulamak gercekten calisan bir sunucu gerektiriyorsa once portu kontrol et:
`lsof -nP -iTCP:3000 -sTCP:LISTEN`. Dinleyen bir sey yoksa kullaniciya sor.

Gelistirme PostgreSQL'i `docker compose -f docker-compose.dev.yml up -d` ile baslatilir. Yerelde
Docker icinde baska bir sey calistirilmaz.
