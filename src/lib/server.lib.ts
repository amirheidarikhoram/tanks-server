import {
    Action,
    FireAction,
    GameAction,
    ExchangeServerInfoResponse,
    PlayerAction,
    World,
} from "src/ts";
import { WebSocketServer } from "ws";
import { WorldInstance } from "./world.lib";

export const Server = (port: number, world: WorldInstance) => {
    const wss = new WebSocketServer({
        port,
    });

    wss.on("connection", function connection(ws) {
        ws.on("error", console.error);

        ws.on("message", function message(data) {
            const _data = JSON.parse(data.toString()) as Action;

            if ("g_type" in _data) {
                switch (_data.g_type) {
                    case "player_join":
                        world.AddPlayer(_data.player, ws);
                        break;
                }
            } else if ("type" in _data) {
                switch (_data.type) {
                    case "fire":
                        world.FireRequest(_data as FireAction);
                        break;

                    case "move":
                        world.HandlePlayerMove(_data);
                        break;
                }
            } else if ("s_type" in _data) {
                switch (_data.s_type) {
                    case "exchange_server_info":
                        world.AddWorldInfo(_data.world, ws);

                        ws.send(
                            JSON.stringify({
                                s_type: "exchange_server_info_response",
                                world: {
                                    ...world.GetInfo(),
                                    address: `ws://127.0.0.1:${port}`,
                                } as World,
                            } as ExchangeServerInfoResponse)
                        );
                        break;

                    default:
                        break;
                }
            }
        });
    });

    return wss;
};
