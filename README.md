# Pro Skills Digital Tambayan

A just-for-fun virtual office for the team: make a chibi, walk around, chat, and hang out.

- Public chat room, private chats, emoji and speech bubbles
- Rooms that do things: Café (order a drink), Lounge (sit, use phone), Sleeping Quarters (nap),
  Work Room (work statuses), Collaboration Room (opens the team Zoom), Recreation Room (arcade)
- Statuses that follow the room you are in
- Birthday banner and decorations on a teammate's birthday

## Run it

    npm install
    npm run dev

Without Supabase settings it runs in **preview mode**: you only see people in other tabs of the same browser.

## Settings

See `.env.example`. Set them as environment variables on the host (Vercel). All of them are visible
in the browser, so none of them may be a secret key.

React, Vite, TypeScript, Zustand, SVG. Live mode uses Supabase Realtime.
