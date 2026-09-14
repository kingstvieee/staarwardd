const $ = function (selector) { return document.querySelector(selector); };

const portals = [
  {name:"Creativity",icon:"✦",promise:"The futuristic creation studio",kicker:"DIGGITSTAAR CREATION STUDIO",description:"A serious production environment where ideas move through media, design, AI creation, review and publishing.",status:[["Studio","Active"],["Projects","3 in motion"],["Publish gate","Approval on"]],zones:[["Creation table","Shape the concept"],["Media wall","Edit image, sound and video"],["AI lab","Generate and refine"],["Publishing bay","Review before release"]],feature:"Enter DIGGITSTAAR workflows",prompts:["Turn my concept into a production workflow","Prepare this media project for review","Coordinate design, content and publishing"],tools:["Production pipeline","Media direction","Approval-ready publish"]},
  {name:"Work",icon:"▥",promise:"The Guardian command centre",kicker:"GUARDIAN COMMAND CENTRE",description:"Schedule, projects, meetings and communications converge here so conflicts can be resolved across every relevant portal.",status:[["Today","4 commitments"],["Conflict scan","1 detected"],["Focus window","Protected"]],zones:[["Schedule wall","See time and conflicts"],["Project table","Move priority work"],["Communications","Prepare responses"],["Cross-portal map","Coordinate the whole day"]],feature:"Open command briefing",prompts:["Brief me on today and resolve conflicts","Coordinate my projects, meetings and messages","Protect focus across every portal"],tools:["Conflict command","Project control","Communications desk"]},
  {name:"Home",icon:"⌂",promise:"The intelligent living environment",kicker:"LIVE SMART-HOME ENVIRONMENT",description:"Your rooms, devices, routines, security and household state respond as one—with arrival and departure intelligence.",status:[["Home state","Secure"],["Devices","12 connected"],["Arrival","Ready for you"]],zones:[["Living environment","See the household state"],["Routines","Morning, away and night"],["Security","Doors, sensors and alerts"],["Household","Supplies, care and maintenance"]],feature:"Enter STAAR Access",prompts:["Prepare the home for my arrival","Run an evening household and security check","Coordinate devices, routines and supplies"],tools:["Arrival intelligence","Guardian automation","Household state"]},
  {name:"Wellbeing",icon:"◉",promise:"A calmer space for sustainable rhythms",kicker:"CALM CONTEXT ENVIRONMENT",description:"Check-ins, routines and permitted wellbeing context help Guardian coordinate support without diagnosing or replacing professional care.",status:[["Energy check-in","Not shared"],["Routine","Evening reset"],["Privacy","Permission scoped"]],zones:[["Quiet centre","Pause and check in"],["Routine path","Food, movement and rest"],["Context vault","Control what is shared"],["Support bridge","Prepare useful next steps"]],feature:"Review wellbeing permissions",prompts:["Build a calm routine around my day","Help me check in without diagnosing me","Coordinate permitted wellbeing context with my schedule"],tools:["Gentle check-in","Routine composer","Permission controls"]},
  {name:"Relationships",icon:"∞",promise:"A living space for the people who matter",kicker:"LIVING RELATIONSHIP SPACE",description:"People, commitments, shared memories, plans and communication stay connected without reducing real relationships to generic prompts.",status:[["People","6 close connections"],["Commitments","2 upcoming"],["Messages","1 to prepare"]],zones:[["People constellation","Open a real relationship"],["Memory gallery","Recall shared context"],["Commitment table","Protect promises and plans"],["Communication room","Prepare a human message"]],feature:"Open people constellation",prompts:["Show the people and commitments needing attention","Prepare a message using our real context","Plan meaningful time without losing existing promises"],tools:["People context","Commitment keeper","Communication room"]},
  {name:"Community",icon:"◇",promise:"The real-world connection layer",kicker:"TORONTO CONNECTION LAYER",description:"Discover accessible events, places and opportunities nearby, then expand into trusted global community experiences.",status:[["Location","Toronto"],["Nearby","8 possibilities"],["Access filters","On"]],zones:[["Toronto map","Explore places nearby"],["Opportunity beacon","Find ways to participate"],["Accessibility layer","Filter for real access"],["Global window","Connect beyond the city"]],feature:"Explore nearby connections",prompts:["Find accessible Toronto events that fit my energy","Compare nearby places and opportunities","Connect a local plan to my wider community goals"],tools:["Local discovery","Access-aware map","Opportunity matcher"]},
  {name:"Style",icon:"△",promise:"Walk into your future wardrobe",kicker:"FUTURISTIC WARDROBE · RISING STAARDFORM",description:"A physical-feeling dressing room of illuminated racks, mirrors, outfits and a responsive Guardian Stylist—not a storefront pasted onto a page.",status:[["Wardrobe","Synced"],["Fitting mirror","Ready"],["Stylist","Present"]],zones:[["Illuminated racks","Browse complete looks"],["Fitting mirror","See silhouette and fit"],["Outfit plinth","Build the full look"],["Stylist station","Refine with Guardian"]],feature:"Enter RISING STAARDFORM atelier",prompts:["Walk me through a complete outfit fitting","Style a look from my real wardrobe","Build a RISING STAARDFORM look for my event"],tools:["Fitting mirror","Wardrobe intelligence","Guardian Stylist"]}
];

const PORTAL_START = 6.25;
const PORTAL_GAP = 1.15;
const SHIELD_START = PORTAL_START + (PORTAL_GAP * 6) + 1.25;
const CINEMATIC_END = SHIELD_START + 4.15;
const experience = $("#experience");
const guardianFlightVideo = $("#guardianFlightVideo");

if (guardianFlightVideo) {
  guardianFlightVideo.defaultMuted = true;
  guardianFlightVideo.muted = true;
  guardianFlightVideo.volume = 0;
  guardianFlightVideo.addEventListener("error", function () {
    experience.classList.add("flight-video-missing");
  });
}
const launchParams = new URLSearchParams(window.location.search);
const field = $("#portalField");
const portalElements = [];
let activePortal = portals[0];
let pending = null;
let sequenceTimers = [];
let sequenceId = 0;
let log = JSON.parse(localStorage.getItem("staarwardd-log") || localStorage.getItem("starward-log") || localStorage.getItem("blessync-log") || "[]");
let hubState = readHubState();
let walkthroughData = null;
let walkthroughIndex = -1;
let walkthroughPaused = false;
let walkthroughTimer = null;
let walkthroughRunId = 0;
let pendingWalkthroughLaunch = false;

function readHubState() {
  try { return JSON.parse(localStorage.getItem("staarwardd-hub-state") || "{}"); }
  catch (error) { return {}; }
}

function saveHubState(patch) {
  hubState = Object.assign({}, hubState, patch);
  localStorage.setItem("staarwardd-hub-state", JSON.stringify(hubState));
}

portals.forEach(function (portal, index) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "portal " + portal.name.toLowerCase();
  button.dataset.domain = portal.name;
  button.style.setProperty("--delay", (PORTAL_START + index * PORTAL_GAP) + "s");
  button.setAttribute("aria-label", "Open " + portal.name + ": " + portal.promise);
  const portalAsset = "/portal-" + portal.name.toLowerCase() + "-v7.webp";
  button.innerHTML = '<span class="portal-energy" aria-hidden="true"></span><span class="portal-art" aria-hidden="true"><img src="' + portalAsset + '" alt=""></span><span>' + portal.icon + " Enter " + portal.name + "</span>";
  button.addEventListener("pointerenter", function () {
    if (experience.classList.contains("ready")) score.hover(index);
  });
  button.addEventListener("click", function () { openPortal(portal, index); });
  field.append(button);
  portalElements.push(button);
});

const finalPortalElement = portalElements[portalElements.length - 1];
finalPortalElement.addEventListener("animationend", function (event) {
  if (event.target === finalPortalElement && /^portal-arrival-v/.test(event.animationName)) beginShield(sequenceId);
});

const mapleSigil = $(".maple-sigil");
if (mapleSigil) mapleSigil.addEventListener("animationend", function (event) {
  if (event.animationName === "maple-sigil-flight-v7") completeAwakening(sequenceId);
});

function schedule(fn, milliseconds) {
  const timer = setTimeout(fn, milliseconds);
  sequenceTimers.push(timer);
  return timer;
}

const SUMMON_CLASSES = portals.map(function (_, index) { return "summon-" + index; });

function setSummonStep(index) {
  SUMMON_CLASSES.forEach(function (name) { experience.classList.remove(name); });
  experience.classList.add("summon-" + index);
}

function clearSequence() {
  sequenceTimers.forEach(clearTimeout);
  sequenceTimers = [];
  SUMMON_CLASSES.forEach(function (name) { experience.classList.remove(name); });
  $("#portalAnnouncer").textContent = "";
}

function restartGuardianFilm() {
  if (!guardianFlightVideo || !motionOn) return;
  experience.classList.remove("flight-video-missing");
  guardianFlightVideo.pause();
  try { guardianFlightVideo.currentTime = 0; } catch (error) { }
  guardianFlightVideo.defaultMuted = true;
  guardianFlightVideo.muted = true;
  guardianFlightVideo.volume = 0;
  guardianFlightVideo.play().catch(function () {
    experience.classList.add("flight-video-missing");
  });
}

function awaken() {
  sequenceId += 1;
  const run = sequenceId;
  clearSequence();
  score.stop(0.05);
  experience.classList.remove("ready", "maple", "awakening");
  $("#portalWorkspace").classList.remove("open");
  $("#portalWorkspace").setAttribute("aria-hidden", "true");
  $("#replayButton").hidden = true;
  void experience.offsetWidth;
  experience.classList.add("awakening");
  restartGuardianFilm();
  score.begin(PORTAL_START, PORTAL_GAP, portals.length);
  portals.forEach(function (portal, index) {
    const cue = (PORTAL_START + index * PORTAL_GAP) * 1000;
    schedule(function () {
      setSummonStep(index);
      $("#portalAnnouncer").textContent = portal.name + " portal summoned.";
    }, cue);
  });
  schedule(function () { beginShield(run); }, SHIELD_START * 1000);
  schedule(function () { completeAwakening(run); }, CINEMATIC_END * 1000);
}

function beginShield(run) {
  if (run !== sequenceId || experience.classList.contains("maple") || experience.classList.contains("ready")) return;
  experience.classList.add("maple");
  score.shield();
}

function completeAwakening(run) {
  if (run !== sequenceId || experience.classList.contains("ready")) return;
  experience.classList.add("ready");
  experience.classList.remove("awakening", "maple");
  $("#replayButton").hidden = false;
  score.startAmbient();
  addLog("Guardian arrived and seven portals were summoned", "Cinematic");
  const requestedPortal = launchParams.get("portal");
  if (requestedPortal) {
    const portalIndex = portals.findIndex(function (portal) { return portal.name.toLowerCase() === requestedPortal.toLowerCase(); });
    if (portalIndex >= 0) schedule(function () { openPortal(portals[portalIndex], portalIndex); }, 450);
  }
  if (pendingWalkthroughLaunch) {
    pendingWalkthroughLaunch = false;
    schedule(startFullWalkthrough, 650);
  }
}

function replay() {
  score.stop(0.08);
  experience.classList.remove("ready", "maple", "awakening");
  void experience.offsetWidth;
  awaken();
}

$("#awakenButton").addEventListener("click", awaken);
$("#replayButton").addEventListener("click", replay);

if (launchParams.get("autoplay") === "1") {
  schedule(awaken, 180);
}

function openPortal(portal, index, options) {
  if (!experience.classList.contains("ready")) return;
  activePortal = portal;
  score.portalOpen(index);
  score.fadeMusic(1.0);
  $("#workspaceEyebrow").textContent = portal.icon + " " + portal.name.toUpperCase() + " PORTAL";
  $("#workspaceTitle").textContent = portal.name;
  $("#workspacePromise").textContent = portal.promise;
  renderPortalWorld(portal);
  $("#quickPrompts").innerHTML = "";
  $("#portalCapabilities").innerHTML = "<p>SPECIALIST TOOLS</p>" + portal.tools.map(function (tool, toolIndex) {
    return '<button type="button" data-tool="' + toolIndex + '">' + esc(tool) + '</button>';
  }).join("");
  $("#portalCapabilities").querySelectorAll("[data-tool]").forEach(function (toolButton) {
    toolButton.addEventListener("click", function () {
      const prompt = portal.prompts[Number(toolButton.dataset.tool)] || portal.prompts[0];
      $("#command").value = prompt;
      $("#command").focus();
    });
  });
  portal.prompts.forEach(function (prompt) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = prompt;
    button.addEventListener("click", function () {
      $("#command").value = prompt;
      $("#command").focus();
    });
    $("#quickPrompts").append(button);
  });
  $("#portalWorkspace").classList.add("open");
  $("#portalWorkspace").setAttribute("aria-hidden", "false");
  $("#results").hidden = true;
  addLog(portal.name + " portal opened", "Portal");
  if (!options || !options.walkthrough) setTimeout(function () { $("#command").focus(); }, 500);
}

function renderPortalWorld(portal) {
  const world = $("#portalWorld");
  world.dataset.portal = portal.name.toLowerCase();
  $("#worldKicker").textContent = portal.kicker;
  $("#worldTitle").textContent = portal.name === "Style" ? "Step inside your wardrobe" : portal.promise;
  $("#worldDescription").textContent = portal.description;
  $("#worldStatus").innerHTML = portal.status.map(function (item) {
    return '<div><span>' + esc(item[0]) + '</span><b>' + esc(item[1]) + '</b></div>';
  }).join("");
  $("#worldZones").innerHTML = portal.zones.map(function (zone, index) {
    return '<button type="button" data-zone="' + index + '"><span>0' + (index + 1) + '</span><b>' + esc(zone[0]) + '</b><small>' + esc(zone[1]) + '</small></button>';
  }).join("");
  $("#worldZones").querySelectorAll("[data-zone]").forEach(function (button) {
    button.addEventListener("click", function () {
      const zone = portal.zones[Number(button.dataset.zone)];
      $("#command").value = zone[1] + " in my " + portal.name + " portal";
      $("#command").focus();
      addLog(zone[0] + " activated", portal.name + " agent");
    });
  });
  const feature = $("#worldFeature");
  feature.hidden = false;
  feature.textContent = portal.feature + " →";
  feature.onclick = function () {
    $("#command").value = portal.prompts[0];
    $("#command").focus();
    addLog(portal.feature + " prepared", portal.name + " agent");
  };
  $("#guardianState").textContent = portal.name === "Wellbeing"
    ? "Coordinating permitted context—never diagnosing"
    : "Watching relevant signals—acting only by permission";
  renderSharedState(portal.name);
}

function renderSharedState(domain) {
  const shared = $("#sharedState");
  const state = hubState[domain.toLowerCase()];
  if (!state) {
    shared.hidden = true;
    shared.innerHTML = "";
    return;
  }
  shared.hidden = false;
  shared.innerHTML = '<p>SHARED LIVE STATE</p>' + Object.entries(state).map(function (entry) {
    return '<div><span>' + esc(entry[0].replace(/([A-Z])/g, " $1")) + '</span><b>' + esc(entry[1]) + '</b></div>';
  }).join("");
}

function clearWalkthroughClock() {
  if (walkthroughTimer) clearTimeout(walkthroughTimer);
  walkthroughTimer = null;
}

function stopWalkthroughVoice() {
  walkthroughRunId += 1;
  clearWalkthroughClock();
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

function renderWalkthroughPortals() {
  const list = $("#walkthroughPortals");
  list.innerHTML = walkthroughData.walkthrough.steps.map(function (step, index) {
    return '<li><button type="button" data-walkthrough-step="' + index + '"><span>0' + (index + 1) + '</span><b>' + esc(step.domain) + '</b></button></li>';
  }).join("");
  list.querySelectorAll("[data-walkthrough-step]").forEach(function (button) {
    button.addEventListener("click", function () {
      walkthroughPaused = true;
      $("#walkthroughPause").textContent = "Continue";
      $("#walkthroughPause").setAttribute("aria-pressed", "true");
      showWalkthroughStep(Number(button.dataset.walkthroughStep), false);
    });
  });
}

function updateWalkthroughTimeline(index, complete) {
  $("#walkthroughPortals").querySelectorAll("button").forEach(function (button, buttonIndex) {
    button.classList.toggle("current", !complete && buttonIndex === index);
    button.classList.toggle("complete", complete || buttonIndex < index);
    if (!complete && buttonIndex === index) button.setAttribute("aria-current", "step");
    else button.removeAttribute("aria-current");
  });
}

function queueWalkthroughAdvance(token, delay) {
  clearWalkthroughClock();
  walkthroughTimer = setTimeout(function () {
    if (token !== walkthroughRunId || walkthroughPaused) return;
    showWalkthroughStep(walkthroughIndex + 1, true);
  }, delay);
}

function narrateWalkthroughStep(step, token) {
  if (!soundOn || !("speechSynthesis" in window)) {
    queueWalkthroughAdvance(token, 11000);
    return;
  }
  const utterance = new SpeechSynthesisUtterance(step.narration + " " + step.guardian + " " + step.permission);
  utterance.lang = "en-CA";
  utterance.rate = 0.88;
  utterance.pitch = 0.86;
  const voices = window.speechSynthesis.getVoices();
  utterance.voice = voices.find(function (voice) { return /en-CA/i.test(voice.lang); })
    || voices.find(function (voice) { return /^en/i.test(voice.lang); })
    || null;
  utterance.onstart = function () {
    if (token === walkthroughRunId) setVoiceStatus("Guardian is narrating " + step.domain + "…", "speaking");
  };
  utterance.onend = function () {
    if (token !== walkthroughRunId || walkthroughPaused) return;
    setVoiceStatus("Moving to the next relevant portal…", "ready");
    queueWalkthroughAdvance(token, 1300);
  };
  utterance.onerror = function () {
    if (token === walkthroughRunId && !walkthroughPaused) queueWalkthroughAdvance(token, 9000);
  };
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  queueWalkthroughAdvance(token, 18000);
}

function narrateCinematicIntro() {
  if (!soundOn || !("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance("I am Guardian. One change can touch an entire life, so I do not wait for seven separate problems. I detect the context, awaken only the worlds that matter, and coordinate them under your permission. Watch the seven portals open around me.");
  utterance.lang = "en-CA";
  utterance.rate = 0.87;
  utterance.pitch = 0.86;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function narrateWalkthroughFinal() {
  if (!soundOn || !("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance("The full coordination is complete. One launch-day signal moved through seven relevant worlds. I advised and prepared the work, but publishing, messages, bookings and home-device changes remain paused for your approval. You stay in control.");
  utterance.lang = "en-CA";
  utterance.rate = 0.88;
  utterance.pitch = 0.86;
  utterance.onstart = function () { setVoiceStatus("Guardian is delivering the final briefing…", "speaking"); };
  utterance.onend = function () { setVoiceStatus("Full Guardian run complete. Approval decisions are ready below.", "ready"); };
  window.speechSynthesis.speak(utterance);
}

function showWalkthroughStep(index, autoAdvance) {
  if (!walkthroughData) return;
  if (index >= walkthroughData.walkthrough.steps.length) {
    finishWalkthrough();
    return;
  }
  const step = walkthroughData.walkthrough.steps[Math.max(0, index)];
  walkthroughIndex = Math.max(0, index);
  stopWalkthroughVoice();
  const token = walkthroughRunId;
  const portalIndex = portals.findIndex(function (portal) { return portal.name === step.domain; });
  openPortal(portals[portalIndex], portalIndex, {walkthrough:true});
  $("#walkthroughStage").hidden = false;
  $("#walkthroughStage").classList.remove("complete");
  $("#walkthroughTitle").textContent = walkthroughData.walkthrough.title;
  $("#walkthroughCount").textContent = (walkthroughIndex + 1) + " / " + walkthroughData.walkthrough.steps.length;
  $("#walkthroughProgressBar").style.width = (((walkthroughIndex + 1) / walkthroughData.walkthrough.steps.length) * 100) + "%";
  $("#walkthroughPhase").textContent = step.phase;
  $("#walkthroughDomain").textContent = step.domain.toUpperCase() + " AGENT";
  $("#walkthroughStepTitle").textContent = step.title;
  $("#walkthroughNarration").textContent = step.narration;
  $("#walkthroughSignal").textContent = step.signal;
  $("#walkthroughReceived").textContent = step.received;
  $("#walkthroughGuardian").textContent = step.guardian;
  $("#walkthroughPermission").textContent = step.permission;
  $("#guardianState").textContent = step.guardian;
  $("#walkthroughBack").disabled = walkthroughIndex === 0;
  $("#walkthroughNext").disabled = false;
  $("#walkthroughNext").textContent = walkthroughIndex === walkthroughData.walkthrough.steps.length - 1 ? "Show coordinated plan →" : "Next portal →";
  $("#walkthroughPause").disabled = false;
  updateWalkthroughTimeline(walkthroughIndex, false);
  addLog(step.domain + " agent: " + step.phase.toLowerCase() + " complete", "Full live run");
  $("#walkthroughStage").scrollIntoView({behavior:"smooth",block:"start"});
  if (autoAdvance && !walkthroughPaused) narrateWalkthroughStep(step, token);
  else setVoiceStatus("Walkthrough paused on " + step.domain + ".", "ready");
}

function finishWalkthrough() {
  if (!walkthroughData) return;
  stopWalkthroughVoice();
  walkthroughIndex = walkthroughData.walkthrough.steps.length;
  const stage = $("#walkthroughStage");
  stage.classList.add("complete");
  $("#walkthroughCount").textContent = "7 / 7 · COMPLETE";
  $("#walkthroughProgressBar").style.width = "100%";
  $("#walkthroughPhase").textContent = "COMPLETE";
  $("#walkthroughDomain").textContent = "GUARDIAN";
  $("#walkthroughStepTitle").textContent = "The whole launch day is coordinated";
  $("#walkthroughNarration").textContent = walkthroughData.walkthrough.summary;
  $("#walkthroughSignal").textContent = "One founder launch-day conflict";
  $("#walkthroughReceived").textContent = "Seven relevant portal agents · six necessary exchanges";
  $("#walkthroughGuardian").textContent = "Advice and preparations are complete. The user remains in control.";
  $("#walkthroughPermission").textContent = walkthroughData.plan.coordination.decision;
  $("#walkthroughNext").disabled = true;
  $("#walkthroughNext").textContent = "Run complete ✓";
  $("#walkthroughPause").disabled = true;
  updateWalkthroughTimeline(0, true);
  renderPlan(walkthroughData.plan, []);
  setVoiceStatus("Full Guardian run complete. Approval decisions are ready below.", "ready");
  addLog("Seven-portal live run completed; external actions remain permission-gated", "Guardian");
  narrateWalkthroughFinal();
}

async function startFullWalkthrough() {
  if (!experience.classList.contains("ready")) {
    pendingWalkthroughLaunch = true;
    awaken();
    narrateCinematicIntro();
    return;
  }
  const launchButtons = [$("#scenarioDemoButton"), $("#fullDemoButton")];
  launchButtons.forEach(function (button) { button.disabled = true; button.classList.add("running"); });
  setVoiceStatus("Guardian is loading the complete seven-portal run…", "thinking");
  try {
    const response = await fetch("/api/walkthrough", {method:"POST"});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Full walkthrough could not start");
    walkthroughData = data;
    walkthroughPaused = false;
    $("#walkthroughPause").textContent = "Pause";
    $("#walkthroughPause").setAttribute("aria-pressed", "false");
    saveHubState(data.statePatch || {});
    renderWalkthroughPortals();
    $("#results").hidden = true;
    showWalkthroughStep(0, true);
  } catch (error) {
    toast(error.message);
    setVoiceStatus("The full run could not start. Try again.", "error");
  } finally {
    launchButtons.forEach(function (button) { button.disabled = false; button.classList.remove("running"); });
  }
}

$("#scenarioDemoButton").addEventListener("click", startFullWalkthrough);
$("#fullDemoButton").addEventListener("click", startFullWalkthrough);
$("#walkthroughBack").addEventListener("click", function () {
  walkthroughPaused = true;
  $("#walkthroughPause").textContent = "Continue";
  $("#walkthroughPause").setAttribute("aria-pressed", "true");
  showWalkthroughStep(Math.max(0, walkthroughIndex - 1), false);
});
$("#walkthroughNext").addEventListener("click", function () {
  walkthroughPaused = true;
  $("#walkthroughPause").textContent = "Continue";
  $("#walkthroughPause").setAttribute("aria-pressed", "true");
  showWalkthroughStep(walkthroughIndex + 1, false);
});
$("#walkthroughPause").addEventListener("click", function () {
  walkthroughPaused = !walkthroughPaused;
  this.textContent = walkthroughPaused ? "Continue" : "Pause";
  this.setAttribute("aria-pressed", String(walkthroughPaused));
  if (walkthroughPaused) stopWalkthroughVoice();
  else showWalkthroughStep(Math.min(walkthroughIndex, walkthroughData.walkthrough.steps.length - 1), true);
});
$("#walkthroughRestart").addEventListener("click", function () {
  walkthroughPaused = false;
  $("#walkthroughPause").textContent = "Pause";
  $("#walkthroughPause").setAttribute("aria-pressed", "false");
  showWalkthroughStep(0, true);
});

$("#workspaceClose").addEventListener("click", function () {
  if (walkthroughData && walkthroughIndex >= 0 && walkthroughIndex < walkthroughData.walkthrough.steps.length) {
    walkthroughPaused = true;
    $("#walkthroughPause").textContent = "Continue";
    $("#walkthroughPause").setAttribute("aria-pressed", "true");
    stopWalkthroughVoice();
  }
  $("#portalWorkspace").classList.remove("open");
  $("#portalWorkspace").setAttribute("aria-hidden", "true");
});

$("#commandForm").addEventListener("submit", async function (event) {
  event.preventDefault();
  const input = $("#command").value.trim();
  if (!input) return;
  const submit = event.submitter || $("#commandForm button[type=submit]");
  setVoiceStatus("StaarWardd is listening across your portals…", "thinking");
  submit.disabled = true;
  submit.firstChild.textContent = "Syncing ";
  try {
    const response = await fetch("/api/plan", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({input:activePortal.name + " context: " + input})
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not create plan");
    renderPlan(data.plan, data.sources || []);
    speakPlan(data.plan, data.mode, (data.sources || []).length);
    addLog("Plan created across " + data.plan.domains.join(", "), data.mode);
    if (data.warning) toast("AI unavailable — deterministic demo used safely.");
  } catch (error) {
    toast(error.message);
  } finally {
    submit.disabled = false;
    submit.firstChild.textContent = "Sync ";
  }
});

function renderPlan(plan, sources) {
  $("#resultSummary").textContent = plan.summary;
  $("#activeDomains").innerHTML = plan.domains.map(function (domain) { return "<span>" + esc(domain) + "</span>"; }).join("");
  renderCoordination(plan.coordination, plan.domains);
  renderTasks("#nowTasks", plan.now);
  renderTasks("#todayTasks", plan.today);
  renderTasks("#weekTasks", plan.week);
  renderSources(sources || []);
  $("#results").hidden = false;
  $("#results").scrollIntoView({behavior:"smooth",block:"nearest"});
}

function renderCoordination(coordination, domains) {
  const trace = coordination || {
    detected:"Context detected from the current request.",
    agents:domains,
    exchanges:[],
    decision:"Advice prepared; permission is required before external action."
  };
  portalElements.forEach(function (element) {
    element.classList.toggle("coordinated", trace.agents.includes(element.dataset.domain));
  });
  $("#coordinationDecision").textContent = trace.decision;
  $("#coordinationAgents").innerHTML = '<div class="detected-signal"><span>DETECTED</span><b>' + esc(trace.detected) + '</b></div>' + trace.agents.map(function (agent) {
    return '<div class="agent-chip"><span>ACTIVE</span><b>' + esc(agent) + ' agent</b></div>';
  }).join("");
  $("#coordinationExchanges").innerHTML = trace.exchanges.length ? trace.exchanges.map(function (exchange) {
    return '<li><b>' + esc(exchange.from) + '</b><span>→ ' + esc(exchange.signal) + ' →</span><b>' + esc(exchange.to) + '</b></li>';
  }).join("") : '<li class="no-exchange"><b>' + esc(trace.agents[0] || "Guardian") + '</b><span>No unrelated portal was activated.</span></li>';
}

function renderSources(sources) {
  const list = $("#sourceList");
  const links = $("#sourceLinks");
  links.innerHTML = "";
  if (!sources.length) {
    list.hidden = true;
    return;
  }
  sources.forEach(function (source, index) {
    const anchor = document.createElement("a");
    anchor.href = source.url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.textContent = (index + 1) + ". " + source.title;
    links.append(anchor);
  });
  list.hidden = false;
}
function renderTasks(target, tasks) {
  $(target).innerHTML = tasks.map(function (task) {
    return '<div class="task ' + (task.sensitive ? "sensitive" : "") + '">' +
      '<div class="task-meta"><b>' + esc(task.domain) + "</b><span>" + esc(task.time) + "</span></div>" +
      "<h4>" + esc(task.title) + "</h4><p>" + esc(task.detail) + "</p>" +
      '<button data-task="' + encodeURIComponent(JSON.stringify(task)) + '">' +
      (task.sensitive ? "◉ Approval required" : esc(task.action) + " →") + "</button></div>";
  }).join("");
  $(target).querySelectorAll("[data-task]").forEach(function (button) {
    button.addEventListener("click", function () {
      handleTask(JSON.parse(decodeURIComponent(button.dataset.task)), button);
    });
  });
}

function handleTask(task, button) {
  if (task.sensitive) {
    pending = {task:task,button:button};
    $("#approvalText").textContent = "“" + task.title + "” may involve communication, scheduling, purchasing, sharing, or changing external information.";
    $("#approvalDialog").showModal();
  } else {
    button.disabled = true;
    button.textContent = "✓ Added to rhythm";
    completionTone();
    addLog(task.title + " marked ready", task.domain);
  }
}

$("#approvalDialog").addEventListener("close", function () {
  if (!pending) return;
  if ($("#approvalDialog").returnValue === "approve") {
    pending.button.disabled = true;
    pending.button.textContent = "✓ Simulation approved";
    completionTone();
    addLog(pending.task.title + " explicitly approved — simulation only", pending.task.domain);
  } else {
    addLog(pending.task.title + " was not approved", pending.task.domain);
  }
  pending = null;
});

function addLog(message, type) {
  log.unshift({message:message,type:type,time:new Date().toISOString()});
  log = log.slice(0, 60);
  localStorage.setItem("staarwardd-log", JSON.stringify(log));
  drawLog();
}

function drawLog() {
  $("#logCount").textContent = log.length;
  $("#logList").innerHTML = log.length ? log.map(function (item) {
    return "<li><b>" + esc(item.message) + "</b><time>" + esc(item.type) + " · " + new Date(item.time).toLocaleString() + "</time></li>";
  }).join("") : "<li>No actions yet. Every decision will appear here.</li>";
}

function toggleLog(open) {
  $("#actionLog").classList.toggle("open", open);
  $("#actionLog").setAttribute("aria-hidden", String(!open));
  $("#logToggle").setAttribute("aria-expanded", String(open));
}

$("#logToggle").addEventListener("click", function () { toggleLog(true); });
$("#logClose").addEventListener("click", function () { toggleLog(false); });
$("#clearLog").addEventListener("click", function () {
  log = [];
  localStorage.removeItem("staarwardd-log");
  localStorage.removeItem("starward-log");
  localStorage.removeItem("blessync-log");
  drawLog();
});
drawLog();

let soundOn = true;
$("#soundToggle").addEventListener("click", function () {
  soundOn = !soundOn;
  $("#soundToggle").setAttribute("aria-pressed", String(soundOn));
  $("#soundToggle b").textContent = soundOn ? "On" : "Off";
  if (guardianFlightVideo) guardianFlightVideo.muted = true;
  if (!soundOn) {
    score.stop(0.15);
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }
  else if (experience.classList.contains("ready")) score.startAmbient();
});

let motionOn = true;
function setMotion() {
  experience.classList.toggle("motion-off", !motionOn);
  $("#motionToggle").setAttribute("aria-pressed", String(motionOn));
  $("#motionToggle b").textContent = motionOn ? "On" : "Off";
  if (guardianFlightVideo) {
    if (!motionOn) guardianFlightVideo.pause();
    else if (experience.classList.contains("awakening")) guardianFlightVideo.play().catch(function () {});
  }
}
setMotion();
$("#motionToggle").addEventListener("click", function () {
  motionOn = !motionOn;
  setMotion();
});

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const talkButton = $("#talkButton");
let recognition = null;
let listening = false;
let finalTranscript = "";

function setVoiceStatus(message, state) {
  const status = $("#voiceStatus");
  if (!status) return;
  status.className = "voice-status" + (state ? " " + state : "");
  status.innerHTML = '<span aria-hidden="true">◉</span> ' + esc(message);
}

function setListening(active) {
  listening = active;
  talkButton.classList.toggle("listening", active);
  talkButton.setAttribute("aria-pressed", String(active));
  talkButton.innerHTML = active
    ? '<span aria-hidden="true">●</span> Listening'
    : '<span aria-hidden="true">●</span> Talk';
}

function startListening() {
  if (!SpeechRecognition) {
    setVoiceStatus("Voice recognition is unavailable here. Type your request or open StaarWardd in Edge or Chrome.", "error");
    toast("Voice recognition needs Edge or Chrome.");
    return;
  }
  if (!experience.classList.contains("ready")) {
    toast("Begin the awakening first, then press Talk.");
    return;
  }
  if (!$("#portalWorkspace").classList.contains("open")) {
    openPortal(activePortal, Math.max(0, portals.indexOf(activePortal)));
    setTimeout(startListening, 650);
    return;
  }
  if (listening) {
    recognition.stop();
    return;
  }
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  finalTranscript = "";
  recognition = new SpeechRecognition();
  recognition.lang = navigator.language || "en-CA";
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.onstart = function () {
    setListening(true);
    setVoiceStatus("Listening… Tell StaarWardd everything on your mind.", "listening");
  };
  recognition.onresult = function (event) {
    let interim = "";
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const words = event.results[index][0].transcript;
      if (event.results[index].isFinal) finalTranscript += words + " ";
      else interim += words;
    }
    const transcript = (finalTranscript + interim).trim();
    $("#command").value = transcript;
    setVoiceStatus(interim ? "Hearing: “" + transcript + "”" : "Understood: “" + transcript + "”", interim ? "listening" : "ready");
  };
  recognition.onerror = function (event) {
    const messages = {
      "not-allowed":"Microphone permission was denied. Allow microphone access in the browser, then try again.",
      "no-speech":"I did not hear anything. Press Talk and try again.",
      "audio-capture":"No microphone was found.",
      "network":"The browser speech service could not connect. You can still type your request."
    };
    setVoiceStatus(messages[event.error] || "Voice could not start. You can still type your request.", "error");
  };
  recognition.onend = function () {
    setListening(false);
    const transcript = $("#command").value.trim();
    if (finalTranscript.trim() && transcript) {
      setVoiceStatus("Got it. Building your coordinated plan…", "thinking");
      $("#commandForm").requestSubmit();
    } else if (!transcript) {
      setVoiceStatus("Ready. Press Talk and speak naturally.", "ready");
    }
  };
  try { recognition.start(); }
  catch { setListening(false); }
}

function speakPlan(plan, mode, sourceCount) {
  if (!soundOn || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const firstNow = plan.now && plan.now[0] ? "First: " + plan.now[0].title + ". " + plan.now[0].detail : "";
  const safety = plan.sensitive ? " I found a sensitive action and paused it for your approval." : "";
  const evidence = sourceCount ? " I checked live sources; the links are shown with your plan." : "";
  const introduction = mode === "openai" ? "Your GPT-5.6 plan is ready. " : mode === "scenario" ? "Guardian coordination complete. " : "Your deterministic demo plan is ready. ";
  const utterance = new SpeechSynthesisUtterance(introduction + plan.summary + ". " + firstNow + safety + evidence);
  utterance.lang = "en-CA";
  utterance.rate = 0.95;
  utterance.pitch = 0.88;
  const voices = window.speechSynthesis.getVoices();
  utterance.voice = voices.find(function (voice) { return /en-CA/i.test(voice.lang); })
    || voices.find(function (voice) { return /^en/i.test(voice.lang); })
    || null;
  utterance.onstart = function () { setVoiceStatus("StaarWardd is speaking…", "speaking"); };
  utterance.onend = function () { setVoiceStatus("Ready. Press Talk to continue.", "ready"); };
  window.speechSynthesis.speak(utterance);
}

if (!SpeechRecognition) {
  talkButton.title = "Voice recognition requires Edge or Chrome";
  talkButton.classList.add("unsupported");
}
talkButton.addEventListener("click", startListening);
class CinematicAudio {
  constructor() {
    this.context = null;
    this.master = null;
    this.compressor = null;
    this.bed = null;
    this.cues = null;
    this.noiseBuffer = null;
    this.sources = new Set();
    this.ambientSources = new Set();
    this.lastHover = 0;
  }

  ensure() {
    if (this.context && this.context.state !== "closed") return this.context;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    try { this.context = new AudioContextClass({latencyHint:"interactive"}); }
    catch (error) { this.context = new AudioContextClass(); }

    this.compressor = this.context.createDynamicsCompressor();
    this.compressor.threshold.value = -16;
    this.compressor.knee.value = 12;
    this.compressor.ratio.value = 6;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.2;

    this.master = this.context.createGain();
    this.master.gain.value = 0.0001;
    this.bed = this.context.createGain();
    this.bed.gain.value = 1;
    this.cues = this.context.createGain();
    this.cues.gain.value = 1;
    this.bed.connect(this.master);
    this.cues.connect(this.master);
    this.master.connect(this.compressor);
    this.compressor.connect(this.context.destination);
    return this.context;
  }

  resume() {
    const context = this.ensure();
    if (context && context.state === "suspended") context.resume().catch(function () {});
    return context;
  }

  track(source, ambient) {
    const self = this;
    this.sources.add(source);
    if (ambient) this.ambientSources.add(source);
    source.addEventListener("ended", function () {
      self.sources.delete(source);
      self.ambientSources.delete(source);
    }, {once:true});
    return source;
  }

  bus(name) {
    return name === "bed" ? this.bed : this.cues;
  }

  makeNoiseBuffer() {
    const context = this.ensure();
    if (!context) return null;
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === context.sampleRate) return this.noiseBuffer;
    const length = context.sampleRate * 2;
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const channel = buffer.getChannelData(0);
    let previous = 0;
    for (let index = 0; index < length; index += 1) {
      const white = (Math.random() * 2) - 1;
      previous = (previous * 0.72) + (white * 0.28);
      channel[index] = previous * 0.82;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  prepare(level) {
    const context = this.resume();
    if (!context) return null;
    const now = context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(0.0001, now);
    this.master.gain.linearRampToValueAtTime(level || 0.56, now + 0.08);
    this.bed.gain.cancelScheduledValues(now);
    this.bed.gain.setValueAtTime(1, now);
    this.cues.gain.cancelScheduledValues(now);
    this.cues.gain.setValueAtTime(1, now);
    return now + 0.04;
  }

  tone(frequency, start, duration, volume, options) {
    const context = this.ensure();
    if (!context) return null;
    const settings = options || {};
    const when = Math.max(context.currentTime + 0.005, start);
    const length = Math.max(0.06, duration);
    const end = when + length;
    const attack = Math.min(length * 0.45, Math.max(0.004, settings.attack || 0.018));
    const release = Math.min(length * 0.72, Math.max(0.03, settings.release || (length * 0.58)));
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();

    oscillator.type = settings.type || "sine";
    oscillator.frequency.setValueAtTime(Math.max(24, frequency), when);
    if (settings.endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(24, settings.endFrequency), end);
    }
    if (settings.detune) oscillator.detune.setValueAtTime(settings.detune, when);

    filter.type = settings.filterType || "lowpass";
    filter.Q.value = settings.filterQ === undefined ? 0.8 : settings.filterQ;
    filter.frequency.setValueAtTime(settings.filterFrequency || 5200, when);
    if (settings.endFilterFrequency) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(40, settings.endFilterFrequency), end);
    }

    const peak = Math.max(0.0001, volume);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(peak, when + attack);
    gain.gain.setValueAtTime(peak, Math.max(when + attack, end - release));
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(this.bus(settings.bus));
    oscillator.start(when);
    oscillator.stop(end + 0.03);
    return this.track(oscillator, Boolean(settings.ambient));
  }

  noise(start, duration, volume, options) {
    const context = this.ensure();
    const buffer = this.makeNoiseBuffer();
    if (!context || !buffer) return null;
    const settings = options || {};
    const when = Math.max(context.currentTime + 0.005, start);
    const length = Math.max(0.06, duration);
    const end = when + length;
    const attack = Math.min(length * 0.82, Math.max(0.004, settings.attack || 0.012));
    const release = Math.min(length * 0.74, Math.max(0.025, settings.release || (length * 0.52)));
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();

    source.buffer = buffer;
    source.loop = length > buffer.duration - 0.05;
    filter.type = settings.filterType || "bandpass";
    filter.Q.value = settings.filterQ === undefined ? 0.7 : settings.filterQ;
    filter.frequency.setValueAtTime(settings.filterFrequency || 720, when);
    if (settings.endFilterFrequency) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(40, settings.endFilterFrequency), end);
    }

    const peak = Math.max(0.0001, volume);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(peak, when + attack);
    gain.gain.setValueAtTime(peak, Math.max(when + attack, end - release));
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.bus(settings.bus));
    source.start(when, 0);
    source.stop(end + 0.02);
    return this.track(source, Boolean(settings.ambient));
  }

  chord(frequencies, start, duration, volume, options) {
    const settings = options || {};
    const count = Math.max(1, frequencies.length);
    frequencies.forEach(function (frequency, index) {
      this.tone(frequency, start, duration, volume / count, Object.assign({}, settings, {
        detune:(settings.detune || 0) + ((index - ((count - 1) / 2)) * 3)
      }));
    }, this);
  }

  impact(start, level) {
    const strength = level === undefined ? 1 : level;
    this.tone(132, start, 0.92, 0.2 * strength, {type:"sine",endFrequency:38,attack:0.004,release:0.78,filterFrequency:420});
    this.noise(start, 0.48, 0.09 * strength, {filterType:"lowpass",filterFrequency:1350,endFilterFrequency:170,attack:0.004,release:0.42});
    this.chord([73.42,110,146.83], start + 0.025, 1.28, 0.1 * strength, {type:"sawtooth",filterFrequency:430,endFilterFrequency:230,attack:0.024,release:1.05});
  }

  drum(start, level, high) {
    const strength = level === undefined ? 1 : level;
    this.tone(high ? 108 : 82, start, 0.3, 0.11 * strength, {type:"sine",endFrequency:high ? 58 : 42,attack:0.004,release:0.25,filterFrequency:310});
    this.noise(start, 0.12, 0.035 * strength, {filterType:"highpass",filterFrequency:high ? 1900 : 820,attack:0.003,release:0.1});
  }

  shimmer(start, level) {
    const strength = level === undefined ? 1 : level;
    [740,1110,1480].forEach(function (frequency, index) {
      this.tone(frequency, start + (index * 0.07), 0.34, 0.026 * strength, {type:"sine",attack:0.008,release:0.29,filterFrequency:3600});
    }, this);
  }

  earcon(index, start, level) {
    const strength = level === undefined ? 1 : level;
    switch (index % 7) {
      case 0:
        this.shimmer(start, 0.95 * strength);
        this.noise(start, 0.22, 0.018 * strength, {filterType:"highpass",filterFrequency:2400,attack:0.008,release:0.18});
        break;
      case 1:
        this.tone(110, start, 0.34, 0.09 * strength, {type:"sawtooth",endFrequency:82,filterFrequency:520,attack:0.009,release:0.28});
        this.tone(165, start + 0.1, 0.24, 0.05 * strength, {type:"triangle",filterFrequency:740,attack:0.008,release:0.19});
        break;
      case 2:
        this.chord([196,246.94], start, 0.52, 0.09 * strength, {type:"triangle",filterFrequency:1200,attack:0.028,release:0.43});
        this.tone(392, start + 0.15, 0.31, 0.025 * strength, {type:"sine",filterFrequency:1800,attack:0.02,release:0.25});
        break;
      case 3:
        this.noise(start, 0.55, 0.038 * strength, {filterType:"bandpass",filterFrequency:620,endFilterFrequency:1760,filterQ:0.55,attack:0.22,release:0.28});
        this.tone(392, start + 0.06, 0.48, 0.038 * strength, {type:"sine",endFrequency:440,filterFrequency:1600,attack:0.14,release:0.28});
        break;
      case 4:
        this.tone(293.66, start, 0.28, 0.055 * strength, {type:"triangle",filterFrequency:1500,attack:0.016,release:0.22});
        this.tone(440, start + 0.22, 0.32, 0.05 * strength, {type:"sine",filterFrequency:1900,attack:0.016,release:0.26});
        break;
      case 5:
        [261.63,329.63,392].forEach(function (frequency, toneIndex) {
          this.tone(frequency, start + (toneIndex * 0.085), 0.38, 0.045 * strength, {type:"triangle",filterFrequency:1700,attack:0.016,release:0.31});
        }, this);
        break;
      default:
        [440,554.37,659.25].forEach(function (frequency, toneIndex) {
          this.tone(frequency, start + (toneIndex * 0.075), 0.24, 0.04 * strength, {type:"sine",filterFrequency:2600,attack:0.007,release:0.19});
        }, this);
        this.noise(start + 0.16, 0.18, 0.014 * strength, {filterType:"highpass",filterFrequency:3100,attack:0.008,release:0.14});
    }
  }

  begin(portalStart, portalGap, count) {
    if (!soundOn) return;
    this.stop(0);
    const start = this.prepare(0.56);
    if (start === null) return;

    this.impact(start, 1);
    this.noise(start + 0.08, 1.55, 0.048, {filterType:"bandpass",filterFrequency:210,endFilterFrequency:2200,filterQ:0.45,attack:1.12,release:0.36});
    this.chord([73.42,110,146.83,220], start + 0.12, 2.2, 0.11, {type:"sawtooth",filterFrequency:520,endFilterFrequency:980,attack:0.42,release:1.2,bus:"bed"});
    this.shimmer(start + 0.32, 0.65);

    const bedDuration = portalStart + (portalGap * Math.max(0, count - 1)) + 4.2;
    this.chord([73.42,110,146.83,220], start + 1.7, bedDuration, 0.07, {type:"triangle",filterFrequency:720,attack:1.1,release:2.2,bus:"bed"});
    for (let beat = 2.15, pulse = 0; beat < portalStart - 0.08; beat += 0.625, pulse += 1) {
      this.drum(start + beat, pulse % 4 === 0 ? 0.82 : 0.52, pulse % 2 === 1);
      if (pulse % 2 === 0) this.tone(pulse % 4 === 0 ? 73.42 : 110, start + beat, 0.42, 0.032, {type:"sawtooth",filterFrequency:390,attack:0.012,release:0.34,bus:"bed"});
    }

    const context = this.context;
    this.bed.gain.setValueAtTime(1, start);
    this.bed.gain.linearRampToValueAtTime(0.68, start + portalStart);
    for (let index = 0; index < count; index += 1) {
      this.earcon(index, start + portalStart + (index * portalGap), 1);
    }
  }

  shield() {
    if (!soundOn) return;
    const context = this.resume();
    if (!context) return;
    const start = context.currentTime + 0.025;
    this.bed.gain.cancelScheduledValues(start);
    this.bed.gain.setValueAtTime(Math.max(0.34, this.bed.gain.value), start);
    this.bed.gain.linearRampToValueAtTime(0.22, start + 4.1);

    this.noise(start, 3.1, 0.065, {filterType:"bandpass",filterFrequency:180,endFilterFrequency:4200,filterQ:0.5,attack:2.55,release:0.45});
    this.chord([73.42,110,146.83], start + 0.08, 3.3, 0.085, {type:"sawtooth",filterFrequency:360,endFilterFrequency:980,attack:1.8,release:1.05,bus:"bed"});
    this.drum(start + 0.02, 0.76, false);
    this.drum(start + 1.05, 0.9, false);
    this.drum(start + 2.05, 1.04, false);
    this.drum(start + 2.72, 1.14, true);
    this.impact(start + 3.42, 1.18);
    this.shimmer(start + 3.5, 0.92);
    this.chord([146.83,220,293.66], start + 3.48, 2.2, 0.075, {type:"triangle",filterFrequency:1200,attack:0.34,release:1.55,bus:"bed"});
  }

  startAmbient() {
    if (!soundOn || this.ambientSources.size) return;
    const context = this.resume();
    if (!context) return;
    const start = context.currentTime + 0.025;
    const currentMaster = Math.max(0.0001, this.master.gain.value);
    this.master.gain.cancelScheduledValues(start);
    this.master.gain.setValueAtTime(currentMaster, start);
    this.master.gain.linearRampToValueAtTime(0.46, start + 0.7);
    this.bed.gain.cancelScheduledValues(start);
    this.bed.gain.setValueAtTime(Math.max(0.0001, this.bed.gain.value), start);
    this.bed.gain.linearRampToValueAtTime(0.24, start + 2.2);

    [146.83,220,293.66].forEach(function (frequency, index) {
      this.tone(frequency, start + (index * 0.06), 90, index === 0 ? 0.06 : 0.04, {
        type:index === 1 ? "triangle" : "sine",filterFrequency:900,attack:2.4,release:4.5,bus:"bed",ambient:true,detune:(index - 1) * 4
      });
    }, this);
  }

  settleMusic(target, seconds) {
    if (!this.context || !this.bed) return;
    const now = this.context.currentTime;
    const duration = Math.max(0.08, seconds || 1);
    this.bed.gain.cancelScheduledValues(now);
    this.bed.gain.setValueAtTime(Math.max(0.0001, this.bed.gain.value), now);
    this.bed.gain.linearRampToValueAtTime(Math.max(0.0001, target), now + duration);
  }

  hover(index) {
    if (!soundOn) return;
    const now = performance.now();
    if (now - this.lastHover < 850) return;
    this.lastHover = now;
    const context = this.resume();
    if (context) this.earcon(index, context.currentTime + 0.01, 0.16);
  }

  portalOpen(index) {
    if (!soundOn) return;
    const context = this.resume();
    if (context) this.earcon(index, context.currentTime + 0.01, 0.92);
  }

  complete() {
    if (!soundOn) return;
    const context = this.resume();
    if (!context) return;
    const start = context.currentTime + 0.01;
    this.tone(392, start, 0.28, 0.052, {type:"triangle",filterFrequency:1600,attack:0.012,release:0.22});
    this.tone(587.33, start + 0.12, 0.38, 0.047, {type:"sine",filterFrequency:2200,attack:0.014,release:0.31});
  }

  fadeMusic(seconds) {
    if (!this.context || !this.bed) return;
    const now = this.context.currentTime;
    const duration = Math.max(0.08, seconds || 1);
    this.bed.gain.cancelScheduledValues(now);
    this.bed.gain.setValueAtTime(Math.max(0.0001, this.bed.gain.value), now);
    this.bed.gain.linearRampToValueAtTime(0.0001, now + duration);
    this.ambientSources.forEach(function (source) {
      try { source.stop(now + duration + 0.04); } catch (error) { }
    });
    this.ambientSources.clear();
  }

  stop(seconds) {
    if (!this.context || this.context.state === "closed") return;
    const now = this.context.currentTime;
    const duration = Math.max(0, seconds || 0);
    const stopAt = now + Math.min(0.18, duration);
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(Math.max(0.0001, this.master.gain.value), now);
    if (duration) this.master.gain.linearRampToValueAtTime(0.0001, stopAt);
    else this.master.gain.setValueAtTime(0.0001, now);
    this.sources.forEach(function (source) {
      try { source.stop(stopAt + 0.01); } catch (error) { }
    });
    this.sources.clear();
    this.ambientSources.clear();
    this.bed.gain.cancelScheduledValues(stopAt + 0.02);
    this.cues.gain.cancelScheduledValues(stopAt + 0.02);
  }
}
const score = new CinematicAudio();

function completionTone() {
  score.complete();
}

function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(function () { element.classList.remove("show"); }, 2600);
}

function esc(value) {
  const div = document.createElement("div");
  div.textContent = String(value);
  return div.innerHTML;
}
