import os
from datetime import date
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.style import WD_STYLE_TYPE

OUT_DIR = "/Users/ajibola/Remtops/docs"

def set_base_styles(doc):
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Calibri'
    font.size = Pt(11)

def add_title(doc, text, subtitle=None):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run = p.add_run(text)
    run.bold = True
    run.font.size = Pt(24)
    run.font.color.rgb = RGBColor(0x14, 0x2B, 0x3A)
    if subtitle:
        p2 = doc.add_paragraph()
        r2 = p2.add_run(subtitle)
        r2.font.size = Pt(11)
        r2.font.color.rgb = RGBColor(0x55, 0x55, 0x55)
    doc.add_paragraph()

def h1(doc, text):
    p = doc.add_heading(text, level=1)
    for r in p.runs:
        r.font.color.rgb = RGBColor(0x0B, 0x3D, 0x3A)

def h2(doc, text):
    p = doc.add_heading(text, level=2)
    for r in p.runs:
        r.font.color.rgb = RGBColor(0x14, 0x2B, 0x3A)

def h3(doc, text):
    p = doc.add_heading(text, level=3)

def para(doc, text, bold=False, italic=False):
    p = doc.add_paragraph()
    r = p.add_run(text)
    r.bold = bold
    r.italic = italic
    return p

def bullets(doc, items):
    for it in items:
        p = doc.add_paragraph(style='List Bullet')
        if isinstance(it, tuple):
            r = p.add_run(it[0])
            r.bold = True
            p.add_run(it[1])
        else:
            p.add_run(it)

def numbered(doc, items):
    for it in items:
        p = doc.add_paragraph(style='List Number')
        if isinstance(it, tuple):
            r = p.add_run(it[0])
            r.bold = True
            p.add_run(it[1])
        else:
            p.add_run(it)

def table(doc, headers, rows):
    t = doc.add_table(rows=1, cols=len(headers))
    t.style = 'Light List Accent 1'
    hdr = t.rows[0].cells
    for i,h in enumerate(headers):
        hdr[i].text = h
        for para_ in hdr[i].paragraphs:
            for r in para_.runs:
                r.bold = True
    for row in rows:
        cells = t.add_row().cells
        for i,val in enumerate(row):
            cells[i].text = str(val)
    doc.add_paragraph()


def make_aggregators():
    doc = Document()
    set_base_styles(doc)
    add_title(doc, "RentOps: Aggregators & Channel Management",
              f"Discussion paper — ideas and implementation approaches  •  {date.today().strftime('%B %d, %Y')}  •  Discussion only (no build)")

    h1(doc, "1. Purpose and vision")
    para(doc, "This document explores how RentOps can evolve into a single place where property owners and managers control their inventory, pricing, and reservations across multiple listing platforms (OTAs/channels). The goal is to let a partner manage everything once on RentOps and have that truth reflected everywhere, while seeing all reservations—regardless of source—in one consolidated view.")
    bullets(doc, [
        ("Single pane of glass: ", "one dashboard for properties, units, rates, availability, and bookings across RentOps and external channels."),
        ("Reduce double-bookings: ", "keep calendars synchronized so a unit cannot be sold twice for the same dates."),
        ("Operational efficiency: ", "update content and pricing once; avoid logging into multiple extranets."),
        ("Unified reporting: ", "attribute every reservation to its source and understand performance across channels."),
    ])

    h1(doc, "2. What “channel management” means in this context")
    para(doc, "Channel management connects RentOps (as the property’s control center) to external platforms such as Airbnb, Booking.com, Expedia, property websites, and other local/regional marketplaces. A mature solution synchronizes some or all of: availability/calendars, rates and restrictions, property/unit content, and reservation details (including guest info and modifications/cancellations).")

    h2(doc, "2.1 Core capabilities to consider")
    table(doc,
          ["Capability", "What it enables", "Typical complexity"],
          [
              ["Calendar/availability sync", "Block/unblock dates across channels to prevent overlaps", "Low–Medium"],
              ["Rate & restriction sync", "Push nightly/weekly/monthly rates, min stay, check-in rules", "Medium–High"],
              ["Reservation import", "Pull bookings from channels into RentOps for a unified view", "Medium"],
              ["Two-way reservation handling", "Accept modifications/cancellations and reflect them back", "High"],
              ["Content/listing sync", "Push photos, descriptions, amenities, policies", "High (varies by channel)"],
              ["Unified inbox/messaging", "Centralize guest messages from multiple channels", "High"],
              ["Payments & reconciliation", "Map channel payouts/fees to RentOps ledger/settlements", "High"],
          ])

    h2(doc, "2.2 Key concepts and decisions")
    bullets(doc, [
        ("System of record (source of truth): ", "Decide whether RentOps or each channel owns specific data (e.g. RentOps owns rates/availability; channel owns on-channel guest payment). This must be explicit per data type to avoid conflicts."),
        ("Mapping model: ", "Each RentOps unit (and rate plan, if introduced) must be mapped to the corresponding external listing/room/rate on each channel. Mapping must handle one-to-many and multi-unit inventory."),
        ("Sync direction & latency: ", "One-way vs two-way, and near-real-time vs scheduled. Lower latency reduces overbooking risk but increases integration complexity."),
        ("Conflict resolution: ", "Define rules for simultaneous updates (e.g. last-write-wins with audit, or RentOps-always-wins for availability) and how to surface/resolve failures."),
        ("Reservation attribution: ", "Every booking needs a clear source (RentOps direct, Airbnb, Booking.com, iCal/manual, etc.) for operations and reporting."),
    ])

    h1(doc, "3. Approaches and options")

    h2(doc, "Option A — iCal import/export (calendar links)")
    para(doc, "Use the iCalendar (ICS) standard: RentOps publishes an export URL per unit and/or consumes import URLs provided by each channel.")
    bullets(doc, [
        ("Pros: ", "Fastest to deliver; broadly supported; no channel certification; good for preventing date clashes; low cost."),
        ("Cons: ", "Typically availability-only (no prices, no restrictions, limited/no guest details, no instant confirmation payloads); sync can be delayed (channels often poll periodically); cancellations/modifications may lag; limited error visibility."),
        ("Best for: ", "An MVP “unified calendar” and basic overbooking protection, especially for smaller partners or channels without accessible APIs."),
    ])

    h2(doc, "Option B — Direct OTA/channel APIs (deep integration)")
    para(doc, "Integrate directly with each platform’s connectivity/API (e.g. Airbnb, Booking.com connectivity partner programs) to exchange availability, rates, restrictions, and reservations.")
    bullets(doc, [
        ("Pros: ", "Rich, reliable, near-real-time data; supports rates/restrictions and full reservation lifecycle; better control and auditability."),
        ("Cons: ", "Highest engineering and maintenance effort; partner onboarding/certification requirements; each channel differs (schemas, auth, sandboxes, SLAs); ongoing compliance and version changes."),
        ("Best for: ", "Strategic, high-volume channels where RentOps needs full control and automation."),
    ])

    h2(doc, "Option C — Channel manager middleware / connectivity partner")
    para(doc, "Integrate RentOps with an existing channel manager or connectivity platform (a third-party hub that already connects to many OTAs) instead of integrating each OTA directly.")
    bullets(doc, [
        ("Pros: ", "Faster time-to-market across many channels; one integration surface to maintain; leverages provider’s certifications and channel coverage."),
        ("Cons: ", "Vendor dependency and recurring costs; data/feature limits set by the provider; mapping and edge cases still required; need to evaluate reliability and regional channel coverage (including Nigeria-relevant platforms)."),
        ("Best for: ", "Scaling to many channels quickly once the RentOps-side mapping, calendar, and reservation model are ready."),
    ])

    h2(doc, "Option D — Hybrid (recommended long-term shape)")
    para(doc, "Combine approaches by channel and maturity: start with iCal and a consolidated view, add direct or middleware-backed deep integrations for priority channels, and keep iCal as a fallback where APIs are unavailable.")
    bullets(doc, [
        ("Pros: ", "Pragmatic, incremental value; de-risks delivery; balances coverage, depth, and cost."),
        ("Cons: ", "Requires clear per-channel capability labeling in the UI (so partners know what is synced) and careful handling of mixed-mode inventory."),
    ])

    h1(doc, "4. Suggested phased roadmap (how to go about it)")

    h2(doc, "Phase 0 — Foundations (on RentOps)")
    numbered(doc, [
        ("Canonical inventory & calendar: ", "Ensure every bookable unit has a reliable availability source (including holds, blocks, and all reservation states) — building on the existing inventory/hold work."),
        ("Reservation source & attribution: ", "Add/standardize fields to mark origin (direct, partner/manual, channel name, external ID) and store external references safely."),
        ("Mapping entities: ", "Design structures to link RentOps properties/units/rate plans to external channel listings/rooms and to store per-connection settings and sync status."),
        ("Observability: ", "Plan sync logs, last-success timestamps, and error surfacing for partners and staff."),
    ])

    h2(doc, "Phase 1 — Unified view with iCal (MVP)")
    numbered(doc, [
        ("Per-unit iCal export: ", "Generate a secure ICS feed of blocked/booked dates from RentOps for partners to paste into external channels."),
        ("Per-unit iCal import: ", "Allow partners to add external ICS URLs; periodically fetch and merge imported blocks into availability (read-only external blocks)."),
        ("Consolidated calendar/reservations view: ", "Show native and imported/external blocks together per unit with clear source labels and conflict warnings."),
        ("Partner education & safeguards: ", "Explain sync delays/limitations, detect overlaps, and prompt manual resolution when needed."),
    ])

    h2(doc, "Phase 2 — Deeper sync for priority channels")
    numbered(doc, [
        ("Select priority channels: ", "Choose based on partner demand, market relevance, and integration feasibility (direct vs middleware)."),
        ("Two-way availability & rates: ", "Push availability and (where supported) rates/restrictions from RentOps; ingest reservations/changes back into RentOps."),
        ("Reservation lifecycle handling: ", "Map channel statuses/modifications/cancellations to RentOps reservations while preserving source-of-truth rules and audit trails."),
        ("Reconciliation hooks: ", "Capture channel fees/payout references where available to support finance reporting (aligned with the ledger/fees model)."),
    ])

    h2(doc, "Phase 3 — Scale and optimize")
    bullets(doc, [
        ("Broader channel coverage: ", "Add more channels via the chosen connectivity path; standardize onboarding flows."),
        ("Content sync (selective): ", "Where valuable and supported, push listing content from RentOps to reduce duplicate editing."),
        ("Performance & reliability: ", "Queue-based sync, retries/backoff, idempotency, monitoring/alerts, and SLAs."),
        ("Advanced controls: ", "Channel-specific pricing rules/markups, stop-sell, and per-channel availability strategies (future)."),
    ])

    h1(doc, "5. Risks, constraints, and considerations")
    bullets(doc, [
        ("Overbooking risk: ", "No sync is instantaneous; design buffers, clear status, and fast reconciliation paths."),
        ("Channel policy & certification: ", "Some OTAs restrict who can connect and how; timelines can be outside our control."),
        ("Data privacy & security: ", "Guest PII and access tokens/feeds must be protected; feeds/credentials need rotation and least-privilege access."),
        ("Payment/fee complexity: ", "Who collects money differs by channel; RentOps ledger/settlements must distinguish direct vs channel-collected flows."),
        ("Regional fit: ", "Prioritize channels and payment/operational realities relevant to Nigerian and target markets."),
        ("Partner experience: ", "Be explicit about what each connection can and cannot do (availability-only vs full sync) to set correct expectations."),
    ])

    h1(doc, "6. Recommendation (for discussion)")
    para(doc, "Adopt a hybrid, phased approach: deliver Phase 1 (iCal export/import + consolidated calendar and reservation attribution) to achieve fast, tangible value and a unified view with manageable risk. In parallel, define the mapping/source-of-truth model and evaluate a direct-vs-middleware path for 1–2 priority channels to inform Phase 2. This balances speed, partner value, and long-term scalability without committing to heavy integrations before the core inventory and data model are proven.")

    path = os.path.join(OUT_DIR, "aggregators-channel-management-discussion.docx")
    doc.save(path)
    return path


def make_executive_summary():
    doc = Document()
    set_base_styles(doc)
    add_title(doc, "RentOps: Executive Summary — Planned Platform Updates",
              f"Product & delivery overview  •  {date.today().strftime('%B %d, %Y')}")

    h1(doc, "Overview")
    para(doc, "RentOps is being enhanced to deliver a more complete, flexible, and operationally robust accommodation marketplace for guests, property partners (owners and managers), and RentOps staff. The updates focus on booking flexibility, richer unit/property management, transparent pricing and fees, stronger role-based access, future channel/aggregator readiness, and aligned back-office operations.")

    h1(doc, "Key workstreams and intended outcomes")

    h2(doc, "1. Flexible booking: pay-now or hold without payment")
    bullets(doc, [
        ("Guest choice: ", "Allow guests to either pay immediately or place a reservation without paying."),
        ("Time-bound holds: ", "Unpaid reservations hold inventory for a defined period (configurable policy) so dates are protected while the guest arranges payment."),
        ("Automatic release: ", "If payment is not completed within the hold window, the reservation is expired/released and the inventory becomes available to others, with a clear audit/history trail."),
        ("Operational clarity: ", "Consistent handling across instant and approval-based bookings, with staff/partner visibility into hold status and expiry."),
    ])

    h2(doc, "2. Unit-level media and visibility")
    bullets(doc, [
        ("Per-unit photos and 360° tours: ", "Partners can attach images, floor plans, walkthroughs, and interactive 360° experiences to specific units/room types."),
        ("Visible to guests: ", "Unit media is surfaced clearly on the user-facing property experience so guests can evaluate the exact space they are booking."),
        ("Available during creation: ", "Media can be added as part of unit/property setup (not only after the fact), reducing friction and incomplete listings."),
    ])

    h2(doc, "3. Unified, consistent property and unit creation/editing")
    bullets(doc, [
        ("Single creation experience: ", "Bring property setup into one coherent view/workspace covering details, units, media, pricing, and rules—reducing fragmented steps."),
        ("Full unit customization: ", "Configure each unit’s attributes independently (capacity, features, media, pricing/rules as applicable)."),
        ("Bulk and similar units: ", "Create multiple units with the same or similar properties efficiently (templates/bulk creation and copy/apply patterns) to speed up onboarding."),
        ("Add–edit parity: ", "Align the information collected when adding a property (e.g. Step 1 details) with what is shown and editable on the manage/details screens, ensuring consistency and easier maintenance."),
    ])

    h2(doc, "4. Pricing, taxes, caution and custom fees")
    bullets(doc, [
        ("Expanded fee model: ", "Support taxes, caution (security) deposits, and configurable custom fees alongside existing rates and charges."),
        ("Flexible fee definitions: ", "Partners can save a fee as name + amount, or save the name only when the amount varies per booking/situation."),
        ("Transparent breakdowns: ", "Guest-facing quotes/checkout and partner/staff records reflect the full, itemized cost structure consistently."),
        ("Financial integrity: ", "Fee handling aligns with the platform’s pricing, payment, and ledger/settlement model."),
    ])

    h2(doc, "5. Partner roles, permissions, and property-manager views")
    bullets(doc, [
        ("Roles and permissions: ", "Introduce/expand user roles and granular permissions within the partner app so an admin can onboard many team members with appropriate access."),
        ("Owner and property-manager flexibility: ", "An owner can act as the property manager or delegate day-to-day management to others while retaining appropriate ownership controls."),
        ("Role-appropriate views: ", "Provide experiences/views suited to different responsibilities (e.g. owner, property manager, front desk/reservations, finance), with clear permission boundaries."),
        ("Examples and governance: ", "Ship sensible example roles/permission sets and controls to manage who can administer users and settings."),
    ])

    h2(doc, "6. Aggregators and channel management (strategic direction)")
    bullets(doc, [
        ("Vision: ", "Enable partners to manage properties on RentOps and synchronize availability/reservations with other listing platforms, viewing all bookings in one place."),
        ("Phased approach: ", "Begin with unified calendars and iCal-based sync for fast value, then progress toward deeper, two-way integrations for priority channels (directly or via connectivity partners) as foundations mature."),
        ("Risk-aware delivery: ", "Emphasize source-of-truth rules, mapping, conflict/overbooking safeguards, and clear partner expectations per channel capability."),
    ])
    para(doc, "A separate discussion document details the aggregator/channel-management ideas and implementation options.")

    h2(doc, "7. Updated RentOps staff (admin/operations) system")
    bullets(doc, [
        ("Aligned operations: ", "Update staff tools to reflect new booking/hold states, fee and pricing structures, unit-level media, and partner role/permission models."),
        ("Oversight and support: ", "Improve visibility and controls for reservations (including holds/expiry), financial line items, partner team administration, and listing quality."),
        ("Auditability: ", "Maintain clear records and audit trails for the expanded lifecycle events and configuration changes."),
    ])

    h1(doc, "Expected impact")
    bullets(doc, [
        ("For guests: ", "More booking flexibility, clearer pricing, and richer unit-level information to make confident decisions."),
        ("For partners: ", "Faster, more consistent listing setup and management; better team collaboration through roles/permissions; a path to centralized multi-channel operations."),
        ("For RentOps: ", "Stronger marketplace operations, reduced friction and errors (including overbooking/expiry handling), and a scalable foundation for growth and integrations."),
    ])

    h1(doc, "Notes and dependencies")
    para(doc, "Delivery will be sequenced to protect data integrity and existing behavior (inventory/booking correctness, financial accuracy, and access control). Specific configuration choices—such as hold durations, fee applicability (fixed/percentage/variable and scope), and role/property scoping—will be finalized as part of implementation to match operational needs. The aggregator/channel-management workstream is captured as a strategy and roadmap; build-out will follow the agreed phasing.")

    path = os.path.join(OUT_DIR, "executive-summary-rentops-updates.docx")
    doc.save(path)
    return path


if __name__ == "__main__":
    p1 = make_aggregators()
    p2 = make_executive_summary()
    print(p1)
    print(p2)
