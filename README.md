# So'rovnoma bot

Telegram so'rovnoma boti + admin panel (Next.js, Vercel) + PostgreSQL.

## Bot oqimi
1. `/start` → video animatsiya (`public/welcome.mp4`) bilan 3 til tanlash (O'zbek / Русский / English)
2. Telefon raqam (tugma orqali)
3. Ism familiya
4. Viloyat → tuman/shahar (butun O'zbekiston, 14 hudud)
5. Asosiy menyu: So'rovnomalar, Profil, Tilni o'zgartirish

## Admin panel
- So'rovnoma yaratish (3 tilda), variantli va erkin javobli savollar, faollashtirish/to'xtatish
- Javoblarni ko'rish, statistika, viloyat bo'yicha filtr, CSV (Excel) yuklab olish
- Foydalanuvchilarga yangi so'rovnoma haqida xabar yuborish
- Foydalanuvchilar ro'yxati, qidiruv
- Hududlar: tuman/shahar va viloyat qo'shish/o'chirish
- Sozlamalar: webhook, admin ID'lar, boshqa GIF o'rnatish

## Muhit o'zgaruvchilari (Vercel)
| Nomi | Tavsif |
|---|---|
| `BOT_TOKEN` | BotFather tokeni |
| `DATABASE_URL` | PostgreSQL ulanish manzili |
| `ADMIN_PASSWORD` | Admin panel paroli |
| `SESSION_SECRET` | Tasodifiy uzun satr |

Deploydan keyin: admin panel → Sozlamalar → "Webhookni o'rnatish".
