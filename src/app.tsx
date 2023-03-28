import {
  exec,
  log,
  spawn,
  timeout,
  resolve,
  appendFile,
  addTerminationHook,
  GLOBAL_onClose,
  setKey,
} from "./utils";
import { createAria2 } from "./aria2";
import { checkWine, createWine, createWineInstallProgram } from "./wine";
import { createGithubEndpoint } from "./github";
import { createLauncher } from "./launcher";
import "./app.css";
import { createUpdater, downloadProgram } from "./updater";
import { createCommonUpdateUI } from "./common-update-ui";
import { createLocale } from "./locale";
import { CROSSOVER_LOADER } from "./crossover";
import { CN_SERVER, OS_SERVER } from "./constants";
import { rawString } from "./command-builder";
import { Command } from "@tauri-apps/api/shell";

export async function createApp() {
  await setKey("singleton", null);

  let aria2_port = 6868;

  const locale = await createLocale();
  const github = await createGithubEndpoint();
  const aria2_session = await resolve("./aria2.session");
  await appendFile(aria2_session, "");
  const pid = (await exec(["echo", rawString("$PPID")])).stdOut.split("\n")[0];
  const { pid: apid } = await spawn([
    "./sidecar/aria2/aria2c",
    "-d",
    "/",
    "--no-conf",
    "--enable-rpc",
    `--rpc-listen-port=${aria2_port}`,
    `--rpc-listen-all=true`,
    `--rpc-allow-origin-all`,
    `--input-file`,
    `${aria2_session}`,
    `--save-session`,
    `${aria2_session}`,
    `--pause`,
    `true`,
    "--stop-with-process",
    pid,
  ]);
  addTerminationHook(async () => {
    // double insurance (esp. for self restart)
    await log("killing process " + apid);
    try {
      await exec(["kill", apid + ""]);
    } catch {
      await log("killing process failed?");
    }
    return true;
  });
  const aria2 = await Promise.race([
    createAria2({ host: "127.0.0.1", port: aria2_port }),
    timeout(10000),
  ]).catch(() => Promise.reject(new Error("Fail to launch aria2.")));
  await log(`Launched aria2 version ${aria2.version.version}`);

  const { latest, downloadUrl, description, version } = await createUpdater({
    github,
    aria2,
  });
  if (!latest) {
    if (
      await locale.prompt(
        "NEW_VERSION_AVALIABLE",
        "NEW_VERSION_AVALIABLE_DESC",
        [version, description]
      )
    ) {
      return createCommonUpdateUI(locale, () =>
        downloadProgram(aria2, downloadUrl)
      );
    }
  }

  const { wineReady, wineUpdate, wineUpdateTag, wineTag } = await checkWine(
    github
  );
  const prefixPath = await resolve("./wineprefix"); // CHECK: hardcoded path?
  const commandResult = await new Command("printenv", "YAAGL_OVERSEA").execute();
  if (commandResult.code !== 0) {
    throw new Error(commandResult.stderr);
  }

  const isOverseaVersion = commandResult.stdout == "1";
  const server = isOverseaVersion ? OS_SERVER : CN_SERVER;
  if (wineReady) {
    const wine = await createWine({
      loaderBin:
        wineTag == "crossover"
          ? CROSSOVER_LOADER
          : await resolve("./wine/bin/wine64"), // CHECK: hardcoded path?
      prefix: prefixPath,
    });
    return await createLauncher({
      aria2,
      wine,
      locale,
      github,
      server,
    });
  } else {
    return await createWineInstallProgram({
      aria2,
      wineUpdateTarGzFile: wineUpdate,
      wineAbsPrefix: prefixPath,
      wineTag: wineUpdateTag,
      locale,
      server,
    });
  }
}
