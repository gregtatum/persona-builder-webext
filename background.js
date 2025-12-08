browser.runtime.onInstalled.addListener(() => {
  console.log("Persona Builder stub installed");
});

browser.runtime.onMessage.addListener((message) => {
  console.log("Persona Builder stub received message", message);
});
