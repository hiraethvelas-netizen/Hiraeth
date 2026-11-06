<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the cinematic entrance isolated in its own component and scope its CSS to the entrance so store and NFC flows remain unaffected.
- Keep the pre-existing homepage content available separately from the non-scrolling entrance to preserve its newsletter and institutional content.

- NFC permanence is a customer-facing commitment: once a portal is published and its URL has been written to sold candles, keep its `/portal/:slug` address stable through all future design, video, image, copy, playlist, and layout updates. Never regenerate an existing portal slug from an edited display name.
- Never silently unpublish, archive, delete, or rename published NFC portals during routine edits. If a route or domain migration becomes unavoidable, preserve old NFC URLs with durable redirects and verify access before deployment.
