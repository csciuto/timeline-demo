// Global variables for flow view
let allFlowData = {}; // Store all data fetched from data.json
let allFlowCategories = new Set(); // Store unique categories for filtering

document.addEventListener('DOMContentLoaded', () => {
    console.log('Flow view page loaded.');
    setupFlowAccordionFilter(); // NEW: Setup accordion toggle listener
    setupFlowTextFilter();
    loadAndDisplayAllTiles();
});

// NEW: Setup accordion toggle listener
function setupFlowAccordionFilter() {
    const toggleBtn = document.getElementById('toggle-filters-btn');
    const filterContainer = document.getElementById('flow-category-filters');

    if (toggleBtn && filterContainer) {
        toggleBtn.addEventListener('click', () => {
            const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
            toggleBtn.setAttribute('aria-expanded', !isExpanded);
            filterContainer.classList.toggle('filters-collapsed');
        });
    } else {
         console.error("Could not find accordion filter button or container.");
    }
}

// NEW: Setup listener for the text filter input
function setupFlowTextFilter() {
    const textFilterInput = document.getElementById('flow-text-filter');
    if (textFilterInput) {
        // Use 'input' event for real-time filtering as user types
        textFilterInput.addEventListener('input', redisplayFlowTiles);
    }
}

async function loadAndDisplayAllTiles() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allFlowData = await response.json(); // Store data globally
        console.log('Timeline data loaded for flow view:', allFlowData);

        findAllFlowCategories(); // NEW: Find categories
        buildFlowCategoryFilters(); // NEW: Build filters in panel
        redisplayFlowTiles(); // NEW: Initial display using filter logic

    } catch (error) {
        console.error('Error loading timeline data for flow view:', error);
        const flowContainer = document.getElementById('flow-tiles-container');
        if (flowContainer) {
            flowContainer.innerHTML = '<p>Error loading events. Please try refreshing.</p>';
        }
    }
}

// NEW: Find all unique categories (similar to main script)
function findAllFlowCategories() {
    allFlowCategories.clear();
    for (const year in allFlowData) {
        allFlowData[year].forEach(tile => {
            if (tile.category) {
                allFlowCategories.add(tile.category);
            }
        });
    }
}

// NEW: Build category filters in the main page container
function buildFlowCategoryFilters() {
    const filterContainer = document.getElementById('flow-category-filters');
    if (!filterContainer) return;

    filterContainer.innerHTML = ''; // Clear previous content ('Loading filters...')

    // --- Create Filter Controls (All/None) --- 
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'flow-controls'; // Use class defined in flow.css

    const selectAllBtn = document.createElement('button');
    selectAllBtn.textContent = 'All';
    selectAllBtn.addEventListener('click', selectAllFlowCategories);

    const selectNoneBtn = document.createElement('button');
    selectNoneBtn.textContent = 'None';
    selectNoneBtn.addEventListener('click', selectNoneFlowCategories);

    controlsDiv.appendChild(selectAllBtn);
    controlsDiv.appendChild(selectNoneBtn);
    filterContainer.appendChild(controlsDiv);

    // --- Create Checkboxes --- 
    const checkboxesDiv = document.createElement('div');
    checkboxesDiv.className = 'flow-checkboxes';
    const categories = Array.from(allFlowCategories).sort();

    categories.forEach(category => {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = category;
        checkbox.checked = true; // Start with all checked
        checkbox.id = `flow-cat-filter-${category}`;
        checkbox.addEventListener('change', redisplayFlowTiles); // Trigger redisplay on change

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(category.charAt(0).toUpperCase() + category.slice(1)));
        checkboxesDiv.appendChild(label);
    });
    filterContainer.appendChild(checkboxesDiv);
}

// NEW: Helper to check all flow categories
function selectAllFlowCategories() {
    document.querySelectorAll('#flow-category-filters input[type="checkbox"]').forEach(cb => cb.checked = true);
    redisplayFlowTiles();
}

// NEW: Helper to uncheck all flow categories
function selectNoneFlowCategories() {
    document.querySelectorAll('#flow-category-filters input[type="checkbox"]').forEach(cb => cb.checked = false);
    redisplayFlowTiles();
}

// NEW: Get currently checked categories from the main page container
function getCheckedFlowCategories() {
    const checkedBoxes = document.querySelectorAll('#flow-category-filters input[type="checkbox"]:checked');
    return Array.from(checkedBoxes).map(cb => cb.value);
}

// MODIFIED: Function to clear and redisplay tiles based on filters (Category AND Text)
function redisplayFlowTiles() {
    const flowContainer = document.getElementById('flow-tiles-container');
    const textFilterInput = document.getElementById('flow-text-filter');
    if (!flowContainer || !textFilterInput) return;
    
    flowContainer.innerHTML = ''; // Clear existing tiles
    const checkedCategories = getCheckedFlowCategories();
    const searchText = textFilterInput.value.toLowerCase().trim(); // Get search text

    console.log("Filtering flow view by Categories:", checkedCategories);
    console.log("Filtering flow view by Text:", searchText);

    const years = Object.keys(allFlowData).sort((a, b) => parseInt(a) - parseInt(b));
    let tilesDisplayed = 0;

    years.forEach(year => {
        const events = allFlowData[year] || [];
        
        // Apply BOTH filters
        const filteredEvents = events.filter(tileInfo => { 
            // Category check
            const categoryMatch = !tileInfo.category || checkedCategories.includes(tileInfo.category);
            if (!categoryMatch) return false; // Exit early if category doesn't match
            
            // Text search check (only if search text exists)
            if (searchText) {
                const captionMatch = tileInfo.caption?.toLowerCase().includes(searchText);
                const tagsMatch = tileInfo.tags?.some(tag => tag.toLowerCase().includes(searchText));
                // Must match caption OR tags if searching
                if (!captionMatch && !tagsMatch) return false; 
            }
            
            // If we get here, all filters passed
            return true; 
        });
        
        filteredEvents.forEach(tileInfo => {
            const tileElement = createFlowTileElement(tileInfo);
            flowContainer.appendChild(tileElement);
            tilesDisplayed++;
        });
    });

    if (tilesDisplayed === 0) {
         flowContainer.innerHTML = '<p>No events match the selected filters.</p>';
    }
}

function createFlowTileElement(tileInfo) {
    const tileElement = document.createElement('div');
    tileElement.classList.add('flow-tile');

    // Add Year
    const yearDiv = document.createElement('div');
    yearDiv.classList.add('year');
    yearDiv.textContent = tileInfo.year;
    tileElement.appendChild(yearDiv);

    // Add Image or Placeholder
    if (tileInfo.photo) {
        const img = document.createElement('img');
        img.src = tileInfo.photo;
        img.alt = tileInfo.caption || `Image for ${tileInfo.year}`;
        img.onerror = function() { 
            this.style.display='none'; // Hide broken img
            console.warn(`Image failed to load: ${this.src}`);
        };
        tileElement.appendChild(img);
    }

    // Add Caption
    const captionDiv = document.createElement('div');
    captionDiv.classList.add('caption');
    captionDiv.textContent = tileInfo.caption || 'No caption';
    tileElement.appendChild(captionDiv);

    // Add Category
    if (tileInfo.category) {
        const categoryDiv = document.createElement('div');
        categoryDiv.classList.add('category');
        const formattedCategory = tileInfo.category.charAt(0).toUpperCase() + tileInfo.category.slice(1);
        categoryDiv.textContent = formattedCategory;
        tileElement.appendChild(categoryDiv);
    }

    return tileElement;
} 