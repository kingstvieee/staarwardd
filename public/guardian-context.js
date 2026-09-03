(function () {
  const nativeFetch = window.fetch.bind(window);

  function entryContext() {
    return window.STAAR_ENTRY_CONTEXT || {entry:"web",portal:null,zone:null,physical:false};
  }

  function contextPrefix(context) {
    const parts = [];
    if (context.physical) parts.push("Physical entry: NFC");
    if (context.zone) parts.push("Zone: " + context.zone);
    if (context.portal) parts.push("Entry portal: " + context.portal);
    return parts.length ? "[STAAR Hub context: " + parts.join("; ") + "] " : "";
  }

  window.fetch = async function (input, init) {
    const url = typeof input === "string" ? input : (input && input.url) || "";
    if (url === "/api/plan" && init && typeof init.body === "string") {
      try {
        const payload = JSON.parse(init.body);
        const context = entryContext();
        payload.entryContext = context;
        if (typeof payload.input === "string") {
          payload.input = contextPrefix(context) + payload.input;
        }
        init = Object.assign({}, init, {body:JSON.stringify(payload)});
      } catch (error) {
        // Preserve the original request if the payload cannot be parsed.
      }
    }
    return nativeFetch(input, init);
  };

  document.addEventListener("DOMContentLoaded", function () {
    const announcer = document.getElementById("portalAnnouncer");
    if (announcer) {
      const observer = new MutationObserver(function () {
        const value = announcer.textContent || "";
        if (/ portal summoned\.$/i.test(value)) {
          announcer.textContent = value.replace(/ portal summoned\.$/i, " life domain online.");
        }
      });
      observer.observe(announcer, {childList:true,characterData:true,subtree:true});
    }

    const context = entryContext();
    const promise = document.getElementById("workspacePromise");
    const workspace = document.getElementById("portalWorkspace");
    if (context.physical && workspace && promise) {
      const observer = new MutationObserver(function () {
        if (!workspace.classList.contains("open")) return;
        const zone = context.zone ? context.zone.replace(/[-_]+/g, " ") : "this space";
        if (!promise.dataset.basePromise) promise.dataset.basePromise = promise.textContent;
        const base = promise.dataset.basePromise || promise.textContent;
        if (!promise.textContent.includes("Physical context")) {
          promise.textContent = base + " · Physical context: " + zone;
        }
      });
      observer.observe(workspace, {attributes:true,attributeFilter:["class"]});
    }
  });
})();
