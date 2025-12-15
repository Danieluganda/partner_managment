// External Partners Tracker JavaScript
document.addEventListener("DOMContentLoaded", function () {
  // Page elements
  const searchInput = document.getElementById("externalSearch");
  const quickSearchInput = document.getElementById("quickExternalSearch");
  const stageFilter = document.getElementById("stageExternalFilter");
  const statusFilter = document.getElementById("statusExternalFilter");
  const responsibleFilter = document.getElementById(
    "responsibleExternalFilter"
  );
  const dataTable = document.getElementById("externalTable");
  const refreshBtn = document.getElementById("refreshExternalBtn");
  const exportBtn = document.getElementById("exportExternalBtn");

  // Stats elements
  const totalExternalElement = document.getElementById("totalExternal");
  const activeEngagementsElement = document.getElementById("activeEngagements");
  const pendingTasksElement = document.getElementById("pendingTasks");
  const upcomingDeadlinesElement = document.getElementById("upcomingDeadlines");

  // Footer elements
  const showingCountElement = document.getElementById("showingExternalCount");
  const totalCountElement = document.getElementById("totalExternalCount");
  const footerOnTrackCountElement =
    document.getElementById("footerOnTrackCount");
  const footerAtRiskCountElement = document.getElementById("footerAtRiskCount");
  const footerSuccessRateElement = document.getElementById("footerSuccessRate");

  // Action elements
  const addExternalBtn = document.getElementById("addExternalBtn");
  const generateReportBtn = document.getElementById("generateReportBtn");

  // External partners data - use backend data if available, otherwise fallback to sample data
  let externalPartnersData = [];

  let filteredData = [...externalPartnersData];
  let currentSort = { field: null, direction: "asc" };

  // Initialize the page
  init();

  function init() {
    // Initialize data from backend if available
    if (window.externalPartnersData && window.externalPartnersData.length > 0) {
      console.log(
        "Using backend external partners data:",
        window.externalPartnersData
      );
      externalPartnersData = window.externalPartnersData.map((partner) => ({
        partnerName: partner.partnerName || partner.name || "",
        keyContact: partner.keyContact || partner.contact || "",
        dateInitiated: partner.dateInitiated || "",
        currentStage: partner.currentStage || partner.stage || "",
        keyObjectives:
          partner.keyObjectives ||
          (partner.objectives ? partner.objectives.join(", ") : "") ||
          "",
        status: partner.status || "",
        pendingTasks: partner.pendingTasks
          ? Array.isArray(partner.pendingTasks)
            ? partner.pendingTasks
            : partner.pendingTasks.split(",").map((t) => t.trim())
          : [],
        responsible: partner.responsible || partner.responsiblePerson || "",
        deadline: partner.deadline || "",
        notesBlockers: partner.notesBlockers || partner.notes || "",
        priority: partner.priority || "medium",
        budget: partner.estimatedValue || "",
        duration: partner.duration || "",
        id: partner.id,
      }));

      // Update filtered data
      filteredData = [...externalPartnersData];
    }

    renderTable();
    updateStats();
    updateFooterStats();
    bindEvents();
  }

  function bindEvents() {
    // Search functionality
    if (searchInput) {
      searchInput.addEventListener("input", handleSearch);
    }

    if (quickSearchInput) {
      quickSearchInput.addEventListener("input", handleQuickSearch);
    }

    // Filter functionality
    if (stageFilter) {
      stageFilter.addEventListener("change", handleStageFilter);
    }

    if (statusFilter) {
      statusFilter.addEventListener("change", handleStatusFilter);
    }

    if (responsibleFilter) {
      responsibleFilter.addEventListener("change", handleResponsibleFilter);
    }

    // Refresh functionality
    if (refreshBtn) {
      refreshBtn.addEventListener("click", handleRefresh);
    }

    // Export functionality
    if (exportBtn) {
      exportBtn.addEventListener("click", handleExport);
    }

    // Additional actions
    if (addExternalBtn) {
      addExternalBtn.addEventListener("click", handleAddExternal);
    }

    if (generateReportBtn) {
      generateReportBtn.addEventListener("click", handleGenerateReport);
    }

    // Sorting functionality
    const sortableHeaders = document.querySelectorAll(".sortable");
    sortableHeaders.forEach((header) => {
      header.addEventListener("click", () => handleSort(header.dataset.sort));
    });
  }

  function handleSearch(event) {
    performFilter();
  }

  function handleQuickSearch(event) {
    performFilter();
  }

  function handleStageFilter(event) {
    performFilter();
  }

  function handleStatusFilter(event) {
    performFilter();
  }

  function handleResponsibleFilter(event) {
    performFilter();
  }

  function performFilter() {
    const searchTerm = (searchInput?.value || quickSearchInput?.value || "")
      .toLowerCase()
      .trim();
    const stageValue = stageFilter?.value || "";
    const statusValue = statusFilter?.value || "";
    const responsibleValue = responsibleFilter?.value || "";

    filteredData = externalPartnersData.filter((partner) => {
      // Search filter
      const matchesSearch =
        searchTerm === "" ||
        partner.partnerName.toLowerCase().includes(searchTerm) ||
        partner.keyContact.toLowerCase().includes(searchTerm) ||
        partner.keyObjectives.toLowerCase().includes(searchTerm) ||
        partner.responsible.toLowerCase().includes(searchTerm) ||
        partner.notesBlockers.toLowerCase().includes(searchTerm) ||
        partner.pendingTasks.some((task) =>
          task.toLowerCase().includes(searchTerm)
        );

      // Stage filter
      const matchesStage =
        stageValue === "" || partner.currentStage === stageValue;

      // Status filter
      const matchesStatus =
        statusValue === "" || partner.status === statusValue;

      // Responsible filter
      const matchesResponsible =
        responsibleValue === "" || partner.responsible === responsibleValue;

      return (
        matchesSearch && matchesStage && matchesStatus && matchesResponsible
      );
    });

    renderTable();
    updateStats();
    updateFooterStats();
  }

  function handleRefresh() {
    // Add loading state
    if (refreshBtn) {
      const originalText = refreshBtn.innerHTML;
      refreshBtn.innerHTML =
        '<span class="icon">⏳</span><span>Loading...</span>';
      refreshBtn.disabled = true;
    }

    // Simulate API call
    setTimeout(() => {
      // Reset to original data
      filteredData = [...externalPartnersData];
      renderTable();
      updateStats();
      updateFooterStats();

      // Clear search inputs and filters
      if (searchInput) searchInput.value = "";
      if (quickSearchInput) quickSearchInput.value = "";
      if (stageFilter) stageFilter.value = "";
      if (statusFilter) statusFilter.value = "";
      if (responsibleFilter) responsibleFilter.value = "";

      // Reset refresh button
      if (refreshBtn) {
        refreshBtn.innerHTML =
          '<span class="icon">↻</span><span>Refresh</span>';
        refreshBtn.disabled = false;
      }

      showNotification(
        "External partners data refreshed successfully!",
        "success"
      );
    }, 1500);
  }

  function handleSort(field) {
    if (currentSort.field === field) {
      currentSort.direction = currentSort.direction === "asc" ? "desc" : "asc";
    } else {
      currentSort.field = field;
      currentSort.direction = "asc";
    }

    // Update sort indicators
    document.querySelectorAll(".sortable").forEach((header) => {
      header.classList.remove("sorted-asc", "sorted-desc");
    });

    const currentHeader = document.querySelector(`[data-sort="${field}"]`);
    if (currentHeader) {
      currentHeader.classList.add(`sorted-${currentSort.direction}`);
    }

    // Sort data
    filteredData.sort((a, b) => {
      let valueA = a[field];
      let valueB = b[field];

      // Handle date fields
      if (field === "dateInitiated" || field === "deadline") {
        valueA = new Date(valueA);
        valueB = new Date(valueB);
      }

      // Handle array fields (pending tasks)
      if (field === "pendingTasks") {
        valueA = valueA.length;
        valueB = valueB.length;
      }

      // Handle string comparison
      if (typeof valueA === "string" && typeof valueB === "string") {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }

      let comparison = 0;
      if (valueA > valueB) {
        comparison = 1;
      } else if (valueA < valueB) {
        comparison = -1;
      }

      return currentSort.direction === "desc" ? comparison * -1 : comparison;
    });

    renderTable();
  }

  function renderTable() {
    if (!dataTable) return;

    const tbody = dataTable.querySelector("tbody");
    if (!tbody) return;

    if (filteredData.length === 0) {
      tbody.innerHTML = `
                <tr>
                    <td colspan="11" class="no-data">
                        <div class="empty-state">
                            <div class="empty-icon">🤝</div>
                            <div class="empty-text">No external partners data available</div>
                            <div class="empty-subtext">Try adjusting your search criteria or filters</div>
                        </div>
                    </td>
                </tr>
            `;
      return;
    }

    tbody.innerHTML = filteredData
      .map(
        (partner) => `
            <tr>
                <td class="partner-name-cell">${partner.partnerName}</td>
                <td class="contact-cell">${partner.keyContact}</td>
                <td class="date-cell">${formatDate(partner.dateInitiated)}</td>
                <td class="stage-cell">
                    <span class="stage-badge stage-${partner.currentStage}">
                        ${capitalizeWords(
                          partner.currentStage.replace("-", " ")
                        )}
                    </span>
                </td>
                <td class="objectives-cell">
                    <span class="objectives-text" title="${
                      partner.keyObjectives
                    }">
                        ${partner.keyObjectives}
                    </span>
                </td>
                <td class="status-cell">
                    <span class="status-badge status-${partner.status}">
                        ${capitalizeWords(partner.status.replace("-", " "))}
                    </span>
                </td>
                <td class="pending-tasks-cell">
                    <div class="tasks-list">
                        ${partner.pendingTasks
                          .slice(0, 2)
                          .map(
                            (task) => `<span class="task-item">${task}</span>`
                          )
                          .join("")}
                        ${
                          partner.pendingTasks.length > 2
                            ? `<span class="task-item">+${
                                partner.pendingTasks.length - 2
                              } more</span>`
                            : ""
                        }
                    </div>
                </td>
                <td class="responsible-cell">${partner.responsible}</td>
                <td class="deadline-cell ${getDeadlineClass(partner.deadline)}">
                    ${formatDate(partner.deadline)}
                </td>
                <td class="notes-cell">
                    <span class="notes-text" title="${partner.notesBlockers}">
                        ${partner.notesBlockers}
                    </span>
                </td>
                <td class="actions-cell">
                    <button class="action-btn view" onclick="viewExternalDetails('${encodeURIComponent(
                      partner.partnerName
                    )}')">
                        View
                    </button>
                    <button class="action-btn update" onclick="updateExternalStatus('${encodeURIComponent(
                      partner.partnerName
                    )}')">
                        Update
                    </button>
                </td>
            </tr>
        `
      )
      .join("");
  }

  function updateStats() {
    const totalExternal = filteredData.length;
    const activeEngagements = filteredData.filter((p) =>
      [
        "negotiation",
        "due-diligence",
        "contract-review",
        "execution",
        "ongoing",
      ].includes(p.currentStage)
    ).length;
    const totalPendingTasks = filteredData.reduce(
      (sum, p) => sum + p.pendingTasks.length,
      0
    );
    const upcomingDeadlines = filteredData.filter((p) => {
      const deadline = new Date(p.deadline);
      const now = new Date();
      const diffTime = deadline - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 30 && diffDays > 0;
    }).length;

    if (totalExternalElement) {
      totalExternalElement.textContent = totalExternal.toLocaleString();
    }

    if (activeEngagementsElement) {
      activeEngagementsElement.textContent = activeEngagements.toLocaleString();
    }

    if (pendingTasksElement) {
      pendingTasksElement.textContent = totalPendingTasks.toLocaleString();
    }

    if (upcomingDeadlinesElement) {
      upcomingDeadlinesElement.textContent = upcomingDeadlines.toLocaleString();
    }
  }

  function updateFooterStats() {
    const totalExternal = filteredData.length;
    const onTrackCount = filteredData.filter(
      (p) => p.status === "on-track"
    ).length;
    const atRiskCount = filteredData.filter(
      (p) => p.status === "at-risk"
    ).length;
    const completedCount = filteredData.filter(
      (p) => p.status === "completed"
    ).length;

    const successRate =
      totalExternal > 0
        ? (((onTrackCount + completedCount) / totalExternal) * 100).toFixed(1)
        : 0;

    if (showingCountElement) {
      showingCountElement.textContent = totalExternal.toLocaleString();
    }

    if (totalCountElement) {
      totalCountElement.textContent =
        externalPartnersData.length.toLocaleString();
    }

    if (footerOnTrackCountElement) {
      footerOnTrackCountElement.textContent = onTrackCount.toLocaleString();
    }

    if (footerAtRiskCountElement) {
      footerAtRiskCountElement.textContent = atRiskCount.toLocaleString();
    }

    if (footerSuccessRateElement) {
      footerSuccessRateElement.textContent = `${successRate}%`;
    }
  }

  function handleExport() {
    try {
      const csvContent = generateExternalCSV();
      downloadCSV(csvContent, "external-partners-tracker.csv");
      showNotification(
        "External partners data exported successfully!",
        "success"
      );
    } catch (error) {
      console.error("Export failed:", error);
      showNotification("Export failed. Please try again.", "error");
    }
  }

  function handleAddExternal() {
    const partnerName = prompt("Enter new external partner name:");
    if (partnerName) {
      showNotification(
        `New external partner "${partnerName}" would be added in a real application.`,
        "info"
      );
    }
  }

  function handleGenerateReport() {
    showNotification(
      "Generating comprehensive external partners report...",
      "info"
    );

    setTimeout(() => {
      const reportData = {
        totalPartners: filteredData.length,
        activeEngagements: filteredData.filter((p) =>
          [
            "negotiation",
            "due-diligence",
            "contract-review",
            "execution",
            "ongoing",
          ].includes(p.currentStage)
        ).length,
        completedProjects: filteredData.filter((p) => p.status === "completed")
          .length,
        totalBudget: filteredData.reduce(
          (sum, p) =>
            sum +
            parseFloat(p.budget.replace(/[$MK,]/g, "")) *
              (p.budget.includes("M")
                ? 1000000
                : p.budget.includes("K")
                ? 1000
                : 1),
          0
        ),
      };

      alert(`External Partners Report Summary:
            
Total Partners: ${reportData.totalPartners}
Active Engagements: ${reportData.activeEngagements}
Completed Projects: ${reportData.completedProjects}
Total Budget: $${(reportData.totalBudget / 1000000).toFixed(1)}M

Full report would be generated in a real application.`);
    }, 1500);
  }

  function generateExternalCSV() {
    const headers = [
      "Partner Name",
      "Key Contact",
      "Date Initiated",
      "Current Stage",
      "Key Objectives",
      "Status",
      "Pending Tasks",
      "Responsible",
      "Deadline",
      "Notes & Blockers",
      "Budget",
      "Duration",
    ];

    let csv = headers.join(",") + "\n";

    filteredData.forEach((partner) => {
      const row = [
        `"${partner.partnerName}"`,
        `"${partner.keyContact}"`,
        partner.dateInitiated,
        partner.currentStage,
        `"${partner.keyObjectives}"`,
        partner.status,
        `"${partner.pendingTasks.join("; ")}"`,
        `"${partner.responsible}"`,
        partner.deadline,
        `"${partner.notesBlockers}"`,
        partner.budget,
        partner.duration,
      ];
      csv += row.join(",") + "\n";
    });

    return csv;
  }

  function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  }

  function getDeadlineClass(deadlineString) {
    const deadline = new Date(deadlineString);
    const now = new Date();
    const diffTime = deadline - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "deadline-overdue";
    if (diffDays <= 7) return "deadline-urgent";
    if (diffDays <= 30) return "deadline-soon";
    return "";
  }

  function capitalizeWords(str) {
    return str.replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }

  function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">
                    ${
                      type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️"
                    }
                </span>
                <span class="notification-message">${message}</span>
            </div>
        `;

    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${
              type === "success"
                ? "#10b981"
                : type === "error"
                ? "#ef4444"
                : "#3b82f6"
            };
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            font-weight: 500;
            min-width: 300px;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.transform = "translateX(0)";
    }, 100);

    setTimeout(() => {
      notification.style.transform = "translateX(100%)";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  // Global functions for action buttons
  window.viewExternalDetails = function (encodedPartnerName) {
    const partnerName = decodeURIComponent(encodedPartnerName);
    const partner = externalPartnersData.find(
      (p) => p.partnerName === partnerName
    );

    if (partner) {
      const details = `
External Partner Details

Partner: ${partner.partnerName}
Key Contact: ${partner.keyContact}
Date Initiated: ${formatDate(partner.dateInitiated)}

Current Stage: ${capitalizeWords(partner.currentStage.replace("-", " "))}
Status: ${capitalizeWords(partner.status.replace("-", " "))}
Responsible: ${partner.responsible}
Deadline: ${formatDate(partner.deadline)}

Key Objectives:
${partner.keyObjectives}

Pending Tasks:
${
  partner.pendingTasks.length > 0
    ? partner.pendingTasks.map((task) => `• ${task}`).join("\n")
    : "No pending tasks"
}

Budget: ${partner.budget}
Duration: ${partner.duration}
Priority: ${capitalizeWords(partner.priority)}

Notes & Blockers:
${partner.notesBlockers}
            `.trim();

      alert(details);
    }
  };

  window.updateExternalStatus = function (encodedPartnerName) {
    const partnerName = decodeURIComponent(encodedPartnerName);
    const partner = externalPartnersData.find(
      (p) => p.partnerName === partnerName
    );

    if (partner) {
      const newStatus = prompt(
        `Update status for ${partnerName}:\n\nCurrent: ${partner.status}\n\nEnter new status (on-track, at-risk, delayed, blocked, completed):`
      );

      if (
        newStatus &&
        ["on-track", "at-risk", "delayed", "blocked", "completed"].includes(
          newStatus
        )
      ) {
        partner.status = newStatus;
        renderTable();
        updateStats();
        updateFooterStats();
        showNotification(`Status updated for ${partnerName}!`, "success");
      } else if (newStatus) {
        showNotification(
          "Invalid status. Please use: on-track, at-risk, delayed, blocked, or completed",
          "error"
        );
      }
    }
  };

  // Keyboard shortcuts
  document.addEventListener("keydown", function (event) {
    if ((event.ctrlKey || event.metaKey) && event.key === "k") {
      event.preventDefault();
      if (searchInput) {
        searchInput.focus();
      }
    }

    if ((event.ctrlKey || event.metaKey) && event.key === "e") {
      event.preventDefault();
      handleExport();
    }

    if ((event.ctrlKey || event.metaKey) && event.key === "r") {
      event.preventDefault();
      handleRefresh();
    }

    if ((event.ctrlKey || event.metaKey) && event.key === "n") {
      event.preventDefault();
      handleAddExternal();
    }
  });
});
