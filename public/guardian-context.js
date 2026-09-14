(function () {
  const nativeFetch = window.fetch.bind(window);

  function entryContext() {
    return window.STAAR_ENTRY_CONTEXT || {entry:"web",portal:null,zone:null,physical:false};
  }

  function validatedContext(context) {
    return {
      entry: context && context.physical ? "nfc" : "web",
      portal: context && typeof context.portal === "string" ? context.portal : null,
      zone: context && typeof context.zone === "string"
        ? context.zone.replace(/[^a-z0-9 _-]/gi, "").trim().slice(0, 64) || null
        : null,
      physical: !!(context && context.physical)
    };
  }

  window.fetch = async function (input, init) {
    const url = typeof input === "string" ? input : (input && input.url) || "";
    if (url === "/api/plan" && init && typeof init.body === "string") {
      try {
        const payload = JSON.parse(init.body);
        const context = validatedContext(entryContext());
        payload.entryContext = context;
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
        const base = (promise.textContent || "").split(" · Physical context:")[0];
        if (!promise.textContent.includes("Physical context")) {
          promise.textContent = base + " · Physical context: " + zone;
        }
      });
      observer.observe(workspace, {attributes:true,attributeFilter:["class"]});
    }
  });
})();
