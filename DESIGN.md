# Flowrit Customer Management Design

## Product

Flowrit is a quiet workspace for small creative service teams that manage customers, projects, revisions, and delivery links. The interface should feel operational, calm, and fast to scan rather than promotional.

## Screen Scope

- Customer list and search
- New customer form
- Customer detail with edit modal and project list

## Visual Direction

- Layout: desktop-first dashboard with a persistent left sidebar and a content area using 32px page padding.
- Density: compact business UI. Avoid oversized hero layouts, decorative cards, and marketing-style sections.
- Surfaces: white content panels on a light gray app background. Use bordered panels for tables, forms, and modal content.
- Corners: 8px for buttons and controls; 12px is acceptable only for larger panels already used in the app.
- Motion: subtle hover background changes only. No decorative animation.

## Color Tokens

- App background: `#f9fafb`
- Primary text: `#111827`
- Secondary text: `#6b7280`
- Muted text: `#9ca3af`
- Border: `#e5e7eb`
- Panel background: `#ffffff`
- Primary action: `#4f46e5`
- Primary action hover: `#4338ca`
- Primary soft background: `#eef2ff`
- Primary soft text: `#4338ca`
- Danger text: `#dc2626`
- Danger border: `#fecaca`
- Danger background hover: `#fef2f2`

## Typography

- Font family: use the existing app sans-serif stack.
- Page title: 24px, semibold, tight but not condensed.
- Section labels: 14px, medium.
- Body and table text: 14px.
- Metadata and helper text: 12px to 14px, gray.
- Letter spacing: normal.

## Components

### Sidebar

- Width: 240px.
- Brand block at top with Flowrit name in primary indigo.
- Nav items use Lucide icons, 16px, with active state in soft indigo.

### Customer List

- Header row uses a light gray background and uppercase 12px labels.
- Rows are full-width clickable links with hover background `#f9fafb`.
- First column includes a 36px square icon tile and customer name.
- Memo preview is single-line truncated under the name.
- Empty state is centered within the table panel with a neutral icon tile.

### Search

- Search is a bordered white panel above the table.
- Input includes a search icon inside the left edge.
- Search submits to `/customers?q=...` and preserves progressive enhancement.

### Customer Form

- Form fields stack vertically in a white bordered panel.
- Required field: customer name.
- Optional fields: contact and memo.
- Primary submit button is indigo.

### Detail Screen

- Back link appears above the title.
- Title block shows customer name, contact, and registration date.
- Right side has edit and delete actions.
- Memo appears only when present.
- Project list uses rows with project title, current status, and due date.

### Edit Modal

- Modal overlays the dashboard with a translucent black backdrop.
- Dialog width: max 512px.
- Content uses the same form field styling as the new customer form.
- Actions are aligned right: cancel secondary, save primary.

## Interaction Rules

- All mutations must be accessible through form submission.
- Search and row navigation should work with keyboard and without custom gestures.
- Buttons must have clear labels and icon support where helpful.
- Never expose internal workspace IDs or raw database values in the UI.

## Responsive Notes

- The MVP dashboard is desktop-oriented.
- On narrower screens, preserve readable table columns first; future mobile optimization can convert table rows into stacked records.
