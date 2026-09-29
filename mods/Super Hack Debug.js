// ============================================
// SUPER HACKS DEBUG MOD
// ============================================

ModAPI.require("player");
ModAPI.require("world");

ModAPI.addEventListener("sendchatmessage", (event) => {
    const message = event.message.trim().toLowerCase();
    
    // 1. Confirm the chat event works
    ModAPI.displayToChat({ msg: "§e[Debug] Chat event detected: " + message });
    
    if (message === "/test") {
        ModAPI.displayToChat({ msg: "§a[Debug] Command /test works!" });
        
        // 2. Check if player object exists
        if (ModAPI.player) {
            ModAPI.displayToChat({ msg: "§a[Debug] ModAPI.player is defined!" });
            ModAPI.displayToChat({ msg: "§a[Debug] Player name: " + ModAPI.player.getName() });
        } else {
            ModAPI.displayToChat({ msg: "§c[Debug] ModAPI.player is UNDEFINED!" });
        }
        
        // 3. Check if mcinstance exists (fallback path)
        if (ModAPI.mcinstance && ModAPI.mcinstance.thePlayer) {
            ModAPI.displayToChat({ msg: "§a[Debug] ModAPI.mcinstance.thePlayer is defined!" });
        } else {
            ModAPI.displayToChat({ msg: "§c[Debug] ModAPI.mcinstance.thePlayer is UNDEFINED!" });
        }
    }
});

ModAPI.addEventListener("load", () => {
    ModAPI.displayToChat({ msg: "§6[SuperHacks Debug] §aMod loaded!" });
    ModAPI.displayToChat({ msg: "§eType /test in chat to diagnose." });
});