// Assuming this is a JavaScript file for a front-end application
// that fetches partner data from an API and renders it

// Define a function to fetch and render partner data
function loadPartners() {
  // Fetch partner data from the API
  fetch(`${window.apiBase}/api/partners`)
    .then(response => {
      // Check if the response is okay (status in the range 200-299)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json(); // Parse the JSON from the response
    })
    .then(data => {
      // Render the partner data
      renderPartners(data);
    })
    .catch(err => {
      // Handle and log any errors
      console.error('API error', err);
    });
}

// Define a function to render partner data
function renderPartners(partners) {
  // Get the container element where partners will be rendered
  const container = document.getElementById('partners-container');
  container.innerHTML = ''; // Clear any existing content

  // Check if there are no partners to display
  if (!partners || partners.length === 0) {
    container.innerHTML = '<p>No partners found.</p>';
    return;
  }

  // Create and append elements for each partner
  partners.forEach(partner => {
    const partnerDiv = document.createElement('div');
    partnerDiv.className = 'partner';

    // Add partner details (assuming partner object has 'name' and 'logo' properties)
    partnerDiv.innerHTML = `
      <h3>${partner.name}</h3>
      <img src="${partner.logo}" alt="${partner.name} logo">
    `;

    // Append the partner div to the container
    container.appendChild(partnerDiv);
  });
}

// Call the loadPartners function to fetch and display partners on page load
document.addEventListener('DOMContentLoaded', loadPartners);