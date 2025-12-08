// @ts-check

/**
 * @param {unknown} message
 */
browser.runtime.onMessage.addListener((message) => {
  console.log("Persona Builder stub content script received message", message);
});
