# Brand icons

The Figma **Brands** page keeps brand artwork separate from the core icon
catalogs and components. It uses Regular and, where applicable, Filled (Solid)
styles only, without Duocolor or Duotone variants.

The page displays: "All brand icons belong to their respective owners."

Its catalog follows the main Regular catalog (`29:4984`): a 1440px frame,
96px outer margins, the shared header and category styling, and 24px icons on
a 60px-column, 56px-row grid without individual captions. The Brands page now
contains 33 Regular icons and 33 Solid icons. The 28 social marks also
appear in the Solid row as one-color marks from the kit's Gray variants.

The first-party `fos-icons` mark is adapted from the supplied F Symbol,
preserving its interlocking contours and proportions. Its native component set
is `71:151203`, with Regular `71:151173` and Filled `71:151178`. It is a separate
Figma companion, not a four-style core SVG or React export.

## Brand collection

The 28 social marks use the `Style=Brand, State=Default` variants in the
Figma Social icon set (`71:151402`). The selected canonical identities are
Facebook, X, Instagram, LinkedIn, Google, WhatsApp, Apple, Snapchat, Pinterest,
Dribbble, Reddit, Discord, TikTok, Tumblr, Telegram, Clubhouse, Signal, GitHub,
AngelList, Layers, Twitch, Slack, Spotify, Stripe, PayPal, Wise, Notion, and
Webflow. X is used instead of Twitter; one Discord identity is retained.
Existing Figma, Framer, YouTube, Chromecast, and Fos icons remain in the
catalog without duplicating those identities.

Every brand mark supports a one-color Solid version. Google Chrome, Microsoft
Edge, Teams, and Windows were removed on 2026-11-20 because their owners
publish no monochrome mark and ask that the colors not be changed. Their
brand-only Figma components remain in the file, but are no longer on the
Brands page or in `brand-assets/`.

## Solid brand marks

Each of the 28 social marks also has a one-color Solid version in
`brand-assets/social-solid/`. It is the `Style=Gray, State=Default` variant of
the same Figma Social icon set (`71:151402`) — the kit's own monochrome mark for
that platform — recolored to `currentColor`, with white details kept as
transparent cutouts. The geometry is unchanged. Each manifest entry records it
under `solid`, with the Gray component ID, the instance on the Figma Brands
page's Solid row (its fill bound to the library ink color), and the SHA-256
digest.

Duotone and Duocolor reuse the Solid mark: brand marks are never split into
primary and secondary colors.

Third-party assets are stored under `brand-assets/`, outside `icons/` and the
core package. `brand-assets/manifest.json` records each asset's owner, source,
and SHA-256 digest, with a collection retrieval date and shared rights and
attribution notes that apply to every entry. The collection contains the 28
social marks in Regular (`social/`) and Solid (`social-solid/`).

## Rights and attribution

The user explicitly confirmed authorization to redistribute the social marks. This records that confirmation; it is not an independent
verification or a license from the owners. The repository's MIT license does
not cover third-party marks. Copyright and trademark rights remain with their
respective owners; follow each owner's current terms and brand guidelines.
No affiliation or endorsement is implied.

All third-party names and marks are the property of their respective owners.
