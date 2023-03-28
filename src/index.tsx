import { render } from "solid-js/web";
import { createApp } from "./app";
import { HopeProvider } from "@hope-ui/solid";
import { amber } from "@radix-ui/colors";

import { fatal } from "./utils";

function createPlates(tag: string, color: any, colortag:string) {
  return Object.fromEntries((new Array(12)).fill(1).map((_,i)=>[`${tag}${i+1}`,color[`${colortag}${i+1}`] as string] as const));
}

createApp()
    .then((UI) => {
      render(
        () => (
          <HopeProvider config={{
            lightTheme: {
              colors: {
                ...createPlates("primary",amber,"amber") // 兔兔伯爵，出击
              }
            }
          }}>
            <UI />
          </HopeProvider>
        ),
        document.getElementById("root") as HTMLElement
      );
    })
    .catch(fatal);