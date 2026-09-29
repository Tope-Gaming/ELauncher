// =========================================================
// WebLauncher Test Mod
// Confirms: script loaded, ModAPI available, chat works,
//           key listener attaches, block access works.
// Safe: does nothing destructive. Remove after testing.
// =========================================================

(function () {
    const TAG = "[WebLauncher Test]";

    // ---- Console breadcrumbs (visible in DevTools) ----
    console.log(TAG, "script evaluated");
    console.log(TAG, "typeof ModAPI =", typeof ModAPI);

    if (typeof ModAPI === "undefined") {
        console.error(TAG, "ModAPI is undefined — EaglerForge not ready or injection failed");
        return;
    }

    // ---- Report API surface ----
    const api = {
        require:        typeof ModAPI.require,
        addEventListener: typeof ModAPI.addEventListener,
        displayToChat:  typeof ModAPI.displayToChat,
        blocks:         typeof ModAPI.blocks,
        reloadchunks:   typeof ModAPI.reloadchunks
    };
    console.log(TAG, "API surface:", api);

    // ---- Report full initialization ----
    if (typeof ModAPI.require !== "function") {
        console.warn(TAG, "ModAPI.require missing — EaglerForge still booting?");
        return;
    }

    // ---- Load the player module ----
    try {
        ModAPI.require("player");
        console.log(TAG, "player module loaded:", typeof ModAPI.player);
    } catch (e) {
        console.error(TAG, "Failed to require player module:", e);
        return;
    }

    // ---- Chat confirmation ----
    // This is the primary success signal: if you see this
    // in-game, injection worked end-to-end.
    function chat(msg) {
        try {
            if (typeof ModAPI.displayToChat === "function") {
                ModAPI.displayToChat({ msg: msg });
            } else if (ModAPI.player && typeof ModAPI.player.sendChatMessage === "function") {
                ModAPI.player.sendChatMessage({ message: msg });
            }
        } catch (e) {
            console.warn(TAG, "chat failed:", e);
        }
    }

    chat(TAG + " loaded OK");

    // ---- Key listener test ----
    // Press G in-game and you should see two chat messages.
    // If nothing happens, the key listener didn't attach.
    try {
        ModAPI.addEventListener("key", function (ev) {
            if (ev.key === 71) {   // G key
                chat(TAG + " G pressed — listener working");
                console.log(TAG, "key event:", ev);

                // Bonus: dump a couple of block names if available
                if (ModAPI.blocks) {
                    const names = Object.keys(ModAPI.blocks).slice(0, 5);
                    console.log(TAG, "sample blocks:", names);
                    chat(TAG + " sample blocks: " + names.join(", "));
                }
            }
        });
        console.log(TAG, "key listener attached (press G in-game)");
    } catch (e) {
        console.error(TAG, "Failed to attach key listener:", e);
    }

    // ---- Done ----
    console.log(TAG, "initialization complete");
})();