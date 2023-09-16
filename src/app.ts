#!/usr/bin/env node

import process from "process";
import { matchGameServerAddress } from "src/utils";
import args, { option } from "args";
import { WorldInstance } from "./lib/world.lib";
import { Position2D } from "./ts";
import { Server } from "./lib/server.lib";

type Options = {
    port: string;
    northwest: string;
    southeast: string;
    worlds: string[];
};

args.option("port", "Listening port.")
    .option("northwest", "The northwest point from which server is responsible for.")
    .option("southeast", "The southeast point to which server is responsible for.")
    .option("worlds", "The addresses of other servers", [])
    .command("run", "run server", (name, sub, options) => {
        const _options = { ...options } as unknown as Options;

        const northwest = _options.northwest.split(",").map((v) => parseInt(v)) as Position2D;
        const southeast = _options.southeast.split(",").map((v) => parseInt(v)) as Position2D;

        const port = parseInt(_options.port);
        const worlds = (_options.worlds ?? []).filter(matchGameServerAddress);

        const world = new WorldInstance(northwest, southeast, `ws://127.0.0.1:${port}`);

        const server = Server(port, world);

        world.broadcastHandler = (message) => {
            server.emit("message", message);
        };

        world.ConnectToWorlds(worlds);
    });

args.parse(process.argv);

if (args.sub.length === 0) {
    args.showHelp();
    process.exit(0);
}
