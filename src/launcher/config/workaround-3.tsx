import { FormControl, FormLabel, Box, Checkbox } from "@hope-ui/solid";
import { createEffect, createSignal } from "solid-js";
import { Locale } from "../../locale";
import { getKey, setKey } from "../../utils";
import { Config, NOOP } from "./config-def";
import { invoke } from '@tauri-apps/api/tauri'
import { Command } from "@tauri-apps/api/shell";

declare module "./config-def" {
  interface Config {
    workaround3: boolean;
  }
}

const CONFIG_KEY = "config_workaround3";

export async function createWorkaround3Config({
  locale,
  config,
}: {
  config: Partial<Config>;
  locale: Locale;
}) {
  try {
    config.workaround3 = (await getKey(CONFIG_KEY)) == "true";
  } catch {
    const model = await invoke('get_model');
    const commandResult = await new Command("printenv", "YAAGL_OVERSEA").execute();
    if (commandResult.code !== 0) {
      throw new Error(commandResult.stderr);
    }

    const isOverseaVersion = commandResult.stdout == "1";
    config.workaround3 =
      isOverseaVersion
        ? false
        : model == "Apple" // HACK: the app runs on rosetta
        ? true
        : false; // default value
  }

  const [value, setValue] = createSignal(config.workaround3);

  async function onSave(apply: boolean) {
    if (!apply) {
      setValue(config.workaround3!);
      return NOOP;
    }
    if (config.workaround3! == value()) return NOOP;
    config.workaround3 = value();
    await setKey(CONFIG_KEY, config.workaround3! ? "true" : "false");
    return NOOP;
  }

  createEffect(() => {
    value();
    onSave(true);
  });

  return [
    function UI() {
      return (
        <FormControl id="workaround3">
          <FormLabel>Workaround #3</FormLabel>
          <Box>
            <Checkbox
              checked={value()}
              onChange={() => setValue((x) => !x)}
              size="md"
            >
              {locale.get("SETTING_ENABLED")}
            </Checkbox>
          </Box>
        </FormControl>
      );
    },
  ] as const;
}
