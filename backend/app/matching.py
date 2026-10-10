import math
import re
from datetime import datetime
from typing import List, Optional, Tuple, Dict, Any

STOPWORDS = {
    "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "with",
    "of", "by", "from", "up", "about", "into", "over", "after", "is", "are",
    "was", "were", "be", "been", "being", "have", "has", "had", "do", "does",
    "did", "but", "not", "what", "which", "who", "whom", "this", "that"
}


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in kilometers between two lat/lon coordinates."""
    r = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(r * c, 3)


def tokenize(text: Optional[str]) -> set:
    if not text:
        return set()
    cleaned = re.sub(r"[^\w\s]", " ", text.lower())
    words = cleaned.split()
    return {w for w in words if len(w) > 2 and w not in STOPWORDS}


def jaccard_similarity(set1: set, set2: set) -> float:
    if not set1 or not set2:
        return 0.0
    intersection = len(set1.intersection(set2))
    union = len(set1.union(set2))
    if union == 0:
        return 0.0
    return intersection / union


def parse_date_safely(date_str: Optional[str]) -> Optional[datetime]:
    if not date_str:
        return None
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%d-%m-%Y", "%d/%m/%Y", "%Y"):
        try:
            return datetime.strptime(date_str.strip(), fmt)
        except ValueError:
            continue
    return None


class MatchingEngine:
    def __init__(
        self,
        proximity_weight: float = 35.0,
        category_weight: float = 25.0,
        text_weight: float = 25.0,
        date_weight: float = 15.0,
        candidate_threshold: float = 40.0,
    ):
        self.proximity_weight = proximity_weight
        self.category_weight = category_weight
        self.text_weight = text_weight
        self.date_weight = date_weight
        self.candidate_threshold = candidate_threshold

    def calculate_match(
        self,
        source_title: str,
        source_desc: str,
        source_category_id: int,
        source_location_name: str,
        source_lat: Optional[float],
        source_lon: Optional[float],
        source_date: Optional[str],
        target_title: str,
        target_desc: str,
        target_category_id: int,
        target_location_name: str,
        target_lat: Optional[float],
        target_lon: Optional[float],
        target_date: Optional[str],
    ) -> Tuple[float, List[str], Optional[float]]:
        score = 0.0
        reasons = []
        distance_km: Optional[float] = None

        # 1. Geographic Proximity Evaluation
        if (
            source_lat is not None
            and source_lon is not None
            and target_lat is not None
            and target_lon is not None
        ):
            distance_km = haversine_distance_km(source_lat, source_lon, target_lat, target_lon)
            if distance_km <= 0.2:
                geo_score = self.proximity_weight
                reasons.append(f"Immediate vicinity overlap ({distance_km:.2f} km apart, +{geo_score:.1f} pts)")
                score += geo_score
            elif distance_km <= 0.5:
                geo_score = self.proximity_weight * 0.8
                reasons.append(f"Close neighborhood proximity ({distance_km:.2f} km apart, +{geo_score:.1f} pts)")
                score += geo_score
            elif distance_km <= 1.5:
                geo_score = self.proximity_weight * 0.55
                reasons.append(f"Nearby district radius ({distance_km:.2f} km apart, +{geo_score:.1f} pts)")
                score += geo_score
            elif distance_km <= 3.5:
                geo_score = self.proximity_weight * 0.25
                reasons.append(f"Broader sector vicinity ({distance_km:.2f} km apart, +{geo_score:.1f} pts)")
                score += geo_score
            else:
                reasons.append(f"Geographically distant ({distance_km:.2f} km apart, 0 pts)")
        else:
            # Fallback to textual location token overlap if coordinates are missing
            loc_tokens1 = tokenize(source_location_name)
            loc_tokens2 = tokenize(target_location_name)
            loc_sim = jaccard_similarity(loc_tokens1, loc_tokens2)
            if loc_sim > 0.4:
                geo_score = self.proximity_weight * 0.6
                reasons.append(f"Strong location name string match ({loc_sim:.0%}, +{geo_score:.1f} pts, missing coordinates)")
                score += geo_score
            elif loc_sim > 0.2:
                geo_score = self.proximity_weight * 0.35
                reasons.append(f"Partial location name string overlap ({loc_sim:.0%}, +{geo_score:.1f} pts, missing coordinates)")
                score += geo_score
            else:
                reasons.append("Coordinates unavailable and minimal location name match (0 pts)")

        # 2. Category Similarity Evaluation
        if source_category_id == target_category_id:
            score += self.category_weight
            reasons.append(f"Identical project category domain (+{self.category_weight:.1f} pts)")
        else:
            reasons.append("Different project category domain (0 pts)")

        # 3. Description & Title Similarity Evaluation
        text1 = f"{source_title} {source_desc}"
        text2 = f"{target_title} {target_desc}"
        tokens1 = tokenize(text1)
        tokens2 = tokenize(text2)
        text_sim = jaccard_similarity(tokens1, tokens2)

        if text_sim > 0:
            text_pts = round(text_sim * self.text_weight, 1)
            score += text_pts
            reasons.append(f"Content keyword similarity ({text_sim:.0%}, +{text_pts:.1f} pts)")
        else:
            reasons.append("Distinct descriptive content (0 pts)")

        # 4. Date Overlap / Proximity Evaluation
        d1 = parse_date_safely(source_date)
        d2 = parse_date_safely(target_date)
        if d1 and d2:
            diff_days = abs((d1 - d2).days)
            if diff_days <= 30:
                date_pts = self.date_weight
                reasons.append(f"Dates match within 30 days ({diff_days} days apart, +{date_pts:.1f} pts)")
                score += date_pts
            elif diff_days <= 90:
                date_pts = self.date_weight * 0.65
                reasons.append(f"Dates align within same quarter ({diff_days} days apart, +{date_pts:.1f} pts)")
                score += date_pts
            elif diff_days <= 180:
                date_pts = self.date_weight * 0.35
                reasons.append(f"Dates align within 6 months ({diff_days} days apart, +{date_pts:.1f} pts)")
                score += date_pts
            else:
                reasons.append(f"Dates separated by {diff_days} days (0 pts)")
        else:
            reasons.append("Date comparison skipped (missing date information, 0 pts)")

        final_score = round(min(100.0, max(0.0, score)), 1)
        return final_score, reasons, distance_km

    def evaluate_against_projects(
        self,
        report_title: str,
        report_desc: str,
        report_category_id: int,
        report_location_name: str,
        report_lat: Optional[float],
        report_lon: Optional[float],
        report_date: Optional[str],
        projects: list,
    ) -> List[Dict[str, Any]]:
        candidates = []
        for prj in projects:
            score, reasons, dist = self.calculate_match(
                source_title=report_title,
                source_desc=report_desc,
                source_category_id=report_category_id,
                source_location_name=report_location_name,
                source_lat=report_lat,
                source_lon=report_lon,
                source_date=report_date,
                target_title=prj.title,
                target_desc=prj.description,
                target_category_id=prj.category_id,
                target_location_name=prj.location_name,
                target_lat=prj.latitude,
                target_lon=prj.longitude,
                target_date=prj.planned_start_date,
            )
            if score >= self.candidate_threshold:
                candidates.append({
                    "target_type": "project",
                    "id": prj.id,
                    "code": prj.project_code,
                    "title": prj.title,
                    "location_name": prj.location_name,
                    "category_name": prj.category.name if prj.category else "General",
                    "distance_km": dist,
                    "similarity_score": score,
                    "match_reasons": reasons,
                })
        candidates.sort(key=lambda x: x["similarity_score"], reverse=True)
        return candidates

    def evaluate_against_reports(
        self,
        report_title: str,
        report_desc: str,
        report_category_id: int,
        report_location_name: str,
        report_lat: Optional[float],
        report_lon: Optional[float],
        report_date: Optional[str],
        reports: list,
        exclude_report_id: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        candidates = []
        for rep in reports:
            if exclude_report_id and rep.id == exclude_report_id:
                continue
            score, reasons, dist = self.calculate_match(
                source_title=report_title,
                source_desc=report_desc,
                source_category_id=report_category_id,
                source_location_name=report_location_name,
                source_lat=report_lat,
                source_lon=report_lon,
                source_date=report_date,
                target_title=rep.title,
                target_desc=rep.description,
                target_category_id=rep.category_id,
                target_location_name=rep.location_name,
                target_lat=rep.latitude,
                target_lon=rep.longitude,
                target_date=rep.observed_date,
            )
            if score >= self.candidate_threshold:
                candidates.append({
                    "target_type": "report",
                    "id": rep.id,
                    "code": rep.case_id,
                    "title": rep.title,
                    "location_name": rep.location_name,
                    "category_name": rep.category.name if rep.category else "General",
                    "distance_km": dist,
                    "similarity_score": score,
                    "match_reasons": reasons,
                })
        candidates.sort(key=lambda x: x["similarity_score"], reverse=True)
        return candidates


# Singleton instance
matching_engine = MatchingEngine()
