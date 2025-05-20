// This script integrates with Google Drive API to fetch chemistry past papers
// and implements a search functionality for the papers

// Configuration
const config = {
    // API key is pre-configured but can be changed by the user
    apiKey: "AIzaSyB2Wtg77YjAWFituiLDuuTeC2Lm04IgShs",
    folderId: "18euyXUXsVx5vU2609tj63WYt8J9JyzKk" // The Google Drive folder ID you provided
};

// DOM Elements
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const resultsContainer = document.getElementById('results-container');
const filtersForm = document.getElementById('filters-form');
const loadingIndicator = document.getElementById('loading-indicator');
const apiKeyForm = document.getElementById('api-key-form');
const apiKeyInput = document.getElementById('api-key-input');

// Try to get API Key from localStorage or use the default
function getApiKey() {
    const savedApiKey = localStorage.getItem('chemistrySearchApiKey');
    
    if (savedApiKey) {
        config.apiKey = savedApiKey;
    }
    
    hideApiKeyForm();
    initClient();
}

// Show API Key form
function showApiKeyForm() {
    if (apiKeyForm) {
        apiKeyForm.style.display = 'flex';
    }
    
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
}

// Hide API Key form
function hideApiKeyForm() {
    if (apiKeyForm) {
        apiKeyForm.style.display = 'none';
    }
}

// Handle API Key form submission
function handleApiKeySubmit(event) {
    event.preventDefault();
    
    const apiKey = apiKeyInput.value.trim();
    
    if (apiKey) {
        config.apiKey = apiKey;
        localStorage.setItem('chemistrySearchApiKey', apiKey);
        hideApiKeyForm();
        initClient();
    }
}

// Initialize the Google API client
function initClient() {
    // Show loading indicator
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
    }
    
    // Load the Google API client
    gapi.load('client', initGoogleClient);
}

function initGoogleClient() {
    gapi.client.init({
        apiKey: config.apiKey,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
    }).then(() => {
        console.log('Google API client initialized');
        // Hide the loading indicator when API is ready
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
        
        // Add event listeners after API is initialized
        if (searchForm) {
            searchForm.addEventListener('submit', handleSearch);
        }
        
        // Load initial papers list
        fetchPapers();
    }).catch(error => {
        console.error('Error initializing Google API client:', error);
        showError('Failed to connect to Google Drive. Please check your API key and try again.');
        
        // Show API key form on error
        showApiKeyForm();
    });
}

// Fetch papers from Google Drive
function fetchPapers(query = '') {
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
    }
    
    // Get selected filters
    const filters = getSelectedFilters();
    
    // Construct the query
    let fullQuery = `'${config.folderId}' in parents and mimeType contains 'application/pdf'`;
    
    // Add search term if provided
    if (query) {
        fullQuery += ` and name contains '${query}'`;
    }
    
    // Add filters if any are selected
    if (filters.length > 0) {
        fullQuery += ` and (${filters.map(filter => `name contains '${filter}'`).join(' or ')})`;
    }
    
    gapi.client.drive.files.list({
        q: fullQuery,
        fields: 'files(id, name, webViewLink, thumbnailLink, createdTime)',
        orderBy: 'createdTime desc',
        pageSize: 50
    }).then(response => {
        displayResults(response.result.files);
    }).catch(error => {
        console.error('Error fetching papers:', error);
        showError('Failed to fetch papers. Please try again later.');
    }).finally(() => {
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    });
}

// Get selected filters from the form
function getSelectedFilters() {
    const filters = [];
    
    if (!filtersForm) {
        return filters;
    }
    
    // Get all checked topic checkboxes
    const topicCheckboxes = filtersForm.querySelectorAll('input[name="topic"]:checked');
    topicCheckboxes.forEach(checkbox => {
        filters.push(checkbox.value);
    });
    
    // Get selected year if any
    const yearSelect = filtersForm.querySelector('select[name="year"]');
    if (yearSelect && yearSelect.value !== '') {
        filters.push(yearSelect.value);
    }
    
    return filters;
}

// Handle search form submission
function handleSearch(event) {
    event.preventDefault();
    const query = searchInput.value.trim();
    fetchPapers(query);
}

// Display search results
function displayResults(files) {
    if (!resultsContainer) {
        return;
    }
    
    resultsContainer.innerHTML = '';
    
    if (files.length === 0) {
        resultsContainer.innerHTML = '<p class="no-results">No past papers found matching your criteria. Try changing your search terms or filters.</p>';
        return;
    }
    
    const resultsGrid = document.createElement('div');
    resultsGrid.className = 'results-grid';
    
    files.forEach(file => {
        const paperCard = createPaperCard(file);
        resultsGrid.appendChild(paperCard);
    });
    
    resultsContainer.appendChild(resultsGrid);
}

// Create a card for a paper
function createPaperCard(file) {
    const card = document.createElement('div');
    card.className = 'paper-card';
    
    // Extract year and topic from filename if possible
    const fileInfo = extractFileInfo(file.name);
    
    // Create thumbnail or icon
    const thumbnailContainer = document.createElement('div');
    thumbnailContainer.className = 'paper-thumbnail';
    
    if (file.thumbnailLink) {
        const thumbnail = document.createElement('img');
        thumbnail.src = file.thumbnailLink;
        thumbnail.alt = 'Paper thumbnail';
        thumbnailContainer.appendChild(thumbnail);
    } else {
        thumbnailContainer.innerHTML = '<i class="fas fa-file-pdf"></i>';
    }
    
    // Create paper details
    const detailsContainer = document.createElement('div');
    detailsContainer.className = 'paper-details';
    
    const title = document.createElement('h3');
    title.textContent = file.name;
    
    const metadata = document.createElement('div');
    metadata.className = 'paper-metadata';
    
    if (fileInfo.year) {
        const yearBadge = document.createElement('span');
        yearBadge.className = 'badge year-badge';
        yearBadge.textContent = fileInfo.year;
        metadata.appendChild(yearBadge);
    }
    
    if (fileInfo.topic) {
        const topicBadge = document.createElement('span');
        topicBadge.className = 'badge topic-badge';
        topicBadge.textContent = fileInfo.topic;
        metadata.appendChild(topicBadge);
    }
    
    // Create button to view the paper
    const viewButton = document.createElement('a');
    viewButton.href = file.webViewLink;
    viewButton.target = '_blank';
    viewButton.className = 'btn btn-primary';
    viewButton.textContent = 'View Paper';
    
    // Assemble the card
    detailsContainer.appendChild(title);
    detailsContainer.appendChild(metadata);
    detailsContainer.appendChild(viewButton);
    
    card.appendChild(thumbnailContainer);
    card.appendChild(detailsContainer);
    
    return card;
}

// Extract year and topic from filename
function extractFileInfo(filename) {
    const info = {
        year: null,
        topic: null
    };
    
    // Try to extract year (assuming format like 2020, 2021, etc.)
    const yearMatch = filename.match(/20\d{2}/);
    if (yearMatch) {
        info.year = yearMatch[0];
    }
    
    // Try to extract topic
    const topics = ['organic', 'inorganic', 'physical', 'analytical', 'biochemistry'];
    for (const topic of topics) {
        if (filename.toLowerCase().includes(topic)) {
            info.topic = topic.charAt(0).toUpperCase() + topic.slice(1);
            break;
        }
    }
    
    return info;
}

// Show error message
function showError(message) {
    if (!resultsContainer) {
        return;
    }
    
    resultsContainer.innerHTML = `<p class="error-message">${message}</p>`;
}

// Show API key form manually
function changeApiKey() {
    showApiKeyForm();
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Load the Google API script
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = getApiKey;
    document.body.appendChild(script);
    
    // Add event listeners for filters
    if (filtersForm) {
        const filterInputs = filtersForm.querySelectorAll('input, select');
        filterInputs.forEach(input => {
            input.addEventListener('change', () => {
                const query = searchInput ? searchInput.value.trim() : '';
                fetchPapers(query);
            });
        });
    }
    
    // Add event listener for API key form
    if (apiKeyForm) {
        apiKeyForm.addEventListener('submit', handleApiKeySubmit);
    }
    
    // Add event listener for change API key button
    const changeApiKeyBtn = document.getElementById('change-api-key-btn');
    if (changeApiKeyBtn) {
        changeApiKeyBtn.addEventListener('click', changeApiKey);
    }
});