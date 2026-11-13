# Nangoma Safari Lodge: public page

1. Copy `src/` into your Vite project and merge `theme.extend` from `tailwind.config.ts` into yours
   (Tailwind v4: put the same colours and fonts in an `@theme` block in your CSS).
2. Add to `index.html` `<head>`:
   `<link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600&family=Inter:wght@400;600&display=swap" rel="stylesheet">`
3. Create `.env` with `VITE_WHATSAPP_NUMBER=260XXXXXXXXX` (country code, no + or spaces).
4. Render `<PublicPage />` from `src/pages/PublicPage.tsx` in your `App.tsx`.
5. Room data is sample data in `src/lib/rooms.ts`; `fetchRooms` is the one place to swap for the Express call.
