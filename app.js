/*
 * KASEZ Circular Textile System Hub
 * Frontend Application Logic Engine - Leaflet.js Tiled Version
 */

// Global App State
let map = null;
let tileLayer = null;
let textData = null;
let currentTour = null;
let currentTourStep = 0;
let isInspectorOpen = false;
let isDarkTheme = true;
let hoverHighlightLayer = null;
let pulseHighlightLayer = null;
let selectedNode = null;
let currentTool = 'select'; // 'select' or 'hand'
let prevToolBeforeSpace = null;

// Map dimensions
const MAP_WIDTH = 30630;
const MAP_HEIGHT = 2383;
const MAP_BOUNDS = [[0, 0], [-MAP_HEIGHT, MAP_WIDTH]];

// Custom Simple CRS where zoom level 5 represents 1x scale (full resolution)
const customSimpleCRS = L.extend({}, L.CRS.Simple, {
    scale: function(zoom) {
        return Math.pow(2, zoom - 5);
    }
});

// Coordinate Conversion Helpers
function svgToLatLng(x, y) {
    // In L.CRS.Simple, x maps to longitude (lng) and y maps to latitude (lat)
    // Since SVG Y increases downwards, lat is -y
    return L.latLng(-y, x);
}

function latLngToSvg(latlng) {
    return {
        x: latlng.lng,
        y: -latlng.lat
    };
}

// Convert old zoom scale to Leaflet zoom level dynamically
function oldZoomToLeaflet(oldZoom) {
    const container = document.getElementById('leaflet-map');
    const viewWidth = container ? container.clientWidth : 1920;
    const fitScale = viewWidth / MAP_WIDTH;
    const targetScale = oldZoom * fitScale;
    const lZoom = 5 + Math.log2(targetScale);
    return Math.max(0, Math.min(lZoom, 7));
}

// Calculate Leaflet zoom level where the map height fits the screen height with a slight gap
function getHeightFittingZoom() {
    const container = document.getElementById('leaflet-map');
    const viewHeight = container ? container.clientHeight : 900;
    const padding = 40; // Slight gap: 20px top, 20px bottom
    const targetHeight = Math.max(200, viewHeight - padding);
    const lZoom = 5 + Math.log2(targetHeight / MAP_HEIGHT);
    return Math.max(0, Math.min(lZoom, 7));
}

// Preconfigured Guided Tours
const tours = {
    'value-chain': {
        name: 'The Circular Value Chain',
        steps: [
            { cx: 809.1, cy: 1348.8, zoom: 3, title: 'Global Textile Waste Origins', desc: 'The map begins here at the far left, showing how post-consumer and post-industrial textile waste is exported from major consuming regions like the US, EU, and East Asia to India.' },
            { cx: 2260.7, cy: 1678.9, zoom: 4, title: 'Collection & Sorting', desc: 'Imported waste garments arrive at sorting facilities, where they are initially segregated and sorted by fiber, color, and grade.' },
            { cx: 1778.6, cy: 689.7, zoom: 4, title: 'Thread Processing', desc: 'Raw material threads are processed, carded, and spun into recycled yarns for weaving.' },
            { cx: 1785.5, cy: 1088.9, zoom: 4, title: 'Fabric & Apparel Manufacturing', desc: 'Weaving, tailoring, and assembly lines produce new recycled apparel and home textiles.' },
            { cx: 14383.9, cy: 2224.3, zoom: 3, title: 'Domestic & International Exports', desc: 'Finally, the processed circular products are shipped back to domestic and international markets, closing the loop.' }
        ]
    },
    'rekha': {
        name: "Social Narrative: Rekha's Story",
        steps: [
            { cx: 7711.6, cy: 1498.6, zoom: 5, title: 'Dawn Water Supply', desc: 'Rekha wakes before dawn to fetch water for her family during a narrow supply window. Basic resource constraints are a daily reality for labor households.' },
            { cx: 8326.4, cy: 1522.6, zoom: 5, title: 'Manual Sorting Line', desc: 'At the factory, Rekha manually grades imported garments. The air is heavy with fabric dust, and workers lack protective masks or gloves.' },
            { cx: 8391.8, cy: 1842.1, zoom: 5, title: 'Heavy Bales & Daily Tally', desc: 'A team of 8 women opens and processes roughly three heavy 45-50kg bales every hour. The supervisor records their tally; nearly a metric ton is processed daily per section.' },
            { cx: 8603.6, cy: 2139.1, zoom: 5, title: 'Evening Household Chores', desc: 'After a long shift, Rekha returns home to manual domestic work: washing clothes, scrubbing utensils, and storing water for the next morning.' }
        ]
    },
    'lca': {
        name: 'LCA & Environmental Impact',
        steps: [
            { cx: 13132.6, cy: 443.5, zoom: 4, title: 'Energy & Particulate Emissions', desc: 'This section details the Scope 2 carbon emissions (based on the HPGCL grid factor of 0.72 kg CO2/kWh) and particulate matter (PM2.5/PM10) released during opening and cleaning operations.' },
            { cx: 20359.2, cy: 1367.8, zoom: 4, title: 'LCA Endpoints: Human Health', desc: 'Using ReCiPe 2016 methodology, the map plots human health impacts measured in Disability-Adjusted Life Years (DALY) across value chain activities.' },
            { cx: 20041.8, cy: 387.7, zoom: 4, title: 'Transportation Efficiency', desc: 'This chart displays carbon efficiency (g CO2 per ton-kilometer) across different transport modes, highlighting rail as the most sustainable option.' }
        ]
    },
    'policy': {
        name: 'SEZ Policy & Compliance',
        steps: [
            { cx: 4770.5, cy: 1587.9, zoom: 4.5, title: 'Import Licenses & Restrictions', desc: 'Under Foreign Trade Policy 2023, clothing imports are restricted and require specific DGFT licenses. Imports of worn clothing are primarily allowed via SEZs like Kandla (KASEZ).' },
            { cx: 5598.6, cy: 1590.3, zoom: 4.5, title: 'Export Obligations & Standards', desc: 'SEZ units must export 100% of processed goods. The garments must meet strict quality standards (ISO 9001/BIS) and international safety regulations (REACH/CPSIA).' },
            { cx: 7253.4, cy: 1557.3, zoom: 4.5, title: 'Pollution Control & Labor Norms', desc: 'Units are governed by CPCB/SPCB pollution norms (requiring ETPs for dye residue) and must comply with the Factories Act and Minimum Wages Act.' }
        ]
    },
    'lighthouse': {
        name: 'The Lighthouse Model',
        steps: [
            { cx: 27697.8, cy: 828.0, zoom: 4, title: 'AI-Based NIR Sorting', desc: 'The Lighthouse Model outlines a digital future using Near-Infrared (NIR) sorting and collaborative robots (cobots) to automate sorting and increase fiber recovery.' },
            { cx: 26522.8, cy: 1048.5, zoom: 4, title: 'Automated Material Handling', desc: 'Integrating horizontal conveyors and automated lifters reduces the physical strain of manual bale lifting for workers.' },
            { cx: 29844.8, cy: 2053.0, zoom: 3, title: 'Digital Twin & National Policy', desc: 'The model outlines a digital twin integration (MES platform) coupled with policy proposals like Extended Producer Responsibility (EPR) and standard recycling protocols.' }
        ]
    }
};

// Start Application on Load
window.addEventListener('DOMContentLoaded', () => {
    initApp();
});

// Primary Initialization
async function initApp() {
    // Initialize Lucide icons
    lucide.createIcons();
    
    // Setup tabs
    setupTabs();
    
    // Load text coordinate index first
    try {
        const response = await fetch('map_text_index.json');
        textData = await response.json();
        console.log(`Loaded text index with ${textData.blocks.length} blocks.`);
    } catch (e) {
        console.error('Failed to load map text index:', e);
    }
    
    // Initialize Leaflet Map
    initLeafletMap();
    
    // Setup Modals and Toolbars
    setupToolbar();
    setupModals();
    setupSearch();
    setupTourController();
    setupInspectorActions();
    setupFigmaToolbar();
    setupMinimapInteractions();
    setupScrollbarInteractions();
}

// 1. Sidebar Tab Switching
function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const tabId = btn.getAttribute('data-tab');
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(c => c.classList.remove('active'));
            document.getElementById(`tab-${tabId}`).classList.add('active');
        });
    });
}

// 2. Initialize Leaflet Map
function initLeafletMap() {
    const overlay = document.getElementById('loading-overlay');
    
    try {
        map = L.map('leaflet-map', {
            crs: customSimpleCRS,
            minZoom: 0,
            maxZoom: 7,
            zoomSnap: 0.1,
            zoomDelta: 1,
            zoomControl: false,
            attributionControl: false, // Disable default bottom-right attribution
            scrollWheelZoom: false,    // Disable default wheel zoom to implement Figma controls
            maxBounds: MAP_BOUNDS,
            maxBoundsViscosity: 1.0
        });
        
        // Add attribution control to the bottom-left to prevent overlapping the minimap
        L.control.attribution({ position: 'bottomleft' }).addTo(map);
        
        // Add WebP tile layer
        tileLayer = L.tileLayer('tiles/{z}/{x}_{y}.webp', {
            minZoom: 0,
            maxZoom: 5,
            maxNativeZoom: 5, // Auto-scales zoom 5 tiles for zoom 6 & 7
            noWrap: true,
            bounds: MAP_BOUNDS
        }).addTo(map);
        
        // Custom Figma-style board navigation controls
        map.on('wheel', (e) => {
            const originalEvent = e.originalEvent;
            originalEvent.preventDefault();
            
            if (originalEvent.ctrlKey) {
                // Figma Zoom: Ctrl + Wheel (Pinch-to-zoom on trackpad) relative to cursor
                const zoomFactor = originalEvent.deltaY < 0 ? 0.15 : -0.15;
                if (e.latlng && e.containerPoint) {
                    const oldZoom = map.getZoom();
                    const newZoom = Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), oldZoom + zoomFactor));
                    
                    if (newZoom !== oldZoom) {
                        const mouseLatLng = e.latlng;
                        const containerPoint = e.containerPoint;
                        
                        map.setZoom(newZoom, { animate: false });
                        
                        const newLatLng = map.containerPointToLatLng(containerPoint);
                        const offsetLat = mouseLatLng.lat - newLatLng.lat;
                        const offsetLng = mouseLatLng.lng - newLatLng.lng;
                        const newCenter = L.latLng(map.getCenter().lat + offsetLat, map.getCenter().lng + offsetLng);
                        
                        map.setView(newCenter, newZoom, { animate: false });
                    }
                } else {
                    map.setZoom(map.getZoom() + zoomFactor);
                }
            } else if (originalEvent.shiftKey) {
                // Shift + Wheel = Horizontal Pan
                map.panBy([originalEvent.deltaY * 0.8, 0], { animate: false });
            } else {
                // Wheel alone = Vertical Pan (or touchpad 2-finger pan)
                map.panBy([originalEvent.deltaX * 0.8, originalEvent.deltaY * 0.8], { animate: false });
            }
        });
        
        // Synchronize viewport display and minimap
        map.on('move zoom moveend zoomend', onMapViewportChange);
        
        // Setup Map Interaction listeners
        setupMapInteractions();
        
        // Calculate starting position (far left)
        const container = document.getElementById('leaflet-map');
        const viewWidth = container ? container.clientWidth : 1920;
        const viewHeight = container ? container.clientHeight : 900;
        const padding = 40;
        const targetHeight = Math.max(200, viewHeight - padding);
        const targetScale = targetHeight / MAP_HEIGHT;
        const visibleWidth = viewWidth / targetScale;
        
        const targetZoom = getHeightFittingZoom();
        const startCenter = svgToLatLng(visibleWidth / 2, MAP_HEIGHT / 2);
        
        // Set initial view to fully zoomed out (fit bounds) immediately without animation
        map.fitBounds(MAP_BOUNDS, { animate: false });
        
        // Populate initial display values after map view is set
        onMapViewportChange();
        
        // Hide loading screen after map is initialized
        setTimeout(() => {
            overlay.classList.add('hidden');
            
            // Smoothly zoom in and glide to the left end of the map (the start of the map) over 3 seconds
            setTimeout(() => {
                map.flyTo(startCenter, targetZoom, {
                    animate: true,
                    duration: 3.0,
                    easeLinearity: 0.25
                });
            }, 600); // short delay after loader fades out
        }, 300);
        
    } catch (err) {
        console.error('Error initializing Leaflet Map:', err);
        overlay.querySelector('.loading-msg').innerText = 'Failed to load system map';
        overlay.querySelector('.loading-sub').innerText = err.message;
    }
}

// 3. Setup map click and hover interactions
function setupMapInteractions() {
    if (!map) return;
    
    // Mouse Click lookup
    map.on('click', (e) => {
        if (currentTool !== 'select') return; // Only inspect in select mode
        
        const svgPt = latLngToSvg(e.latlng);
        const block = findBlockAt(svgPt.x, svgPt.y);
        
        if (block) {
            const blockText = block.text.toLowerCase();
            if (blockText.includes('social aspect') || blockText === 'social aspect') {
                // Close inspector if open
                const inspector = document.getElementById('inspector');
                if (inspector) {
                    inspector.classList.add('collapsed');
                    isInspectorOpen = false;
                }
                playSocialAspectScrollAnimation();
            } else if (
                blockText.includes('lighthouse') || 
                blockText.includes('light house') || 
                blockText.includes('circular value chain') || 
                blockText.includes('environmental impact') || 
                blockText.includes('policy & compliance') ||
                blockText.includes('policy recommendation') ||
                blockText.includes('conclusion') ||
                blockText.includes('transition towards net-zero') ||
                blockText.includes('comparison of fully-automated') ||
                blockText.includes('pathways and interventions') ||
                blockText.includes('vision and scope') ||
                blockText.includes('goals')
            ) {
                // Overview section header click: zoom and pulse, do NOT open the node inspector!
                const inspector = document.getElementById('inspector');
                if (inspector) {
                    inspector.classList.add('collapsed');
                    isInspectorOpen = false;
                }
                triggerPulseHighlight(block);
                smoothFlyTo(block.cx, block.cy, getHeightFittingZoom());
            } else {
                inspectNode(block);
                triggerPulseHighlight(block);
                smoothFlyTo(block.cx, block.cy, getHeightFittingZoom());
            }
        }
    });
    
    // Mouse dragging cursors
    map.on('mousedown', () => updateCursor(true));
    map.on('mouseup', () => updateCursor(false));
    
    // Mouse Move hover highlighting & pointer cursor
    map.on('mousemove', (e) => {
        if (currentTool !== 'select') {
            updateCursor();
            if (hoverHighlightLayer) {
                map.removeLayer(hoverHighlightLayer);
                hoverHighlightLayer = null;
            }
            return;
        }
        
        const svgPt = latLngToSvg(e.latlng);
        const block = findBlockAt(svgPt.x, svgPt.y);
        const mapContainer = document.getElementById('leaflet-map');
        
        if (block) {
            mapContainer.style.cursor = 'pointer';
            
            // Draw hover highlighting box
            if (!hoverHighlightLayer || hoverHighlightLayer._block !== block) {
                if (hoverHighlightLayer) {
                    map.removeLayer(hoverHighlightLayer);
                }
                
                const bounds = [
                    svgToLatLng(block.x0, block.y0),
                    svgToLatLng(block.x1, block.y1)
                ];
                
                hoverHighlightLayer = L.rectangle(bounds, {
                    color: '#10b981',
                    weight: 1.5,
                    fillColor: '#10b981',
                    fillOpacity: 0.15,
                    interactive: false
                }).addTo(map);
                hoverHighlightLayer._block = block;
            }
        } else {
            mapContainer.style.cursor = '';
            if (hoverHighlightLayer) {
                map.removeLayer(hoverHighlightLayer);
                hoverHighlightLayer = null;
            }
        }
    });
    
    // Update minimap size on resize
    window.addEventListener('resize', () => {
        map.invalidateSize();
        updateMinimap();
    });
}

// Helper to look up a block at coordinates
function findBlockAt(svgX, svgY, buffer = 30) {
    if (!textData) return null;
    let closestBlock = null;
    let minDistance = Infinity;
    
    textData.blocks.forEach(b => {
        const insideX = svgX >= b.x0 - buffer && svgX <= b.x1 + buffer;
        const insideY = svgY >= b.y0 - buffer && svgY <= b.y1 + buffer;
        
        if (insideX && insideY) {
            const dx = svgX - b.cx;
            const dy = svgY - b.cy;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < minDistance) {
                minDistance = dist;
                closestBlock = b;
            }
        }
    });
    return closestBlock;
}

// Helper to find a block by matching text keywords (useful for snapping guided tours to exact nodes)
function findBlockByText(searchStr) {
    if (!textData || !searchStr) return null;
    const query = searchStr.toLowerCase().trim();
    
    // 1. Try finding a block containing the string exactly
    let match = textData.blocks.find(b => b.text.toLowerCase().includes(query));
    if (match) return match;
    
    // 2. Try matching the first line of the block
    match = textData.blocks.find(b => {
        const firstLine = b.text.split('\n')[0].toLowerCase().trim();
        return query.includes(firstLine) || firstLine.includes(query);
    });
    if (match) return match;
    
    // 3. Try key phrases for tour step mappings
    const keyPhrases = [
        { key: 'rekha', phrase: "Rekha's Story" },
        { key: 'lighthouse', phrase: "Lighthouse Model" },
        { key: 'post-consumer', phrase: "Global Textile Waste" },
        { key: 'collection', phrase: "Collection & Sorting" },
        { key: 'thread', phrase: "Thread Processing" },
        { key: 'weaving', phrase: "Fabric & Apparel" },
        { key: 'export', phrase: "Exports" },
        { key: 'scope 2', phrase: "Particulate Emissions" },
        { key: 'daly', phrase: "Human Health" },
        { key: 'mode', phrase: "Transportation" },
        { key: 'ftp 2023', phrase: "Import Licenses" },
        { key: 'obligation', phrase: "Export Obligations" },
        { key: 'pollution', phrase: "Pollution Control" },
        { key: 'nir', phrase: "NIR Sorting" },
        { key: 'conveyor', phrase: "Automated Material" },
        { key: 'digital twin', phrase: "Digital Twin" }
    ];
    
    const phraseMatch = keyPhrases.find(p => query.includes(p.key) || query.includes(p.phrase.toLowerCase()));
    if (phraseMatch) {
        match = textData.blocks.find(b => b.text.toLowerCase().includes(phraseMatch.key));
        if (match) return match;
    }
    
    return null;
}

// 4. Center-on Camera Glide (Direct linear pan-and-zoom)
function smoothFlyTo(targetCx, targetCy, targetZoom) {
    if (!map) return;
    map.setView(svgToLatLng(targetCx, targetCy), targetZoom, {
        animate: true,
        duration: 1.2,
        easeLinearity: 0.20
    });
}

// 5. Autocomplete Search Setup
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    const dropdown = document.getElementById('search-results-dropdown');
    const clearBtn = document.getElementById('search-clear-btn');
    
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();
        
        if (query.length === 0) {
            dropdown.classList.add('hidden');
            clearBtn.style.display = 'none';
            return;
        }
        
        clearBtn.style.display = 'flex';
        
        if (!textData) return;
        
        // Find matching blocks
        const matches = textData.blocks.filter(b => b.text.toLowerCase().includes(query));
        
        // Sort matches by relevance (starts with query, contains query, etc.)
        matches.sort((a, b) => {
            const aText = a.text.toLowerCase();
            const bText = b.text.toLowerCase();
            const aStartsWith = aText.startsWith(query);
            const bStartsWith = bText.startsWith(query);
            if (aStartsWith && !bStartsWith) return -1;
            if (!aStartsWith && bStartsWith) return 1;
            return a.text.length - b.text.length;
        });
        
        // Inject results
        dropdown.innerHTML = '';
        if (matches.length === 0) {
            dropdown.innerHTML = '<div class="search-no-results">No system nodes match your query</div>';
        } else {
            matches.slice(0, 15).forEach(m => {
                const item = document.createElement('div');
                item.className = 'search-suggestion-item';
                
                // Highlight matching characters in suggestion text
                const textSnippet = m.text.replace(/\n/g, ' ');
                const matchStart = textSnippet.toLowerCase().indexOf(query);
                const matchEnd = matchStart + query.length;
                
                let highlightedText = textSnippet;
                if (matchStart !== -1) {
                    highlightedText = textSnippet.slice(0, matchStart) + 
                        `<span class="text-emerald" style="font-weight: 700;">${textSnippet.slice(matchStart, matchEnd)}</span>` + 
                        textSnippet.slice(matchEnd);
                }
                
                item.innerHTML = `
                    <div class="search-suggestion-text">${highlightedText}</div>
                    <div class="search-suggestion-coords">Coords: X=${m.cx}, Y=${m.cy}</div>
                `;
                
                // Click suggestion
                item.addEventListener('click', () => {
                    dropdown.classList.add('hidden');
                    searchInput.value = textSnippet;
                    
                    // Glide to search target
                    smoothFlyTo(m.cx, m.cy, getHeightFittingZoom());
                    
                    // Open inspector & load node
                    inspectNode(m);
                    
                    // Trigger Pulse Highlight Ring
                    triggerPulseHighlight(m);
                });
                dropdown.appendChild(item);
            });
        }
        
        dropdown.classList.remove('hidden');
    });
    
    // Clear button action
    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        dropdown.classList.add('hidden');
        clearBtn.style.display = 'none';
        searchInput.focus();
    });
    
    // Hide dropdown if clicked outside
    document.addEventListener('click', (event) => {
        if (!searchInput.contains(event.target) && !dropdown.contains(event.target)) {
            dropdown.classList.add('hidden');
        }
    });
}

// 6. Pulse Highlight Ring on Map using Leaflet SVG paths
function triggerPulseHighlight(node) {
    // Remove existing highlights
    if (pulseHighlightLayer) {
        map.removeLayer(pulseHighlightLayer);
        pulseHighlightLayer = null;
    }
    
    if (!map) return;
    
    const w = Math.max(node.x1 - node.x0, 80);
    const h = Math.max(node.y1 - node.y0, 30);
    
    // Define bounds for highlight box
    const bounds = [
        svgToLatLng(node.cx - w/2 - 15, node.cy - h/2 - 10),
        svgToLatLng(node.cx + w/2 + 15, node.cy + h/2 + 10)
    ];
    
    pulseHighlightLayer = L.rectangle(bounds, {
        color: '#10b981',
        weight: 4,
        fillColor: 'none',
        fillOpacity: 0,
        className: 'pulse-highlight',
        interactive: false
    }).addTo(map);
    
    const layerToCleanup = pulseHighlightLayer;
    
    // Clean up highlight ring after 6 seconds
    setTimeout(() => {
        if (map.hasLayer(layerToCleanup)) {
            const el = layerToCleanup.getElement();
            if (el) {
                el.style.opacity = '0';
                el.style.transition = 'opacity 1s ease';
                setTimeout(() => {
                    map.removeLayer(layerToCleanup);
                    if (pulseHighlightLayer === layerToCleanup) {
                        pulseHighlightLayer = null;
                    }
                }, 1000);
            } else {
                map.removeLayer(layerToCleanup);
                if (pulseHighlightLayer === layerToCleanup) {
                    pulseHighlightLayer = null;
                }
            }
        }
    }, 6000);
}

// 7. Map Sections Navigation Controller
function setupTourController() {
    const cards = document.querySelectorAll('.tour-card');
    
    cards.forEach(card => {
        card.addEventListener('click', (e) => {
            const tourId = card.getAttribute('data-tour');
            const tour = tours[tourId];
            if (!tour) return;
            
            // Toggle active visual card state
            document.querySelectorAll('.tour-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            
            // Close inspector if open when switching sections
            const inspector = document.getElementById('inspector');
            if (inspector) {
                inspector.classList.add('collapsed');
                isInspectorOpen = false;
            }
            
            // Get first step info
            const step = tour.steps[0];
            const exactBlock = findBlockByText(step.title) || findBlockByText(step.desc);
            const cx = exactBlock ? exactBlock.cx : step.cx;
            const cy = exactBlock ? exactBlock.cy : step.cy;
            
            if (tourId === 'value-chain') {
                // Circular Value Chain: start at far left and pan right (3 seconds)
                const targetZoom = getHeightFittingZoom();
                const container = document.getElementById('leaflet-map');
                const viewWidth = container ? container.clientWidth : 1920;
                const viewHeight = container ? container.clientHeight : 900;
                const padding = 40;
                const targetHeight = Math.max(200, viewHeight - padding);
                const targetScale = targetHeight / MAP_HEIGHT;
                const visibleWidth = viewWidth / targetScale;
                
                const startCenter = svgToLatLng(visibleWidth / 2, MAP_HEIGHT / 2);
                map.setView(startCenter, targetZoom, { animate: false });
                
                setTimeout(() => {
                    const scrollDistance = 1500;
                    map.panTo(svgToLatLng(visibleWidth / 2 + scrollDistance, MAP_HEIGHT / 2), {
                        animate: true,
                        duration: 3.0,
                        easeLinearity: 0.25
                    });
                }, 100);
                
                triggerPulseHighlight(exactBlock || step);
                
            } else if (tourId === 'rekha') {
                playSocialAspectScrollAnimation();
            } else {
                // Other sections: simple direct glide at getHeightFittingZoom()
                const targetZoom = getHeightFittingZoom();
                smoothFlyTo(cx, cy, targetZoom);
                
                if (exactBlock) {
                    triggerPulseHighlight(exactBlock);
                } else {
                    triggerPulseHighlight({
                        cx: step.cx,
                        cy: step.cy,
                        x0: step.cx - 150,
                        x1: step.cx + 150,
                        y0: step.cy - 40,
                        y1: step.cy + 40
                    });
                }
            }
        });
    });
}

// 8. Dynamic Node Inspector
function inspectNode(node) {
    selectedNode = node; // Store globally for keyboard shortcuts
    const inspector = document.getElementById('inspector');
    const titleEl = document.getElementById('inspector-title');
    const badgeEl = document.getElementById('inspector-badge');
    const descEl = document.getElementById('inspector-desc');
    const cxEl = document.getElementById('coord-cx');
    const cyEl = document.getElementById('coord-cy');
    
    titleEl.innerText = node.text.split('\n')[0];
    
    // Categorize node based on coordinates or content keywords
    let type = node.type || 'System Landmark';
    if (!node.type) {
        const txt = node.text.toLowerCase();
        if (txt.includes('emission') || txt.includes('co₂') || txt.includes('pm2.5')) {
            type = 'Environmental Metric';
            badgeEl.style.backgroundColor = 'var(--rose-glow)';
            badgeEl.style.color = 'var(--rose)';
            badgeEl.style.borderColor = 'rgba(244, 63, 94, 0.3)';
        } else if (txt.includes('must') || txt.includes('rules') || txt.includes('governed') || txt.includes('license')) {
            type = 'Regulatory & Policy Compliance';
            badgeEl.style.backgroundColor = 'var(--amber-glow)';
            badgeEl.style.color = 'var(--amber)';
            badgeEl.style.borderColor = 'rgba(245, 158, 11, 0.3)';
        } else if (txt.includes('rekha') || txt.includes('women') || txt.includes('workers')) {
            type = 'Social Narrative Block';
            badgeEl.style.backgroundColor = 'var(--rose-glow)';
            badgeEl.style.color = 'var(--rose)';
            badgeEl.style.borderColor = 'rgba(244, 63, 94, 0.3)';
        } else if (txt.includes('lighthouse') || txt.includes('automated') || txt.includes('digital twin')) {
            type = 'Lighthouse Model Phase';
            badgeEl.style.backgroundColor = 'var(--blue-glow)';
            badgeEl.style.color = 'var(--blue)';
            badgeEl.style.borderColor = 'rgba(59, 130, 246, 0.3)';
        } else if (txt.includes('sorting') || txt.includes('carding') || txt.includes('dryer') || txt.includes('opener')) {
            type = 'Infrastructure & Machine';
            badgeEl.style.backgroundColor = 'var(--indigo-glow)';
            badgeEl.style.color = 'var(--indigo)';
            badgeEl.style.borderColor = 'rgba(99, 102, 241, 0.3)';
        } else {
            type = 'Value Chain Element';
            badgeEl.style.backgroundColor = 'var(--emerald-glow)';
            badgeEl.style.color = 'var(--emerald)';
            badgeEl.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        }
    }
    
    badgeEl.innerText = type;
    descEl.innerText = node.text;
    cxEl.innerText = node.cx.toFixed(1);
    cyEl.innerText = node.cy.toFixed(1);
    
    // Open Inspector Sidebar
    inspector.classList.remove('collapsed');
    isInspectorOpen = true;
    
    // Store selected node coordinates on inspector focus buttons
    document.getElementById('btn-inspector-focus').onclick = () => {
        smoothFlyTo(node.cx, node.cy, getHeightFittingZoom());
        triggerPulseHighlight(node);
    };
    
    document.getElementById('btn-inspector-share').onclick = () => {
        const coordString = `X: ${node.cx.toFixed(1)}, Y: ${node.cy.toFixed(1)}`;
        navigator.clipboard.writeText(coordString).then(() => {
            const originalText = document.getElementById('btn-inspector-share').innerHTML;
            document.getElementById('btn-inspector-share').innerHTML = '<i data-lucide="check"></i> Copied!';
            lucide.createIcons();
            setTimeout(() => {
                document.getElementById('btn-inspector-share').innerHTML = originalText;
                lucide.createIcons();
            }, 1500);
        });
    };
}

function setupInspectorActions() {
    document.getElementById('btn-close-inspector').addEventListener('click', () => {
        document.getElementById('inspector').classList.add('collapsed');
        isInspectorOpen = false;
        
        // Remove active highlights
        if (pulseHighlightLayer) {
            map.removeLayer(pulseHighlightLayer);
            pulseHighlightLayer = null;
        }
    });
}

// 9. Floating Minimap / Viewport Synchronization
function updateMinimap() {
    if (!map || !map._loaded) return;
    
    const miniImg = document.getElementById('minimap-img');
    const miniLens = document.getElementById('minimap-lens');
    const minimapContainer = document.getElementById('minimap-container');
    if (!miniImg || !miniLens || !minimapContainer) return;
    
    if (minimapContainer.classList.contains('collapsed')) return;
    
    const imgRect = miniImg.getBoundingClientRect();
    const imgW = imgRect.width;
    const imgH = imgRect.height;
    
    if (imgW === 0 || imgH === 0) return;
    
    // Scale factors mapping real SVG coordinates to minimap pixel units
    const kX = imgW / MAP_WIDTH;
    const kY = imgH / MAP_HEIGHT;
    
    // Main map visible bounds
    const bounds = map.getBounds();
    
    const svgVisibleX = bounds.getWest();
    const svgVisibleY = -bounds.getNorth();
    const svgVisibleW = bounds.getEast() - bounds.getWest();
    const svgVisibleH = bounds.getNorth() - bounds.getSouth();
    
    // Convert visible box to minimap relative pixel styles
    let lensX = svgVisibleX * kX;
    let lensY = svgVisibleY * kY;
    let lensW = svgVisibleW * kX;
    let lensH = svgVisibleH * kY;
    
    // Constrain lens boundary inside minimap image canvas
    if (lensX < 0) { lensW += lensX; lensX = 0; }
    if (lensY < 0) { lensH += lensY; lensY = 0; }
    if (lensX + lensW > imgW) { lensW = imgW - lensX; }
    if (lensY + lensH > imgH) { lensH = imgH - lensY; }
    
    // Set absolute positioning styles
    miniLens.style.left = `${lensX}px`;
    miniLens.style.top = `${lensY}px`;
    miniLens.style.width = `${Math.max(lensW, 8)}px`;
    miniLens.style.height = `${Math.max(lensH, 4)}px`;
}

function setupMinimapInteractions() {
    const toggleMinimapBtn = document.getElementById('btn-toggle-minimap');
    const minimapContainer = document.getElementById('minimap-container');
    const viewportBox = document.querySelector('.minimap-viewport-box');
    const miniImg = document.getElementById('minimap-img');
    const miniLens = document.getElementById('minimap-lens');
    
    if (!toggleMinimapBtn || !minimapContainer || !viewportBox || !miniImg || !miniLens) return;
    
    // Collapse / Expand Toggle
    toggleMinimapBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        minimapContainer.classList.toggle('collapsed');
        const isCollapsed = minimapContainer.classList.contains('collapsed');
        toggleMinimapBtn.innerHTML = isCollapsed ? '<i data-lucide="chevron-up"></i>' : '<i data-lucide="chevron-down"></i>';
        lucide.createIcons();
    });
    
    // Click & Drag variables
    let isDragging = false;
    
    function centerMapOnMinimapClick(e) {
        if (minimapContainer.classList.contains('collapsed')) return;
        
        const imgRect = miniImg.getBoundingClientRect();
        if (imgRect.width === 0 || imgRect.height === 0) return;
        
        // Calculate click coordinates relative to the image
        const clickX = e.clientX - imgRect.left;
        const clickY = e.clientY - imgRect.top;
        
        // Clamping to image bounds
        const pctX = Math.max(0, Math.min(clickX / imgRect.width, 1));
        const pctY = Math.max(0, Math.min(clickY / imgRect.height, 1));
        
        const svgX = pctX * MAP_WIDTH;
        const svgY = pctY * MAP_HEIGHT;
        
        map.panTo(svgToLatLng(svgX, svgY), { animate: true });
    }
    
    viewportBox.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isDragging = true;
        centerMapOnMinimapClick(e);
    });
    
    window.addEventListener('mousemove', (e) => {
        if (!isDragging || !map || minimapContainer.classList.contains('collapsed')) return;
        
        const imgRect = miniImg.getBoundingClientRect();
        if (imgRect.width === 0 || imgRect.height === 0) return;
        
        const clickX = e.clientX - imgRect.left;
        const clickY = e.clientY - imgRect.top;
        
        const pctX = Math.max(0, Math.min(clickX / imgRect.width, 1));
        const pctY = Math.max(0, Math.min(clickY / imgRect.height, 1));
        
        const svgX = pctX * MAP_WIDTH;
        const svgY = pctY * MAP_HEIGHT;
        
        map.setView(svgToLatLng(svgX, svgY), map.getZoom(), { animate: false });
    });
    
    window.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

// 10. Figma Board Navigation Controls & Keyboard Shortcuts setup
function setupFigmaToolbar() {
    const toolSelect = document.getElementById('tool-select');
    const toolHand = document.getElementById('tool-hand');
    const zoomOutBtn = document.getElementById('toolbar-zoom-out');
    const zoomInBtn = document.getElementById('toolbar-zoom-in');
    const zoomPercentBtn = document.getElementById('toolbar-zoom-percent');
    const zoomDropdownMenu = document.getElementById('zoom-dropdown-menu');
    const resetBtn = document.getElementById('toolbar-reset');
    const shortcutsBtn = document.getElementById('toolbar-shortcuts');
    
    // Modal elements
    const shortcutsModal = document.getElementById('shortcuts-modal');
    const closeShortcutsBtn = document.getElementById('btn-close-shortcuts-modal');
    
    if (!toolSelect || !toolHand) return;
    
    // Toggle Select Tool
    toolSelect.addEventListener('click', () => {
        currentTool = 'select';
        toolSelect.classList.add('active');
        toolHand.classList.remove('active');
        updateCursor();
    });
    
    // Toggle Hand Tool
    toolHand.addEventListener('click', () => {
        currentTool = 'hand';
        toolHand.classList.add('active');
        toolSelect.classList.remove('active');
        updateCursor();
    });
    
    // Zoom In/Out
    zoomOutBtn.addEventListener('click', () => map && map.zoomOut());
    zoomInBtn.addEventListener('click', () => map && map.zoomIn());
    
    // Zoom Percent Dropdown Toggle
    zoomPercentBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        zoomDropdownMenu.classList.toggle('hidden');
    });
    
    // Close zoom dropdown on click outside
    document.addEventListener('click', () => {
        zoomDropdownMenu.classList.add('hidden');
    });
    
    // Handle Dropdown Actions
    zoomDropdownMenu.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            const zoomType = btn.getAttribute('data-zoom');
            if (zoomType === 'fit') {
                map && map.fitBounds(MAP_BOUNDS);
            } else {
                const targetZoomPercent = parseInt(zoomType, 10);
                const lZoom = 5 + Math.log2(targetZoomPercent / 100);
                map && map.setZoom(lZoom);
            }
            zoomDropdownMenu.classList.add('hidden');
        });
    });
    
    // Reset Button (Home): Zoom and fly to the left end of the map (the startup view)
    resetBtn.addEventListener('click', () => {
        if (!map) return;
        const container = document.getElementById('leaflet-map');
        const viewWidth = container ? container.clientWidth : 1920;
        const viewHeight = container ? container.clientHeight : 900;
        const padding = 40;
        const targetHeight = Math.max(200, viewHeight - padding);
        const targetScale = targetHeight / MAP_HEIGHT;
        const visibleWidth = viewWidth / targetScale;
        
        const targetZoom = getHeightFittingZoom();
        const startCenter = svgToLatLng(visibleWidth / 2, MAP_HEIGHT / 2);
        
        map.flyTo(startCenter, targetZoom, {
            animate: true,
            duration: 1.5,
            easeLinearity: 0.25
        });
    });
    
    // Keyboard Shortcuts Dialog
    shortcutsBtn.addEventListener('click', () => {
        shortcutsModal.classList.remove('hidden');
    });
    closeShortcutsBtn.addEventListener('click', () => {
        shortcutsModal.classList.add('hidden');
    });
    shortcutsModal.addEventListener('click', (e) => {
        if (e.target === shortcutsModal) {
            shortcutsModal.classList.add('hidden');
        }
    });
    
    // Global Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
            return;
        }
        
        const key = e.key.toLowerCase();
        
        // H: Switch to Hand tool
        if (key === 'h') {
            currentTool = 'hand';
            toolHand.classList.add('active');
            toolSelect.classList.remove('active');
            updateCursor();
        }
        
        // V: Switch to Select tool
        if (key === 'v') {
            currentTool = 'select';
            toolSelect.classList.add('active');
            toolHand.classList.remove('active');
            updateCursor();
        }
        
        // Spacebar keydown: Temporary Hand tool panning
        if (e.code === 'Space' && !prevToolBeforeSpace) {
            prevToolBeforeSpace = currentTool;
            currentTool = 'hand';
            toolHand.classList.add('active');
            toolSelect.classList.remove('active');
            updateCursor();
            e.preventDefault();
        }
        
        // Shift + 1: Zoom to Fit
        if (e.shiftKey && e.key === '1') {
            map && map.fitBounds(MAP_BOUNDS);
            e.preventDefault();
        }
        
        // Shift + 0 or Ctrl + 0: Zoom to 100%
        if ((e.shiftKey && e.key === '0') || (e.ctrlKey && e.key === '0')) {
            map && map.setZoom(5);
            e.preventDefault();
        }
        
        // Shift + 2: Zoom to selection
        if (e.shiftKey && e.key === '2') {
            if (selectedNode) {
                smoothFlyTo(selectedNode.cx, selectedNode.cy, getHeightFittingZoom());
                triggerPulseHighlight(selectedNode);
            }
            e.preventDefault();
        }
        
        // Ctrl + Plus / Ctrl + Equals: Zoom In
        if (e.ctrlKey && (e.key === '=' || e.key === '+')) {
            map && map.zoomIn();
            e.preventDefault();
        }
        
        // Ctrl + Minus: Zoom Out
        if (e.ctrlKey && e.key === '-') {
            map && map.zoomOut();
            e.preventDefault();
        }
    });
    
    // Spacebar keyup: Restore tool
    window.addEventListener('keyup', (e) => {
        if (e.code === 'Space' && prevToolBeforeSpace) {
            currentTool = prevToolBeforeSpace;
            prevToolBeforeSpace = null;
            if (currentTool === 'hand') {
                toolHand.classList.add('active');
                toolSelect.classList.remove('active');
            } else {
                toolSelect.classList.add('active');
                toolHand.classList.remove('active');
            }
            updateCursor();
            e.preventDefault();
        }
    });
}

function updateCursor(isMouseDown = false) {
    const mapContainer = document.getElementById('leaflet-map');
    if (!mapContainer) return;
    
    if (currentTool === 'hand') {
        mapContainer.style.cursor = isMouseDown ? 'grabbing' : 'grab';
    } else {
        mapContainer.style.cursor = '';
    }
}

function onMapViewportChange() {
    updateMinimap();
    updateZoomDisplay();
    updateScrollbar();
}

function updateZoomDisplay() {
    if (!map || !map._loaded) return;
    const zoomPct = Math.round(Math.pow(2, map.getZoom() - 5) * 100);
    const zoomText = `${zoomPct}%`;
    
    const zoomValEl = document.getElementById('zoom-value');
    if (zoomValEl) zoomValEl.innerText = zoomText;
    
    const miniZoomBadge = document.getElementById('minimap-zoom-badge');
    if (miniZoomBadge) miniZoomBadge.innerText = zoomText;
}

function playSocialAspectScrollAnimation() {
    if (!map) return;
    
    const targetZoom = getHeightFittingZoom() + 0.6; // Keep this zoom level
    const centerX = 8600; // Center of the Social Aspects poster
    
    const container = document.getElementById('leaflet-map');
    const viewHeight = container ? container.clientHeight : 900;
    const scale = map.options.crs.scale(targetZoom);
    const hScreen = viewHeight / scale;
    
    // Calculate vertical limits based on viewport size
    const yTop = Math.max(hScreen / 2, 0);
    const yBottom = Math.max(yTop, MAP_HEIGHT - hScreen / 2);
    
    const startCenter = svgToLatLng(centerX, yTop);
    const endCenter = svgToLatLng(centerX, yBottom);
    
    // Set view to top instantly
    map.setView(startCenter, targetZoom, { animate: false });
    
    // Smoothly scroll down panned coordinates
    setTimeout(() => {
        map.panTo(endCenter, {
            animate: true,
            duration: 3.5,
            easeLinearity: 0.20
        });
    }, 300);
    
    // Trigger starting node pulse highlight
    const step = tours['rekha'].steps[0];
    const exactBlock = findBlockByText(step.title) || findBlockByText(step.desc);
    
    if (exactBlock) {
        triggerPulseHighlight(exactBlock);
    }
}

// 10. Toolbar Controls Binding
function setupToolbar() {
    // Sidebar visibility toggle
    const sidebar = document.getElementById('sidebar');
    const sidebarToggleBtn = document.getElementById('btn-sidebar-toggle');
    if (sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            // Force map resizing after layout shift
            setTimeout(() => map && map.invalidateSize(), 300);
        });
    }
    
    // Dark/Light Theme toggler
    const themeBtn = document.getElementById('btn-theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    
    if (themeBtn && themeIcon) {
        themeBtn.addEventListener('click', () => {
            isDarkTheme = !isDarkTheme;
            if (isDarkTheme) {
                document.body.className = 'dark-theme';
                themeIcon.setAttribute('data-lucide', 'sun');
            } else {
                document.body.className = 'light-theme';
                themeIcon.setAttribute('data-lucide', 'moon');
            }
            lucide.createIcons();
        });
    }
}

// 11. Modals and Media Action Handlers
function setupModals() {
    const videoItems = document.querySelectorAll('.video-item');
    const docItems = document.querySelectorAll('.doc-item');
    const driveFolderUrl = 'https://drive.google.com/drive/folders/1PcBKlWXs9o7yig4awD23NVET7KYIqEBA?usp=drive_link';
    
    videoItems.forEach(item => {
        item.addEventListener('click', () => {
            window.open(driveFolderUrl, '_blank');
        });
    });
    
    docItems.forEach(item => {
        item.addEventListener('click', () => {
            window.open(driveFolderUrl, '_blank');
        });
    });
    
    // Keep reference elements safely in case other code expects them to exist
    const videoModal = document.getElementById('video-modal');
    const videoPlayer = document.getElementById('project-video-player');
    const pdfModal = document.getElementById('pdf-modal');
    const pdfViewer = document.getElementById('project-pdf-viewer');
    
    const closeVideoBtn = document.getElementById('btn-close-video-modal');
    if (closeVideoBtn && videoModal && videoPlayer) {
        closeVideoBtn.addEventListener('click', () => {
            videoModal.classList.add('hidden');
            videoPlayer.pause();
        });
    }
    
    const closePdfBtn = document.getElementById('btn-close-pdf-modal');
    if (closePdfBtn && pdfModal && pdfViewer) {
        closePdfBtn.addEventListener('click', () => {
            pdfModal.classList.add('hidden');
            pdfViewer.src = '';
        });
    }
    
    if (videoModal && videoPlayer) {
        videoModal.addEventListener('click', (e) => {
            if (e.target === videoModal) {
                videoModal.classList.add('hidden');
                videoPlayer.pause();
            }
        });
    }
    
    if (pdfModal) {
        pdfModal.addEventListener('click', (e) => {
            if (e.target === pdfModal) {
                pdfModal.classList.add('hidden');
                pdfViewer.src = '';
            }
        });
    }
}

function updateScrollbar() {
    if (!map || !map._loaded) return;
    try {
        const track = document.querySelector('.scrollbar-track');
        const thumb = document.getElementById('scrollbar-thumb-lens');
        if (!track || !thumb) return;
        
        const trackWidth = track.clientWidth;
        if (trackWidth === 0) return;
        
        const bounds = map.getBounds();
        const west = bounds.getWest();
        const east = bounds.getEast();
        
        let left = (west / MAP_WIDTH) * trackWidth;
        let width = ((east - west) / MAP_WIDTH) * trackWidth;
        
        if (left < 0) { width += left; left = 0; }
        if (left + width > trackWidth) { width = trackWidth - left; }
        
        thumb.style.left = `${left}px`;
        thumb.style.width = `${Math.max(width, 24)}px`;
    } catch (e) {
        // Safe fallback
    }
}

function setupScrollbarInteractions() {
    const track = document.querySelector('.scrollbar-track');
    const thumb = document.getElementById('scrollbar-thumb-lens');
    const scrollbarContainer = document.getElementById('horizontal-scrollbar-viewport');
    
    if (!track || !thumb || !scrollbarContainer) return;
    
    let isDragging = false;
    
    function centerMapOnScrollbarClick(e) {
        const rect = track.getBoundingClientRect();
        if (rect.width === 0) return;
        
        const clickX = e.clientX - rect.left;
        const pctX = Math.max(0, Math.min(clickX / rect.width, 1));
        const svgX = pctX * MAP_WIDTH;
        
        const currentCenter = map.getCenter();
        const newCenter = L.latLng(currentCenter.lat, svgX);
        
        map.panTo(newCenter, { animate: false });
    }
    
    scrollbarContainer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isDragging = true;
        centerMapOnScrollbarClick(e);
    });
    
    window.addEventListener('mousemove', (e) => {
        if (!isDragging || !map) return;
        
        const rect = track.getBoundingClientRect();
        if (rect.width === 0) return;
        
        const clickX = e.clientX - rect.left;
        const pctX = Math.max(0, Math.min(clickX / rect.width, 1));
        const svgX = pctX * MAP_WIDTH;
        
        const currentCenter = map.getCenter();
        const newCenter = L.latLng(currentCenter.lat, svgX);
        
        map.setView(newCenter, map.getZoom(), { animate: false });
    });
    
    window.addEventListener('mouseup', () => {
        isDragging = false;
    });
}
