import { FireAction, GameAction, PlayerAction } from "src/ts";
import { WebSocketServer } from "ws";
import { World } from "./world.lib";

export const Server = (port: number, world: World) => {
    const wss = new WebSocketServer({
        port,
    });

    wss.on("connection", function connection(ws) {
        ws.on("error", console.error);

        ws.on("message", function message(data) {
            data = JSON.parse(data.toString());

            if ("g_type" in data) {
                const parsedData = data as unknown as GameAction;

                switch (parsedData.g_type) {
                    case "player_join":
                        world.AddPlayer(parsedData.player, ws);
                        break;
                }
            } else if ("type" in data) {
                const parsedData = data as unknown as PlayerAction;

                switch (parsedData.type) {
                    case "fire":
                        world.FireRequest(parsedData as FireAction);
                        break;
                }
            }
        });
    });

    return wss;
};
