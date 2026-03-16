const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const distPath = path.join(__dirname, 'client/dist');
const htmlPath = path.join(distPath, 'index.html');
const jsDir = path.join(distPath, 'assets');

// Find the JS bundle
const files = fs.readdirSync(jsDir);
const jsFile = files.find(f => f.endsWith('.js'));
const jsCode = fs.readFileSync(path.join(jsDir, jsFile), 'utf8');

// The React production bundle might throw if window or DOM is missing, 
// so we execute it inside a JSDOM environment to see the exact React Error boundary.

const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body><div id="root"></div></body></html>`, {
    url: "http://localhost/",
    runScripts: "dangerously", // Run scripts
    virtualConsole: new (require('jsdom').VirtualConsole)()
});

// Capture all console errors and uncaught exceptions
dom.virtualConsole.on("error", (err) => {
    console.error("JSDOM Console Error:", err);
});
dom.virtualConsole.on("jsdomError", (err) => {
    console.error("JSDOM Internal Error:", err.message, err.detail);
});

try {
    // We eval the code inside the JSDOM window context
    dom.window.eval(jsCode);
    console.log("Script executed successfully without immediate throw.");
} catch (e) {
    console.error("Uncaught Execution Error:", e);
}
