const injectScript = chrome.runtime.getURL('download.js');
const scriptElement = document.createElement('script');
scriptElement.src = injectScript;
document.body.appendChild(scriptElement);
