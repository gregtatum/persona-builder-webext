// @ts-check

browser.runtime.onInstalled.addListener(() => {
  console.log("Persona Builder stub installed");
});

/**
 * @param {unknown} message
 */
browser.runtime.onMessage.addListener((message) => {
  console.log("Persona Builder stub received message", message);
});
