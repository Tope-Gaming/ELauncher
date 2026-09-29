// ============================================
// SUPER HACKS MOD for Eaglercraft 1.8.8
// Fixed: Uses direct property assignment
// ============================================

ModAPI.require("player");
ModAPI.require("world");

let flyEnabled = false;
let speedEnabled = false;
let stepEnabled = false;
let jetpackEnabled = false;

// ============================================
// MAIN UPDATE LOOP (Runs every game tick)
// ============================================
function updateHacks() {
    if (!ModAPI.player) return;

    // 1. FLY HACK
    if (flyEnabled) {
        try {
            ModAPI.player.capabilities.allowFlying = true;
            ModAPI.player.capabilities.isFlying = true;
            ModAPI.player.fallDistance = 0;
        } catch(e) {}
    } else {
        try {
            if (!ModAPI.player.capabilities.isCreativeMode) {
                ModAPI.player.capabilities.allowFlying = false;
                ModAPI.player.capabilities.isFlying = false;
            }
        } catch(e) {}
    }

    // 2. SPEED HACK (Direct walkSpeed assignment)
    if (speedEnabled) {
        try { ModAPI.player.capabilities.walkSpeed = 0.5; } catch(e) {}
    } else {
        try { ModAPI.player.capabilities.walkSpeed = 0.1; } catch(e) {}
    }

    // 3. STEP HACK
    if (stepEnabled) {
        try { ModAPI.player.stepHeight = 2.0; } catch(e) {}
    } else {
        try { ModAPI.player.stepHeight = 0.5; } catch(e) {}
    }

    // 4. JETPACK HACK
    if (jetpackEnabled) {
        try {
            if (ModAPI.player.movementInput.jump) {
                ModAPI.player.motionY = 0.5;
                ModAPI.player.fallDistance = 0;
            }
        } catch(e) {}
    }
}

ModAPI.addEventListener("update", updateHacks);

// ============================================
// CHAT COMMANDS
// ============================================
ModAPI.addEventListener("sendchatmessage", (event) => {
    const msg = event.message.trim().toLowerCase();

    if (msg === "/fly") {
        flyEnabled = !flyEnabled;
        ModAPI.displayToChat({ msg: `§6[SuperHacks] §fFly Hack: ${flyEnabled ? "§aON" : "§cOFF"}` });
        ModAPI.displayToChat({ msg: `§e(Try double-tapping space to fly)` });
    }
    else if (msg === "/speed") {
        speedEnabled = !speedEnabled;
        ModAPI.displayToChat({ msg: `§6[SuperHacks] §fSpeed Hack: ${speedEnabled ? "§aON" : "§cOFF"}` });
    }
    else if (msg === "/step") {
        stepEnabled = !stepEnabled;
        ModAPI.displayToChat({ msg: `§6[SuperHacks] §fStep Hack: ${stepEnabled ? "§aON" : "§cOFF"}` });
    }
    else if (msg === "/jetpack") {
        jetpackEnabled = !jetpackEnabled;
        ModAPI.displayToChat({ msg: `§6[SuperHacks] §fJetpack: ${jetpackEnabled ? "§aON" : "§cOFF"}` });
        ModAPI.displayToChat({ msg: `§e(Hold spacebar to fly up)` });
    }
    else if (msg === "/hacks") {
        ModAPI.displayToChat({ msg: "§6===== SuperHacks Status =====" });
        ModAPI.displayToChat({ msg: `§fFly: ${flyEnabled ? "§aON" : "§cOFF"}` });
        ModAPI.displayToChat({ msg: `§fSpeed: ${speedEnabled ? "§aON" : "§cOFF"}` });
        ModAPI.displayToChat({ msg: `§fStep: ${stepEnabled ? "§aON" : "§cOFF"}` });
        ModAPI.displayToChat({ msg: `§fJetpack: ${jetpackEnabled ? "§aON" : "§cOFF"}` });
        ModAPI.displayToChat({ msg: "§6=============================" });
    }
});

// ============================================
// INITIALIZATION
// ============================================
ModAPI.addEventListener("load", () => {
    ModAPI.displayToChat({ msg: "§6[SuperHacks] §aMod loaded successfully!" });
    ModAPI.displayToChat({ msg: "§eType /hacks to see the menu." });
});