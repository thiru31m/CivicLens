import json
from datetime import datetime, timedelta
from backend.app.database import engine, Base, SessionLocal
from backend.app.models import (
    User, Department, Category, Project, ProjectMilestone, ProjectUpdateHistory,
    CitizenReport, EvidenceAttachment, ReportReviewAction, CivicPostLike,
    CivicPostComment, Notification, AuditLog
)
from backend.app.auth import hash_password


def seed_database():
    print("Dropping and recreating database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("Seeding departments...")
        dept_roads = Department(
            name="Department of Municipal Roads & Infrastructure",
            jurisdiction="South & Central Metropolitan Zones",
            contact_email="roads.infra@civiclens.local",
            description="Responsible for arterial highways, neighborhood roads, bridges, and stormwater culverts."
        )
        dept_water = Department(
            name="Water Supply & Sewage Works Board",
            jurisdiction="Metro District & Outer Suburbs",
            contact_email="water.works@civiclens.local",
            description="Manages drinking water distribution, sewage pipelines, and treatment infrastructure."
        )
        dept_power = Department(
            name="Urban Power & Street Lighting Authority",
            jurisdiction="Greater Metro Area",
            contact_email="power.lighting@civiclens.local",
            description="Oversees grid distribution, transformer maintenance, and public lighting networks."
        )
        dept_parks = Department(
            name="Parks, Horticulture & Public Grounds Directorate",
            jurisdiction="Metropolitan Green Spaces",
            contact_email="parks.green@civiclens.local",
            description="Maintains urban forests, recreational parks, sports grounds, and eco-restoration."
        )
        dept_sanitation = Department(
            name="Public Sanitation & Waste Management Department",
            jurisdiction="Urban Waste Zones 1-8",
            contact_email="sanitation@civiclens.local",
            description="Coordinates municipal solid waste processing, bio-methanation, and recycling plants."
        )
        db.add_all([dept_roads, dept_water, dept_power, dept_parks, dept_sanitation])
        db.flush()

        print("Seeding categories...")
        cat_roads = Category(name="Roads & Bridges", icon_name="Navigation", description="Paving, asphalt resurfacing, flyovers, footpaths, and culverts")
        cat_water = Category(name="Water & Sewage", icon_name="Droplets", description="Underground drainage, water pipelines, borewells, sewage lines")
        cat_power = Category(name="Electricity & Lighting", icon_name="Zap", description="Street lights, power transformers, cabling, and substation works")
        cat_parks = Category(name="Parks & Recreation", icon_name="Trees", description="Playgrounds, walking paths, public gardens, and lake rejuvenation")
        cat_sanitation = Category(name="Sanitation & Waste", icon_name="Trash2", description="Dump yards, recycling centers, composting plants, drain desilting")
        cat_transit = Category(name="Public Buildings & Transit", icon_name="Building2", description="Bus shelters, public health clinics, municipal halls, transit terminals")
        db.add_all([cat_roads, cat_water, cat_power, cat_parks, cat_sanitation, cat_transit])
        db.flush()

        print("Seeding users...")
        pwd = hash_password("Password123!")

        # Citizens
        user_rahul = User(
            username="citizen_rahul",
            email="rahul.sharma@example.com",
            full_name="Rahul Sharma",
            display_alias="Citizen_RahulS",
            hashed_password=pwd,
            role="citizen",
            is_active=True,
        )
        user_anita = User(
            username="citizen_anita",
            email="anita.desai@example.com",
            full_name="Anita Desai",
            display_alias="Citizen_AnitaD",
            hashed_password=pwd,
            role="citizen",
            is_active=True,
        )
        user_karan = User(
            username="citizen_karan",
            email="karan.patel@example.com",
            full_name="Karan Patel",
            display_alias="Citizen_KaranP",
            hashed_password=pwd,
            role="citizen",
            is_active=True,
        )

        # Reviewers
        reviewer_priya = User(
            username="reviewer_priya",
            email="priya.verma@civiclens.local",
            full_name="Priya Verma",
            display_alias="Officer_Priya",
            hashed_password=pwd,
            role="reviewer",
            department_id=dept_roads.id,
            is_active=True,
        )
        reviewer_sunil = User(
            username="reviewer_sunil",
            email="sunil.mehta@civiclens.local",
            full_name="Sunil Mehta",
            display_alias="Officer_Sunil",
            hashed_password=pwd,
            role="reviewer",
            department_id=dept_water.id,
            is_active=True,
        )

        # Admin
        admin_civic = User(
            username="admin_civic",
            email="admin@civiclens.local",
            full_name="Vikram Sen",
            display_alias="Admin_Vikram",
            hashed_password=pwd,
            role="admin",
            is_active=True,
        )
        db.add_all([user_rahul, user_anita, user_karan, reviewer_priya, reviewer_sunil, admin_civic])
        db.flush()

        print("Seeding official public works projects (11 projects)...")
        p1 = Project(
            project_code="PRJ-2026-001",
            title="Vandalur-Kelambakkam Road 4-Lane Widening & Stormwater Drain",
            description="Widening 6.4 km stretch of arterial link road to 4 lanes with integrated reinforced-concrete box drains and pedestrian walkways.",
            purpose="Mitigate monsoon waterlogging, reduce inter-corridor travel time, and improve road safety for suburban commuters.",
            category_id=cat_roads.id,
            department_id=dept_roads.id,
            contractor="Coromandel Infrastructure Ltd.",
            location_name="Vandalur-Kelambakkam Road, Outer Ring Junction",
            latitude=12.8624,
            longitude=80.1192,
            planned_start_date="2026-01-15",
            planned_completion_date="2026-11-30",
            budget=24500000.0,
            status="Ongoing",
            source_documents="Gazette Notif #RD-2025/892; State Highway Tender #SH-VK-2025-04",
        )
        p2 = Project(
            project_code="PRJ-2026-002",
            title="Medavakkam Junction Flyover Seismic Retrofit & Resurfacing",
            description="Structural reinforcement of pier caps, bearing pad replacement, and mastic asphalt deck resurfacing on the south arm.",
            purpose="Extend structural lifespan and ensure commuter safety following routine geotechnical stability assessment.",
            category_id=cat_roads.id,
            department_id=dept_roads.id,
            contractor="L&T Heavy Civil Engineering Division",
            location_name="Medavakkam Junction, Tambaram-Velachery Main Road",
            latitude=12.9198,
            longitude=80.1915,
            planned_start_date="2026-03-01",
            planned_completion_date="2026-08-15",
            budget=11200000.0,
            status="Ongoing",
            source_documents="Highways Board Approval #HW/2026/014",
        )
        p3 = Project(
            project_code="PRJ-2026-003",
            title="Velachery Underground Drainage Pipeline Overhaul Phase 2",
            description="Laying 3.8 km of high-density polyethylene (HDPE) subterranean sewer mains and 120 inspection manholes.",
            purpose="Eliminate raw sewage overflow into roadside drains and prevent contamination of local water bodies.",
            category_id=cat_water.id,
            department_id=dept_water.id,
            contractor="Metro Water Subsurface Corp",
            location_name="Velachery Bypass Road, Near Lake View Colony",
            latitude=12.9754,
            longitude=80.2210,
            planned_start_date="2025-11-10",
            planned_completion_date="2026-07-20",
            budget=18900000.0,
            status="Ongoing",
            source_documents="Metro Water Capital Sanction #MW-UGD-2025-77",
        )
        p4 = Project(
            project_code="PRJ-2026-004",
            title="OMR IT Corridor Smart LED High-Mast Street Lighting Installation",
            description="Installation of 420 energy-efficient 150W LED smart street lights with centralized automated dimming sensors.",
            purpose="Improve night visibility, reduce civic carbon footprint by 35%, and enhance pedestrian safety across tech corridor.",
            category_id=cat_power.id,
            department_id=dept_power.id,
            contractor="Signify Smart Lighting Solutions",
            location_name="Old Mahabalipuram Road (OMR), Sholinganallur to Navalur",
            latitude=12.8980,
            longitude=80.2285,
            planned_start_date="2025-09-01",
            planned_completion_date="2026-02-15",
            budget=8500000.0,
            status="Completed",
            source_documents="Public Works Completion Certificate #PWR-OMR-2026-09",
        )
        p5 = Project(
            project_code="PRJ-2026-005",
            title="Pallikaranai Eco-Park Walking Track & Lake Rejuvenation",
            description="Creation of a 2.1 km paved nature walkway, bio-retention swales, native flora planting, and solar-lit resting gazebos.",
            purpose="Promote urban wellness, protect wetland periphery from encroachment, and provide recreational green space.",
            category_id=cat_parks.id,
            department_id=dept_parks.id,
            contractor="GreenVenture Ecological Landscaping",
            location_name="Pallikaranai Marsh Periphery, 200 Feet Radial Road",
            latitude=12.9360,
            longitude=80.2080,
            planned_start_date="2026-02-01",
            planned_completion_date="2026-10-31",
            budget=9800000.0,
            status="Ongoing",
            source_documents="Urban Forestry Notification #UF-2026-021",
        )
        p6 = Project(
            project_code="PRJ-2026-006",
            title="Tambaram Railway Station Multimodal Transit Shelter Construction",
            description="All-weather passenger canopy, dedicated auto/taxi drop-off bays, tactile paving, and real-time transit display boards.",
            purpose="Streamline intermodal transfers between suburban rail, regional buses, and app-based taxis to alleviate peak congestion.",
            category_id=cat_transit.id,
            department_id=dept_roads.id,
            contractor="Apex Transit Infra Pvt Ltd",
            location_name="Tambaram West Station Approach, GST Road",
            latitude=12.9249,
            longitude=80.1265,
            planned_start_date="2026-05-01",
            planned_completion_date="2026-12-15",
            budget=15400000.0,
            status="Planned",
            source_documents="Metropolitan Transport Council Resolution #TC-2026/88",
        )
        p7 = Project(
            project_code="PRJ-2026-007",
            title="GST Road Pedestrian Foot Overbridge with Escalator at Chromepet",
            description="Steel truss foot overbridge spanning 42 meters across 6-lane GST Road equipped with dual covered escalators and CCTV.",
            purpose="Prevent hazardous mid-block pedestrian crossings near hospital zone and maintain uninterrupted highway traffic flow.",
            category_id=cat_roads.id,
            department_id=dept_roads.id,
            contractor="BridgeCorp Engineering Works",
            location_name="GST Road, Opposite MIT Bridge Chromepet",
            latitude=12.9517,
            longitude=80.1412,
            planned_start_date="2025-08-15",
            planned_completion_date="2026-04-30",
            budget=13200000.0,
            status="Delayed",
            source_documents="Highway Safety Audit #HSA-GST-2025-11",
        )
        p8 = Project(
            project_code="PRJ-2026-008",
            title="Sholinganallur Water Treatment Plant Secondary Booster Pump Setup",
            description="Installation of three 120 HP variable-frequency drive water booster pumps to stabilize water pressure in high-density IT zones.",
            purpose="Address recurring low-pressure supply issues in eastern suburban neighborhoods during morning peak consumption hours.",
            category_id=cat_water.id,
            department_id=dept_water.id,
            contractor="HydroFlow Systems & Pumps Ltd.",
            location_name="Sholinganallur Junction, Link Road Substation",
            latitude=12.9010,
            longitude=80.2270,
            planned_start_date="2025-06-01",
            planned_completion_date="2026-01-20",
            budget=7200000.0,
            status="Completed",
            source_documents="Water Board Quality & Pressure Report #WB-2026-01",
        )
        p9 = Project(
            project_code="PRJ-2026-009",
            title="Guindy Industrial Estate Solid Waste Segregation & Bio-CNG Facility",
            description="Constructing a 50-tonne daily capacity decentralized wet waste segregation and bio-methanation compressed gas generation plant.",
            purpose="Divert organic commercial waste from landfill dump yards and generate clean vehicle biogas for municipal garbage trucks.",
            category_id=cat_sanitation.id,
            department_id=dept_sanitation.id,
            contractor="EcoClean Renewable Energy Solutions",
            location_name="Guindy Industrial Estate Phase II, Inner Ring Road",
            latitude=13.0067,
            longitude=80.2025,
            planned_start_date="2026-01-10",
            planned_completion_date="2026-09-30",
            budget=31000000.0,
            status="Ongoing",
            source_documents="Waste Management Concession Agreement #WM-2026-05",
        )
        p10 = Project(
            project_code="PRJ-2026-010",
            title="Perungudi Radial Road Culvert Reconstruction & Pavement Rehabilitation",
            description="Demolition and replacement of collapsed brick arch culvert with precast reinforced-concrete culvert, accompanied by 1.8 km asphalt resurfacing.",
            purpose="Eliminate severe bottlenecks and prevent seasonal flooding of IT access corridors during torrential rains.",
            category_id=cat_roads.id,
            department_id=dept_roads.id,
            contractor="Premier Infra Roads LLP",
            location_name="Perungudi Radial Road, Near Toll Plaza",
            latitude=12.9650,
            longitude=80.2410,
            planned_start_date="2026-02-15",
            planned_completion_date="2026-07-31",
            budget=16800000.0,
            status="Ongoing",
            source_documents="Corridor Safety Sanction #CS-2026-44",
        )
        p11 = Project(
            project_code="PRJ-2026-011",
            title="Thoraipakkam Community Health Centre Building Renovation",
            description="Upgradation of outpatient consulting rooms, installation of cold-chain vaccine storage, and construction of disabled-friendly ramps.",
            purpose="Enhance accessibility and primary healthcare delivery capacity for local residents and migrant workforce families.",
            category_id=cat_transit.id,
            department_id=dept_roads.id,
            contractor="Civic Builders & Decorators",
            location_name="Thoraipakkam Main Road, Opposite Panchayat Office",
            latitude=12.9405,
            longitude=80.2335,
            planned_start_date="2025-07-01",
            planned_completion_date="2026-01-15",
            budget=6400000.0,
            status="Completed",
            source_documents="Health Directorate Renovation Clearance #HD-2025-99",
        )
        db.add_all([p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11])
        db.flush()

        print("Seeding project milestones...")
        m1 = ProjectMilestone(project_id=p1.id, title="Utility Trenching & Pipeline Shifting", target_date="2026-03-31", status="Completed", completion_date="2026-03-25", evidence_notes="All subterranean fiber and water pipes relocated safely.")
        m2 = ProjectMilestone(project_id=p1.id, title="Sub-base Gravel Compaction & Wet Mix", target_date="2026-06-30", status="In Progress", evidence_notes="2.5 km of sub-base laid; density testing in progress.")
        m3 = ProjectMilestone(project_id=p1.id, title="Precast Box Culvert Concrete Pouring", target_date="2026-09-15", status="Pending", evidence_notes="Forms assembled near kilometer marker 4.")
        m4 = ProjectMilestone(project_id=p1.id, title="Final Dense Bituminous Macadam (DBM) Carpet", target_date="2026-11-30", status="Pending")
        
        m5 = ProjectMilestone(project_id=p7.id, title="Subsurface Foundation Piling", target_date="2025-10-31", status="Completed", completion_date="2025-11-12", evidence_notes="Cast-in-situ piles driven to bedrock.")
        m6 = ProjectMilestone(project_id=p7.id, title="Steel Truss Span Fabrication & Erection", target_date="2026-01-31", status="Completed", completion_date="2026-02-28", evidence_notes="Truss welded and hoisted during nocturnal traffic detour.")
        m7 = ProjectMilestone(project_id=p7.id, title="Escalator Machinery Installation & Testing", target_date="2026-03-31", status="In Progress", evidence_notes="Delay caused by customs clearance of escalator motors from vendor.")
        db.add_all([m1, m2, m3, m4, m5, m6, m7])

        print("Seeding project update histories...")
        h1 = ProjectUpdateHistory(
            project_id=p1.id,
            updated_by_user_id=reviewer_priya.id,
            actor_name="Priya Verma (Highways Inspector)",
            previous_status=None,
            new_status="Ongoing",
            explanation="Initial project gazette notice published; ground excavation commenced following environmental clearance.",
            field_changes=json.dumps({"initial": True}),
            timestamp=datetime.utcnow() - timedelta(days=90)
        )
        h2 = ProjectUpdateHistory(
            project_id=p7.id,
            updated_by_user_id=reviewer_priya.id,
            actor_name="Priya Verma (Highways Inspector)",
            previous_status="Ongoing",
            new_status="Delayed",
            explanation="Project status changed to Delayed: Imported escalator machinery delivery pushed back by 6 weeks. Traffic detour extended accordingly.",
            field_changes=json.dumps({"status": {"old": "Ongoing", "new": "Delayed"}}),
            timestamp=datetime.utcnow() - timedelta(days=20)
        )
        db.add_all([h1, h2])

        print("Seeding citizen reports across diverse verification statuses...")
        # Report 1: Linked to Existing Project
        r1 = CitizenReport(
            case_id="REP-2026-1001",
            reporter_id=user_rahul.id,
            reporter_alias=user_rahul.display_alias,
            title="Unlisted deep trench digging and road tear-up near Vandalur Junction",
            description="Contractors started heavy excavator digging along the shoulder of Vandalur-Kelambakkam road with no project signboards or contractor name visible. Causing heavy peak-hour dust and traffic choke.",
            category_id=cat_roads.id,
            location_name="Vandalur-Kelambakkam Road, Outer Ring Junction",
            latitude=12.8620,
            longitude=80.1190,
            observed_date="2026-03-10",
            additional_context="Digging started early Tuesday morning with heavy earthmovers.",
            status="Linked to Existing Project",
            linked_project_id=p1.id,
            reviewer_id=reviewer_priya.id,
            review_outcome_explanation="Verified against Highways Registry. This activity is part of the authorized PRJ-2026-001 widening and box-drain work. Contractor Coromandel Infrastructure was instructed to erect mandatory bilingual informational signboards within 48 hours.",
            moderation_status="approved",
            created_at=datetime.utcnow() - timedelta(days=25),
            updated_at=datetime.utcnow() - timedelta(days=23),
        )

        # Report 2: Under Review
        r2 = CitizenReport(
            case_id="REP-2026-1002",
            reporter_id=user_anita.id,
            reporter_alias=user_anita.display_alias,
            title="Deep unpaved trenches causing water stagnation on Medavakkam Main Road",
            description="Approximately 200 meters of road margin excavated for pipeline replacement, but trenches left open with exposed mud piles for two weeks without barricades. Water has started stagnating.",
            category_id=cat_water.id,
            location_name="Medavakkam Main Road, Near Santhosapuram Bus Stop",
            latitude=12.9150,
            longitude=80.1870,
            observed_date="2026-04-02",
            additional_context="Very dangerous for two-wheelers during evening commute.",
            status="Under Review",
            reviewer_id=reviewer_sunil.id,
            review_outcome_explanation="Case accepted for technical site audit. Investigating whether this work belongs to local municipality water board or unpermitted telecom trenching.",
            moderation_status="approved",
            created_at=datetime.utcnow() - timedelta(days=8),
            updated_at=datetime.utcnow() - timedelta(days=7),
        )

        # Report 3: More Information Requested (Demonstration of request & citizen follow-up workflow!)
        r3 = CitizenReport(
            case_id="REP-2026-1003",
            reporter_id=user_karan.id,
            reporter_alias=user_karan.display_alias,
            title="Unmarked night-time excavator work near OMR Toll Plaza lacking safety barriers",
            description="Noticed heavy digging machinery operating late at night near the former toll plaza area. Concrete rubble piled right beside the active traffic lane.",
            category_id=cat_roads.id,
            location_name="OMR Perungudi Toll Plaza, Main Expressway",
            latitude=12.9660,
            longitude=80.2430,
            observed_date="2026-04-05",
            status="More Information Requested",
            reviewer_id=reviewer_priya.id,
            review_outcome_explanation="Dear citizen, please provide a clear photograph or landmark reference (e.g. nearest pillar number or shop signboard) so our field engineers can identify the exact trench section.",
            moderation_status="approved",
            created_at=datetime.utcnow() - timedelta(days=5),
            updated_at=datetime.utcnow() - timedelta(days=4),
        )

        # Report 4: Official Record Verified resulting in new project link
        r4 = CitizenReport(
            case_id="REP-2026-1004",
            reporter_id=user_rahul.id,
            reporter_alias=user_rahul.display_alias,
            title="New high-efficiency smart LED street lighting installation on OMR bypass",
            description="Observed workers installing tall galvanized octagonal poles with smart solar/LED fixtures along the IT corridor median.",
            category_id=cat_power.id,
            location_name="Old Mahabalipuram Road (OMR), Sholinganallur to Navalur",
            latitude=12.8985,
            longitude=80.2280,
            observed_date="2026-01-18",
            status="Official Record Verified",
            linked_project_id=p4.id,
            reviewer_id=reviewer_priya.id,
            review_outcome_explanation="Confirmed official municipal initiative PRJ-2026-004. Successfully commissioned and verified as complete.",
            moderation_status="approved",
            created_at=datetime.utcnow() - timedelta(days=60),
            updated_at=datetime.utcnow() - timedelta(days=55),
        )

        # Report 5: Awaiting Review
        r5 = CitizenReport(
            case_id="REP-2026-1005",
            reporter_id=user_anita.id,
            reporter_alias=user_anita.display_alias,
            title="Broken drainage culvert leaking into stormwater drain at Kelambakkam",
            description="The culvert wall adjacent to the junction market appears fractured, causing dirty water to seep into the freshly dug stormwater canal.",
            category_id=cat_water.id,
            location_name="Kelambakkam Market Junction, Vandalur Road",
            latitude=12.8420,
            longitude=80.1490,
            observed_date="2026-04-08",
            status="Awaiting Review",
            moderation_status="approved",
            created_at=datetime.utcnow() - timedelta(days=2),
            updated_at=datetime.utcnow() - timedelta(days=2),
        )

        # Report 6: Closed — Outcome Explained
        r6 = CitizenReport(
            case_id="REP-2026-1006",
            reporter_id=user_karan.id,
            reporter_alias=user_karan.display_alias,
            title="Private commercial compound wall construction reported as public works",
            description="Construction of high brick boundary wall along the service lane near Chromepet railway border.",
            category_id=cat_transit.id,
            location_name="GST Service Lane, Chromepet",
            latitude=12.9530,
            longitude=80.1420,
            observed_date="2026-03-01",
            status="Closed — Outcome Explained",
            reviewer_id=reviewer_priya.id,
            review_outcome_explanation="On-site inspection by zonal surveyor confirmed this is authorized private commercial boundary construction with valid municipal planning permit #PP-2026-118, not a public works project.",
            moderation_status="approved",
            created_at=datetime.utcnow() - timedelta(days=35),
            updated_at=datetime.utcnow() - timedelta(days=30),
        )

        db.add_all([r1, r2, r3, r4, r5, r6])
        db.flush()

        print("Seeding report timeline actions...")
        a1 = ReportReviewAction(
            report_id=r1.id,
            actor_id=user_rahul.id,
            actor_name=user_rahul.display_alias,
            actor_role="citizen",
            previous_status=None,
            new_status="Awaiting Review",
            action_type="status_change",
            explanation="Initial report logged by citizen.",
            created_at=r1.created_at
        )
        a2 = ReportReviewAction(
            report_id=r1.id,
            actor_id=reviewer_priya.id,
            actor_name="Priya Verma (Highways Reviewer)",
            actor_role="reviewer",
            previous_status="Awaiting Review",
            new_status="Under Review",
            action_type="status_change",
            explanation="Case accepted for registry cross-referencing and contractor verification.",
            created_at=r1.created_at + timedelta(days=1)
        )
        a3 = ReportReviewAction(
            report_id=r1.id,
            actor_id=reviewer_priya.id,
            actor_name="Priya Verma (Highways Reviewer)",
            actor_role="reviewer",
            previous_status="Under Review",
            new_status="Linked to Existing Project",
            action_type="link_project",
            explanation="Verified as authorized construction under PRJ-2026-001. Notice served to Coromandel Infra to display public signs.",
            created_at=r1.updated_at
        )
        db.add_all([a1, a2, a3])

        print("Seeding likes and comments for civic feed engagement...")
        l1 = CivicPostLike(report_id=r1.id, user_id=user_rahul.id)
        l2 = CivicPostLike(report_id=r1.id, user_id=user_anita.id)
        l3 = CivicPostLike(report_id=r1.id, user_id=user_karan.id)
        l4 = CivicPostLike(report_id=r2.id, user_id=user_rahul.id)
        l5 = CivicPostLike(report_id=r5.id, user_id=user_anita.id)
        db.add_all([l1, l2, l3, l4, l5])

        c1 = CivicPostComment(
            report_id=r1.id,
            author_id=user_anita.id,
            author_alias=user_anita.display_alias,
            content="I drive past here every morning. The dust was unbearable last week until they started sprinkling water.",
            is_official=False,
            created_at=r1.created_at + timedelta(days=2)
        )
        c2 = CivicPostComment(
            report_id=r1.id,
            author_id=reviewer_priya.id,
            author_alias="Officer_Priya (Municipal Roads)",
            content="Official Update: Highways engineers have inspected the site. Contractor Coromandel Infrastructure has erected bilingual informational boards and committed to dust mitigation sprays twice daily.",
            is_official=True,
            created_at=r1.updated_at
        )
        c3 = CivicPostComment(
            report_id=r2.id,
            author_id=user_karan.id,
            author_alias=user_karan.display_alias,
            content="True! Two bikes skidded here yesterday evening after light showers. Needs immediate barricading.",
            is_official=False,
            created_at=r2.created_at + timedelta(days=1)
        )
        db.add_all([c1, c2, c3])

        print("Seeding in-app notifications...")
        n1 = Notification(
            user_id=user_rahul.id,
            title="Report Verified & Linked: REP-2026-1001",
            message="Your observation regarding Vandalur-Kelambakkam road was verified and linked to official project PRJ-2026-001.",
            link_url=f"/projects/{p1.id}",
            is_read=True,
            created_at=r1.updated_at
        )
        n2 = Notification(
            user_id=user_karan.id,
            title="Information Requested: REP-2026-1003",
            message="Reviewer Officer_Priya requested additional photo evidence or landmark details for case REP-2026-1003.",
            link_url="/my-reports?case=REP-2026-1003",
            is_read=False,
            created_at=r3.updated_at
        )
        db.add_all([n1, n2])

        print("Seeding system audit logs...")
        audit1 = AuditLog(
            actor_id=reviewer_priya.id,
            actor_username="reviewer_priya",
            actor_role="reviewer",
            action="report_linked_to_project",
            target_type="report",
            target_id="REP-2026-1001",
            details=json.dumps({"project_id": p1.id, "project_code": p1.project_code}),
            timestamp=r1.updated_at
        )
        audit2 = AuditLog(
            actor_id=admin_civic.id,
            actor_username="admin_civic",
            actor_role="admin",
            action="system_seed_initialized",
            target_type="system",
            target_id="0",
            details=json.dumps({"status": "seeded_simulated_data"}),
            timestamp=datetime.utcnow()
        )
        db.add_all([audit1, audit2])

        db.commit()
        print("Database seeding completed successfully with 11 projects, 6 reports, users, milestones, history, comments, and audit logs!")
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
