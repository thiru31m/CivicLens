import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Project, CitizenReport } from '../types';

interface LeafletMapProps {
  projects?: Project[];
  reports?: CitizenReport[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  onSelectLocation?: (lat: number, lng: number) => void;
  selectedLocation?: [number, number] | null;
  onProjectClick?: (project: Project) => void;
  onReportClick?: (report: CitizenReport) => void;
  showProjectsLayer?: boolean;
  showReportsLayer?: boolean;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  projects = [],
  reports = [],
  center = [12.9249, 80.1700], // Suburban metropolitan default (Chennai/Tambaram/OMR)
  zoom = 12,
  height = '500px',
  onSelectLocation,
  selectedLocation,
  onProjectClick,
  onReportClick,
  showProjectsLayer = true,
  showReportsLayer = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const selectMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView(center, zoom);

      // OpenStreetMap Tile Layer (Free, no API key required)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;

      // Handle map click for location selection mode
      map.on('click', (e: L.LeafletMouseEvent) => {
        if (onSelectLocation) {
          onSelectLocation(e.latlng.lat, e.latlng.lng);
        }
      });
    }

    return () => {
      // Cleanup on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update selected location pin
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (selectedLocation) {
      if (selectMarkerRef.current) {
        selectMarkerRef.current.setLatLng(selectedLocation);
      } else {
        const pinIcon = L.divIcon({
          className: 'custom-pin-marker',
          html: `
            <div style="background-color: #ef4444; width: 28px; height: 28px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);">
              <div style="width: 8px; height: 8px; background-color: white; border-radius: 50%; transform: rotate(45deg);"></div>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 28],
        });

        selectMarkerRef.current = L.marker(selectedLocation, { icon: pinIcon }).addTo(map);
      }
      map.panTo(selectedLocation);
    } else if (selectMarkerRef.current) {
      selectMarkerRef.current.remove();
      selectMarkerRef.current = null;
    }
  }, [selectedLocation]);

  // Update project and report markers
  useEffect(() => {
    if (!markersLayerRef.current || !mapInstanceRef.current) return;
    const layer = markersLayerRef.current;
    layer.clearLayers();

    // 1. Official Projects Markers (Blue)
    if (showProjectsLayer) {
      projects.forEach((prj) => {
        if (prj.latitude && prj.longitude) {
          const projectIcon = L.divIcon({
            className: 'custom-project-marker',
            html: `
              <div style="background-color: #0267c8; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.3); font-weight: bold; font-size: 11px;">
                🏛️
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -18],
          });

          const marker = L.marker([prj.latitude, prj.longitude], { icon: projectIcon });

          const popupContent = document.createElement('div');
          popupContent.className = 'p-1 text-slate-800';
          popupContent.innerHTML = `
            <div style="font-size: 11px; font-weight: 700; color: #0267c8; text-transform: uppercase;">Official Project • ${prj.project_code}</div>
            <div style="font-size: 13px; font-weight: 600; margin-top: 2px; color: #0f172a;">${prj.title}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">📍 ${prj.location_name}</div>
            <div style="font-size: 11px; color: #475569; margin-top: 2px;">Status: <strong>${prj.status}</strong></div>
            <button id="btn-prj-${prj.id}" style="margin-top: 8px; width: 100%; padding: 4px 8px; background-color: #0267c8; color: white; border: none; border-radius: 4px; font-size: 11px; font-weight: 500; cursor: pointer;">
              View Official Details
            </button>
          `;

          marker.bindPopup(popupContent);
          marker.on('popupopen', () => {
            const btn = document.getElementById(`btn-prj-${prj.id}`);
            if (btn && onProjectClick) {
              btn.onclick = () => onProjectClick(prj);
            }
          });

          layer.addLayer(marker);
        }
      });
    }

    // 2. Citizen Reports Markers (Amber/Orange)
    if (showReportsLayer) {
      reports.forEach((rep) => {
        if (rep.latitude && rep.longitude) {
          const isVerified = rep.status === 'Official Record Verified' || rep.status === 'Linked to Existing Project';
          const bgColor = isVerified ? '#059669' : '#d97706';
          const iconEmoji = isVerified ? '✅' : '⚠️';

          const reportIcon = L.divIcon({
            className: 'custom-report-marker',
            html: `
              <div style="background-color: ${bgColor}; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.3); font-weight: bold; font-size: 12px;">
                ${iconEmoji}
              </div>
            `,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            popupAnchor: [0, -16],
          });

          const marker = L.marker([rep.latitude, rep.longitude], { icon: reportIcon });

          const popupContent = document.createElement('div');
          popupContent.className = 'p-1 text-slate-800';
          popupContent.innerHTML = `
            <div style="font-size: 11px; font-weight: 700; color: ${bgColor}; text-transform: uppercase;">
              ${isVerified ? 'Verified Report' : 'Unverified Report'} • ${rep.case_id}
            </div>
            <div style="font-size: 13px; font-weight: 600; margin-top: 2px; color: #0f172a;">${rep.title}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">📍 ${rep.location_name}</div>
            <div style="font-size: 11px; color: #475569; margin-top: 2px;">Status: <strong>${rep.status}</strong></div>
            <button id="btn-rep-${rep.id}" style="margin-top: 8px; width: 100%; padding: 4px 8px; background-color: ${bgColor}; color: white; border: none; border-radius: 4px; font-size: 11px; font-weight: 500; cursor: pointer;">
              View Community Report
            </button>
          `;

          marker.bindPopup(popupContent);
          marker.on('popupopen', () => {
            const btn = document.getElementById(`btn-rep-${rep.id}`);
            if (btn && onReportClick) {
              btn.onclick = () => onReportClick(rep);
            }
          });

          layer.addLayer(marker);
        }
      });
    }
  }, [projects, reports, showProjectsLayer, showReportsLayer, onProjectClick, onReportClick]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm z-0">
      <div ref={mapContainerRef} style={{ height, width: '100%' }} />
      {onSelectLocation && (
        <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-md border border-slate-200 text-xs text-slate-700 font-medium flex items-center gap-1.5">
          <span>📍 Click anywhere on map to pin coordinates</span>
        </div>
      )}
    </div>
  );
};
