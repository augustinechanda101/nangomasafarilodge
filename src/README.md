# Nangoma Safari Lodge: reception and GM pages

Uses the same `tailwind.config.ts` colours and fonts as the public page (sand, bark, ochre, savanna, brick; Fraunces and Inter).

1. Copy `src/` into your Vite project (it sits beside the public page files; nothing here overlaps them).
2. Render `<ReceptionPage />` at `/staff` and `<GmPage />` at `/gm` with your router.
3. All data is sample data in `src/lib/sampleStaff.ts`. Each `console.log('POST ...')` in the pages marks where the Express call goes.
4. Remember: hiding a page is not security. The server must check the user's role on every route.
