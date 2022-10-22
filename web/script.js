const { createApp } = Vue;
const { ipcRenderer, shell } = require('electron');
const path = require("path");
const fs = require('fs');
const os = require('os');
const ps = require("ps-node");
const terminate = require("terminate");
const cp = require("child_process");

const PLATFORM = os.platform();
const APPDATA = ipcRenderer.sendSync("getPath", "appData");
const LOCALAPPDATA = process.env.LOCALAPPDATA;

const psLookup = (l)=>new Promise((r, re)=>ps.lookup(l, (error, result)=>{r(result); re(error);}));

async function makeSureDirectory(dir) {
    if (!fs.existsSync(dir))
        await fs.promises.mkdir(dir, { recursive: true });
}

async function dl(u, p) {
    let pp = path.parse(p);

    await makeSureDirectory(pp.dir);

    let r = await fetch(u);

    await fs.promises.writeFile(p, Buffer.from(await r.arrayBuffer()));
}

createApp({
    methods: {
        async quit() {
            await gsap.to("#app", { duration: 0.5, ease: "ease", opacity: 0 });
            ipcRenderer.send("quit");
        },
        async showSection(section) {
            await new Promise(this.$nextTick);
            await this.hideSections();

            await gsap.to(`.section-${section}`, { duration: 0, display: null, opacity: 0 });
            await gsap.to(`.section-${section}`, { duration: 0.5, ease: "ease", opacity: 1 });
        },
        async hideSections(not) {
            await new Promise(this.$nextTick);
            await gsap.to(`section${not ? `:not(.section-${section})` : ""}`, { duration: 0.5, ease: "ease", opacity: 0 });
            await gsap.to(`section${not ? `:not(.section-${section})` : ""}`, { duration: 0, display: "none" });
        },
        async setBgColor(color) {
            await gsap.to("#app", { duration: 0.5, ease: "ease", "--background-color": color });
        },
        openExternal(u) {
            shell.openExternal(u);
        },
        async install() {
            this.installing = true;

            const betterDiscordAsarFile = path.join(APPDATA, "BetterDiscord/data/betterdiscord.asar");

            const processes = await psLookup({ command: this.client.toLowerCase() });

            const discordExePath = processes.length ? processes[0].command : null;

            processes.forEach((i)=>{
                terminate(i.pid);
            });

            await dl(
                "https://github.com/AcordPlugin/releases/raw/main/betterdiscord.asar", 
                betterDiscordAsarFile
            );

            await dl(
                "http://betterdiscord.app/Download?id=9",
                path.join(APPDATA, "BetterDiscord/plugins/0PluginLibrary.plugin.js"),
            );

            await dl(
                "http://raw.githubusercontent.com/AcordPlugin/releases/main/acord.plugin.js", 
                path.join(APPDATA, "BetterDiscord/plugins/acord.plugin.js")
            );

            async function setupResources(RESOURCES_DIR) {
                await dl(
                    "https://github.com/GooseMod/OpenAsar/releases/download/nightly/app.asar", 
                    path.join(RESOURCES_DIR, "/app.asar")
                );

                await makeSureDirectory(path.join(RESOURCES_DIR, "/app"));

                await fs.promises.writeFile(
                    path.join(RESOURCES_DIR, "/app/package.json"),
                    JSON.stringify({ name: "betterdiscord", main: "index.js" }),
                    "utf-8"
                );
                await fs.promises.writeFile(
                    path.join(RESOURCES_DIR, "/app/index.js"),
                    `require("${betterDiscordAsarFile.replaceAll("\\", "\\\\")}");`,
                    "utf-8"
                );
            }
            
            const APP_DIR = this.allowedClientPaths[this.client];
            if (PLATFORM == "darwin") {
                const RESOURCES_DIR = path.join(APP_DIR, "Contents/Resources");
                await setupResources(RESOURCES_DIR);
            } else {
                let dirnames = await fs.promises.readdir(APP_DIR);
                let appCodes = dirnames.filter(i=>i.startsWith("app-"));
                for (let i = 0; i < appCodes.length; i++) {
                    const addCode = appCodes[i];
                    await setupResources(path.join(APP_DIR, addCode, "/resources"));
                }
            }

            await new Promise(r=>setTimeout(r, 1000));

            if (discordExePath) {
                cp.spawn(discordExePath, { shell: true });
            }

            this.setBgColor("#000000");
            await this.showSection("done");
            this.installing = false;
            this.canDoAgain = true;
        },
        async reset() {
            this.installing = false;
            this.canDoAgain = false;
            this.client = "";
            await new Promise(this.$nextTick);
            this.setBgColor("#000000");
            await this.showSection("welcome");
        }
    },
    async mounted() {

        let possibleNames = ["Discord", "DiscordPTB", "DiscordCanary", "DiscordDevelopment"];
        
        possibleNames.forEach((i)=>{
            let p = PLATFORM == "darwin" ? path.join(`/Applications/${i}.app/`) : path.join(LOCALAPPDATA, i);
            if (fs.existsSync(p)) {
                this.allowedClientPaths[i] = p;
            }
        });

        await this.hideSections();
        await gsap.to("#app", { duration: 0.5, ease: "ease", opacity: 1 });
        this.reset();
    },
    data() {
        return {
            client: "",
            installing: false,
            canDoAgain: false,
            allowedClientPaths: {}
        }
    }
}).mount('#app')