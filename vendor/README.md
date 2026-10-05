# وابستگی‌های میزبانی‌شده (vendored)

برای آن‌که وب‌اپ **بدون اینترنت و بدون CDN** کار کند (و روی GitHub Pages پایدار بماند)، کتابخانه‌ها و فونت به‌صورت محلی در این پوشه نگه‌داری می‌شوند. صفحه نخست نسخهٔ محلی را بارگذاری می‌کند و تنها در صورت نبودِ آن، به CDN با هش SRI پناه می‌برد.

| کتابخانه | نسخه | فایل | پروانه | سرچشمه |
| -------- | ---- | ---- | ------- | ------ |
| three.js | 0.147.0 | `three/three.min.js` | MIT | [npm](https://www.npmjs.com/package/three/v/0.147.0) — `build/three.min.js` |
| Lucide | 0.294.0 | `lucide/lucide.min.js` | ISC | [npm](https://www.npmjs.com/package/lucide/v/0.294.0) — `dist/umd/lucide.min.js` |
| وزیرمتن (فونت متغیر) | 33.0.3 | `vazirmatn/Vazirmatn-var.woff2` | SIL OFL 1.1 | [npm](https://www.npmjs.com/package/vazirmatn/v/33.0.3) — `fonts/webfonts/Vazirmatn[wght].woff2` |

پروانهٔ هر کتابخانه کنار آن نگهداری می‌شود: `three/LICENSE`، `lucide/LICENSE`، `vazirmatn/OFL.txt`.

## روش به‌روزرسانی یک وابستگی

1. بستهٔ npm را بگیرید: `npm pack <pkg>@<version>`
2. فایل dist موردنظر را در این پوشه جایگزین کنید و پروانهٔ همراه بسته را به‌روز کنید.
3. هش SRI جدید را بسازید (برای منابع CDN در `index.html`):

   ```bash
   openssl dgst -sha384 -binary vendor/three/three.min.js | openssl base64 -A
   ```

4. هر دو هش (jsDelivr و unpkg) را در آرایهٔ `LIBS` اسکریپت بارگذاریِ `index.html` به‌روز کنید.
5. `npm run check` را اجرا کنید و در commit، نسخهٔ جدید را ذکر کنید.

> نکته: نام فایل فونت عمداً از `Vazirmatn[wght].woff2` به `Vazirmatn-var.woff2` تغییر یافته تا نیاز به escape کردن براکت در URL نباشد.
