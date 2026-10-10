# CivicLens — Public Works Transparency and Community Verification Platform

CivicLens is a civic technology web application designed to bridge the trust gap between municipal governments and the communities they serve. Citizens discover public works projects in their neighborhoods, inspect verified schedules and milestones, submit geotagged observations regarding unlisted construction or discrepancies, and engage in a community civic feed. Authorized government reviewers investigate incoming observations, request additional evidence, link reports to existing public works, or publish verified new official projects.

---

## 1. System Architecture & Tech Stack

- **Backend**: Python 3.10+ with [FastAPI](https://fastapi.tiangolo.com/), Pydantic v2 validation, and SQLAlchemy ORM.
- **Database**: SQLite with connection-pooling WAL mode for straightforward zero-setup local execution. Clean repository/service abstraction structured for direct future migration to PostgreSQL + PostGIS (`ST_DWithin`, `ST_Distance`).
- **Authentication & Security**: Direct `bcrypt` password hashing, signed JWT tokens (`HS256`), role-based access control (RBAC), and strict MIME-type & extension validation on file uploads.
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, and [Leaflet](https://leafletjs.com/) with OpenStreetMap tiles (no paid API key required).
- **Matching Engine**: Deterministic multi-factor scoring engine evaluating Haversine distance, category taxonomy, Jaccard token similarity, and temporal date overlaps with transparent score breakdowns.

---

## 2. User Roles & Seed Demonstration Accounts

CivicLens enforces strict role-based access control across all API endpoints:

| Role | Username | Password | Purpose & Scope |
| :--- | :--- | :--- | :--- |
| **Citizen** | `citizen_rahul` | `Password123!` | Ward 7 resident. Explores public works, submits geotagged observations with photo evidence, likes/comments on the Civic Feed, and responds to official reviewer information requests. |
| **Citizen (Anita)** | `citizen_anita` | `Password123!` | Ward 12 resident. Submits observations and engages with community updates. |
| **Reviewer** | `reviewer_priya` | `Password123!` | Public Works Department (PWD) official reviewer. Investigates incoming reports, inspects duplicate candidate scores, requests evidence, links reports, or publishes verified projects. |
| **Reviewer (Sunil)**| `reviewer_sunil` | `Password123!` | Water & Drainage Board reviewer. |
| **Administrator** | `admin_civic` | `Password123!` | System Administrator. Full governance over user roles, municipal departments, categories, citizen moderation flags, and immutable audit logs. |

> **Note on Self-Promotion**: Registration endpoint `/api/auth/register` strictly enforces the `citizen` role. Citizens cannot self-promote to reviewer or admin roles. Official reviewer and administrator privileges can only be granted by an existing administrator.

---

## 3. Core Features & Capabilities

### A. Explore Public Works Directory
- Filter and search projects by **area, road name, or landmark** (e.g., "Grand Southern Trunk Road", "Ward 7").
- Filter by category (Roads, Water, Parks, Street Lighting, Bridges, Stormwater).
- Filter by lifecycle status: *Planned, Ongoing, Delayed, Completed*.
- **Spatial Proximity Slider**: Calculate distance from user or selected coordinate radius using the Haversine formula.
- **Project Detail Page**: Displays project ID, description, contractor, budget, milestones, update history, and related citizen reports.
- **Helpful Fallback Prompt**: If no matching project is found, displays:
  > *"No matching public project record was found. This does not necessarily mean the work is unauthorized. You can submit an observation for review."* with a one-click button to file an observation.

### B. Interactive Spatial Map
- Interactive map powered by OpenStreetMap tiles and Leaflet.
- Distinct color-coded markers:
  - **Blue Pins**: Verified official public works projects.
  - **Amber Warning Pins**: Unverified citizen reports and observations.
- Interactive popups with project/case details and direct navigation links.
- Filter toggle switches for categories and layer visibility.

### C. Civic Feed & Community Verification
- Social-media style community feed designed for civic transparency.
- Factual, neutral status badges:
  - `Awaiting Review`
  - `Under Investigation`
  - `More Information Requested`
  - `Linked to Existing Project`
  - `Official Record Verified`
  - `Referred to Department`
  - `Closed — Outcome Explained`
- Clear **"Unverified Citizen Observation"** notice on all unconfirmed reports.
- **1-Support-Per-User Constraint**: Backed by a relational database `UniqueConstraint('report_id', 'user_id')`.
- Citizen discussion thread under each observation.
- Content moderation flagging modal.
- Privacy-preserving aliases: reporter email and phone numbers are never displayed publicly.

### D. Citizen Report Submission & Duplicate Check
- Geotagged observation form with interactive coordinate picker.
- Required category, title, description, and location; optional photograph evidence.
- **Pre-Submission Deterministic Duplicate Check**: When the citizen enters details, the engine computes potential matches against existing projects and reports, showing candidate scores and reasons before final submission.
- **Upload Security**: Disallows executable files (`.exe`, `.bat`, `.sh`, etc.), limits size to 10MB, validates magic byte MIME types, and assigns cryptographic UUID filenames.
- Generates a unique case tracking ticket (e.g., `REP-2026-6814`).

### E. Official Review Workflow Lifecycle
- Reviewers investigate cases through a dedicated queue.
- Lifecycle transitions:
  `Submitted` $\rightarrow$ `Under Review` $\rightarrow$ `More Information Requested` $\rightarrow$ `Citizen Response` $\rightarrow$ `Linked / Verified / Closed`.
- **Review Outcomes**:
  1. *Link to Existing Project*: Connects the report to an official project and updates the public report timeline.
  2. *Verify & Publish Official Project*: Creates an official municipal record pre-populated with observation details while preserving original evidence.
  3. *Reopen Case*: Reopens previously closed observations with an official audit trail.
  4. *Close with Explanation*: Explains the closing reason without claiming work was nonexistent.
- **Automated Citizen Notifications**: Citizens receive real-time notifications when reviewers change case status or request evidence.

### F. Administration & Platform Governance
- Role management: promote or demote users.
- Department and category management.
- Flag moderation queue: review flagged posts, dismiss, or hide content without destroying audit history.
- **Tamper-Evident System Audit Log**: Tracks all administrative and reviewer actions with actor, target, timestamp, and metadata.

---

## 4. Deterministic Matching Engine Architecture

The matching engine (`backend/app/matching.py`) scores candidate projects and reports on a 0–100 scale using four transparent criteria:

1. **Geographic Proximity (Up to 40 pts)**:
   - Uses the Haversine formula to compute great-circle distance:
     $$d = 2r \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
   - $<100\text{m}$: 40 pts
   - $<300\text{m}$: 32 pts
   - $<1000\text{m}$: 22 pts
   - $<2500\text{m}$: 12 pts
   - $>2500\text{m}$: 0 pts
2. **Category Alignment (Up to 25 pts)**:
   - Same category: 25 pts
   - Related civil works domain: 12 pts
3. **Content / Description Similarity (Up to 25 pts)**:
   - Tokenized Jaccard coefficient over keywords (excluding common civic stopwords):
     $$J(A, B) = \frac{|A \cap B|}{|A \cup B|}$$
4. **Temporal Date Overlap (Up to 10 pts)**:
   - Observed date falls within active project schedule window: 10 pts

Matches $\ge 35$ points are surfaced as potential matches alongside a structured reason breakdown (e.g., *"Within 85m of project site; Exact category match; Keyword overlap: ['resurfacing', 'pipeline']"*).

---

## 5. Local Setup & Running Instructions

### Prerequisites
- Python 3.10 or higher
- Node.js 18+ and npm

### Step 1: Backend Setup
```powershell
# Navigate to repository root
cd c:\Users\D\Downloads\IIITDM\CivicLens

# Install Python backend dependencies
pip install fastapi uvicorn sqlalchemy pydantic email-validator pyjwt bcrypt pytest httpx python-multipart

# Run automated tests to verify engine and RBAC logic
python -m pytest backend/tests -v
```

### Step 2: Start the Backend Server
```powershell
python -m uvicorn backend.app.main:app --port 8000 --reload
```
The backend initializes the SQLite database (`backend/civiclens.db`) and automatically seeds 11 municipal projects, 5 departments, 6 categories, 6 citizen reports across all stages, and 6 demonstration users.
- API Documentation (Swagger): [http://localhost:8000/docs](http://localhost:8000/docs)
- Health Check: [http://localhost:8000/api/health](http://localhost:8000/api/health)

### Step 3: Frontend Setup & Start
In a new terminal window:
```powershell
cd c:\Users\D\Downloads\IIITDM\CivicLens\frontend

# Install dependencies (already pre-installed)
npm install

# Start Vite development server
npm run dev
```
The web application is now accessible at [http://localhost:5173](http://localhost:5173).

---

## 6. Automated Test Suite

CivicLens includes 21 comprehensive automated tests across five test modules:
```powershell
python -m pytest backend/tests -v
```

### Test Coverage Breakdown:
1. `backend/tests/test_matching.py` (7 tests):
   - Proximity and category matches.
   - Proximity matches with different categories.
   - Nearby but unrelated civil works.
   - Same category at distant locations.
   - Missing coordinates or dates handling.
   - Citizen duplicate report detection.
   - Configurable score thresholding.
2. `backend/tests/test_auth_rbac.py` (3 tests):
   - Enforces citizen role on public registration (no privilege self-escalation).
   - JWT authentication and protected identity resolution.
   - Reviewer and Admin endpoint access control (HTTP 403 Forbidden on citizen token).
3. `backend/tests/test_projects.py` (5 tests):
   - Keyword search across titles, descriptions, and locations.
   - Category filtering.
   - Status filtering.
   - Coordinate proximity filtering.
   - Update history preservation on project modification.
4. `backend/tests/test_reports_and_feed.py` (4 tests):
   - Input validation on report creation.
   - Malicious file upload restriction (`.exe` rejection).
   - Single-support like toggle with database constraint enforcement.
   - Community comment creation and chronological feed ordering.
5. `backend/tests/test_review_flow.py` (2 tests):
   - End-to-end review lifecycle transition with citizen notification dispatch.
   - Close case and reopen workflow with audit tracking.

---

## 7. PostgreSQL / PostGIS Migration Readiness

CivicLens uses an abstract SQLAlchemy data layer. To transition to a production PostgreSQL + PostGIS instance:
1. Update `DATABASE_URL` in `backend/app/config.py` to `postgresql://user:password@host:5432/civiclens`.
2. Install `psycopg2-binary` and `GeoAlchemy2`.
3. In `backend/app/models.py`, geometry columns can be switched from float `(lat, lng)` pairs to `Geometry(geometry_type='POINT', srid=4326)`.
4. In `backend/app/matching.py` and `routers/projects.py`, replace Haversine calculations with PostGIS `ST_DWithin` and `ST_Distance_Sphere`.

---

## 8. Civic Integrity & Responsible Design

- **Neutral Terminology**: Labels avoid sensationalism or premature accusations. Reports are termed *"Observations"*, not violations or crimes.
- **Engagement $\neq$ Truth**: Likes and comment counts reflect community attention, never automatic validation.
- **Evidence Auditability**: Content moderation flags can hide abusive posts from the public feed while preserving full audit trails for legal and municipal compliance.
