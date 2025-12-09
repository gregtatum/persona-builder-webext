// @ts-check
import { getActivePersonaId, watchActivePersona } from "./active-persona.mjs";
import { log } from "./utils.mjs";

/** @type {string | undefined} */
let activePersonaId = undefined;

async function initActivePersona() {
  activePersonaId = await getActivePersonaId();
  log("Active persona initialized", activePersonaId);
  watchActivePersona((id) => {
    activePersonaId = typeof id === "string" ? id : undefined;
    log("Active persona changed", activePersonaId);
  });
}

void initActivePersona();

browser.runtime.onInstalled.addListener(() => {
  log("Persona Builder stub installed");
});

/**
 * @param {unknown} message
 */
browser.runtime.onMessage.addListener((message) => {
  log("Persona Builder stub received message", message);
});

browser.commands.onCommand.addListener((command) => {
  if (command === "example-log-command") {
    console.log("it works");
    log("example-log-command fired");
  }
});
