(function () {
  const params = new URLSearchParams(window.location.search);
  const validPortals = ["Creativity", "Work", "Home", "Wellbeing", "Relationships", "Community", "Style"];
  const requestedPortal = params.get("portal") || "";
  const portal = validPortals.find(function (name) {
    return name.toLowerCase() === requestedPortal.toLowerCase();
  }) || null;
  const entry = (params.get("entry") || "web").toLowerCase();
  const zone = params.get("zone") || null;
  const isPhysicalEntry = entry === "nfc";

  const context = {
    entry: entry,
    portal: portal,
    zone: zone,
    physical: isPhysicalEntry,
    openedAt: new Date().toISOString()
  };

  window.STAAR_ENTRY_CONTEXT = context;

  try {
    sessionStorage.setItem("staarwardd-entry-context", JSON.stringify(context));
  } catch (error) {
    // The experience still works if storage is unavailable.
  }

  if (!isPhysicalEntry) return;

  document.addEventListener("DOMContentLoaded", function () {
    document.documentElement.classList.add("physical-entry");

    const badge = document.createElement("div");
    badge.className = "physical-entry-badge";
    badge.setAttribute("role", "status");
    badge.setAttribute("aria-live", "polite");

    const portalLabel = portal ? portal.toUpperCase() + " PORTAL" : "STAAR HUB";
    const zoneLabel = zone ? zone.replace(/[-_]+/g, " ").toUpperCase() : "PHYSICAL SPACE";

    badge.innerHTML = "<span>⌁</span><div><b>" + portalLabel + " CONNECTED</b><small>NFC · " + zoneLabel + "</small></div>";
    document.body.appendChild(badge);

    window.setTimeout(function () {
      badge.classList.add("settled");
    }, 4200);
  });
})();
