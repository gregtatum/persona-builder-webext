// @ts-check
import { log } from "./utils.mjs";

/** @type {Promise<any> | null} */
let singleFilePromise = null;

async function getSingleFile() {
  if (!singleFilePromise) {
    const url = browser.runtime.getURL("vendor/singlefile/single-file.js");
    log("!!! url", url);
    singleFilePromise = import(url);
  }
  return singleFilePromise;
}

/**
 * @param {unknown} message
 * @param {browser.runtime.MessageSender} _sender
 * @param {(response?: any) => void} sendResponse
 */
browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (
    message &&
    typeof message === "object" &&
    message.type === "capture-singlefile"
  ) {
    (async () => {
      try {
        const singlefile = await getSingleFile();
        log("!!!", window.SingleFile);
        log("!!!", singlefile);
        const pageData = await singlefile.getPageData({
          compressContent: false,
        });
        log("SingleFile snapshot captured");
        sendResponse({ ok: true, content: pageData.content || "" });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error("SingleFile capture failed", error);
        sendResponse({ ok: false, error: errorMessage });
      }
    })();
    return true;
  }
  log("Persona Builder stub content script received message", message);
});
