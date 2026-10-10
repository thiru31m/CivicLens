import pytest
from backend.app.matching import MatchingEngine, haversine_distance_km


def test_haversine_distance():
    # Distance between two nearby Chennai coordinates (~3.5 km)
    d = haversine_distance_km(12.8624, 80.1192, 12.8420, 80.1490)
    assert 3.0 <= d <= 5.0
    # Same point should be 0
    assert haversine_distance_km(12.8624, 80.1192, 12.8624, 80.1192) == 0.0


def test_matching_same_location_and_same_category():
    engine = MatchingEngine()
    score, reasons, dist = engine.calculate_match(
        source_title="Trench digging along Vandalur link road",
        source_desc="Excavator digging stormwater drain trenches along road margin",
        source_category_id=1,
        source_location_name="Vandalur-Kelambakkam Road",
        source_lat=12.8624,
        source_lon=80.1192,
        source_date="2026-03-15",
        target_title="Vandalur-Kelambakkam Road Widening & Stormwater Drain",
        target_desc="Widening link road with integrated concrete stormwater drains",
        target_category_id=1,
        target_location_name="Vandalur-Kelambakkam Road",
        target_lat=12.8625,
        target_lon=80.1193,
        target_date="2026-03-10",
    )
    # Both proximity (35), category (25), dates (15), and text similarity should produce high score
    assert score >= 75.0
    assert any("Immediate vicinity overlap" in r for r in reasons)
    assert any("Identical project category domain" in r for r in reasons)
    assert any("Dates match within 30 days" in r for r in reasons)


def test_matching_same_location_different_categories():
    engine = MatchingEngine()
    score, reasons, dist = engine.calculate_match(
        source_title="Broken street light poles",
        source_desc="Several LED luminaires are dark and wiring is hanging",
        source_category_id=3,  # Electricity
        source_location_name="Vandalur Junction",
        source_lat=12.8624,
        source_lon=80.1192,
        source_date="2026-03-15",
        target_title="Water pipe excavation and sewer line overhaul",
        target_desc="Heavy pipeline laying for drinking water supply",
        target_category_id=2,  # Water
        target_location_name="Vandalur Junction",
        target_lat=12.8624,
        target_lon=80.1192,
        target_date="2026-03-15",
    )
    # Has high proximity, but different category (0 category pts) and distinct descriptions
    assert any("Different project category domain" in r for r in reasons)
    # Score should be significantly lower than matching category
    assert score < 60.0


def test_matching_nearby_but_unrelated_work():
    engine = MatchingEngine()
    score, reasons, dist = engine.calculate_match(
        source_title="Playground swing set broken",
        source_desc="Children park swings and seesaw damaged",
        source_category_id=4,  # Parks
        source_location_name="Sector 5 Community Park",
        source_lat=12.9150,
        source_lon=80.1870,
        source_date="2026-04-01",
        target_title="Flyover deck resurfacing and pier reinforcement",
        target_desc="High elevation structural retrofit on arterial expressway",
        target_category_id=1,  # Roads
        target_location_name="Medavakkam Flyover",
        target_lat=12.9198,
        target_lon=80.1915,
        target_date="2026-04-01",
    )
    # Unrelated work should not exceed candidate threshold
    assert score < engine.candidate_threshold


def test_matching_same_category_at_different_locations():
    engine = MatchingEngine()
    score, reasons, dist = engine.calculate_match(
        source_title="Asphalt road pothole repair",
        source_desc="Severe craters on pavement causing traffic slowdown",
        source_category_id=1,
        source_location_name="North Ring Road",
        source_lat=13.0827,
        source_lon=80.2707,  # Chennai Central
        source_date="2026-04-01",
        target_title="Pavement rehabilitation and asphalt resurfacing",
        target_desc="Resurfacing 2 km arterial carriage way",
        target_category_id=1,
        target_location_name="South Ring Road",
        target_lat=12.8399,
        target_lon=80.1378,  # ~30 km away
        target_date="2024-04-01",  # Different time period
    )
    # Geographically distant (> 3km), so proximity = 0
    assert any("Geographically distant" in r for r in reasons)
    assert score < engine.candidate_threshold


def test_matching_missing_dates_or_coordinates():
    engine = MatchingEngine()
    score, reasons, dist = engine.calculate_match(
        source_title="Stormwater drain excavation on Gandhi Road",
        source_desc="Workers digging trench along road edge for drain culvert",
        source_category_id=1,
        source_location_name="Gandhi Road Tambaram",
        source_lat=None,
        source_lon=None,
        source_date=None,
        target_title="Gandhi Road Stormwater Drain Reconstruction",
        target_desc="Excavating roadside concrete culverts and box drains",
        target_category_id=1,
        target_location_name="Gandhi Road Tambaram",
        target_lat=None,
        target_lon=None,
        target_date=None,
    )
    # Textual location fallback should activate
    assert any("Strong location name string match" in r for r in reasons)
    assert any("Date comparison skipped" in r for r in reasons)
    # Content & category match should still identify candidate
    assert score >= engine.candidate_threshold


def test_matching_duplicate_citizen_submissions():
    engine = MatchingEngine()
    score, reasons, dist = engine.calculate_match(
        source_title="Deep unpaved trench left open on Medavakkam Main Road",
        source_desc="Pipeline trench left open for two weeks without barricades water stagnating",
        source_category_id=2,
        source_location_name="Medavakkam Main Road Santhosapuram",
        source_lat=12.9150,
        source_lon=80.1870,
        source_date="2026-04-02",
        target_title="Deep unpaved trench causing water stagnation on Medavakkam Main Road",
        target_desc="Pipeline replacement trench left open exposed mud piles without barricades water stagnating",
        target_category_id=2,
        target_location_name="Medavakkam Main Road Near Santhosapuram",
        target_lat=12.9151,
        target_lon=80.1871,
        target_date="2026-04-02",
    )
    # Duplicate submission should score extremely high
    assert score >= 80.0
