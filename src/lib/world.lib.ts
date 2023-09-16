import {
    CloseWorldsUpdate,
    FireAction,
    FireActionResponse,
    GameAction,
    IntroduceServer,
    MoveAction,
    PlayerAction,
    PlayerStateUpdate,
    Position2D,
    ServerAction,
    World,
} from "src/ts";
import { Player } from "src/ts/player.type";
import { ActionError } from "./error.lib";
import { v4 as uuid4 } from "uuid";
import { WebSocket } from "ws";
import { bulletHitsPlayers, isInWorld, pointToWorld } from "./geometry.lib";

class WorldInstance {
    players: {
        [key: Player["id"]]: {
            player: Player;
            ws: WebSocket;
            candidateWorlds: World[];
        };
    } = {};

    worlds: {
        [key: World["id"]]: {
            world: World;
            ws: WebSocket;
        };
    } = {};

    public broadcastHandler: (message: string) => void;

    constructor(
        private northwest: Position2D,
        private southeast: Position2D,
        private address: string,
        private id = uuid4()
    ) {
        this.players["2"] = {
            candidateWorlds: [],
            player: {
                hp: 100,
                id: "2",
                isControlled: false,
                lastFireTS: 0,
                transform: {
                    position: [16, 5.5],
                    rotation: [0, 0, 0],
                },
                turretRotation: [0, 0, 0],
            },
            ws: null,
        };
    }

    Broadcast(action: GameAction) {
        this.broadcastHandler(
            JSON.stringify({
                ...action,
                serverId: this.id,
            })
        );
    }

    SendActionCreator(action: PlayerAction, response: GameAction | PlayerAction) {
        this.players[action.playerId].ws.send(JSON.stringify(response));
    }

    AddPlayer(player: Player, ws: WebSocket) {
        if (this.players[player.id]) {
            console.log("We already have that player");
            return;
        }

        this.players[player.id] = {
            player,
            ws,
            candidateWorlds: [],
        };

        this.players[player.id].ws.on("close", () => {
            if (this.players[player.id]) {
                console.log("Player disconnected");
                delete this.players[player.id];
            }
        });

        console.log("PLayer Added");

        ws.send(
            JSON.stringify({
                s_type: "introduce_server",
                world: this.GetInfo(),
            } as IntroduceServer)
        );
    }

    HandlePlayerMove(action: MoveAction) {
        const player = this.players[action.playerId]?.player;

        if (!player) {
            return ActionError("Player not found");
        }

        if (action.transform.position) {
            player.transform.position = action.transform.position;
        }

        if (action.transform.rotation) {
            player.transform.rotation = action.transform.rotation;
        }

        if (action.turretRotation) {
            player.turretRotation = action.turretRotation;
        }

        this.players[action.playerId].player = player;

        this.Broadcast({
            player: player,
            g_type: "player_state_update",
        } as PlayerStateUpdate);

        if (this.CheckIfPlayerInWorld(player)) {
            const closeWorlds = this.CheckIfCloseToAnyWorld(player);

            const newWorldIds = closeWorlds.map((w) => w.id);
            const previousWorlIds = this.players[action.playerId].candidateWorlds.map((w) => w.id);

            const difference = [];
            difference.push(
                ...newWorldIds.filter((element) => !previousWorlIds.includes(element)),
                ...previousWorlIds.filter((element) => !newWorldIds.includes(element))
            );

            if (difference.length > 0) {
                this.players[action.playerId].candidateWorlds = closeWorlds;
                this.SendActionCreator(action, {
                    g_type: "close_worlds_update",
                    worlds: closeWorlds,
                } as CloseWorldsUpdate);
            }
        }
    }

    FireRequest(action: FireAction) {
        const hitPointPlayer = bulletHitsPlayers(
            action.firePosition,
            action.fireDirection,
            Object.values(this.players)
                .map((p) => p.player)
                .filter((p) => p.id !== action.playerId)
        );

        if (hitPointPlayer) {
            const message: FireActionResponse = {
                type: "fire_response",
                didHit: true,
                playerId: action.playerId,
                hitPlayer: hitPointPlayer.player as Player,
                hitPosition: hitPointPlayer.point,
            };

            this.SendActionCreator(action, message);
        } else {
            // asl neighbors
        }
    }

    ConnectToWorlds(worlds: string[]) {
        const serverRef = this;

        worlds.forEach((world) => {
            (async () => {
                const ws = new WebSocket(world);

                ws.on("error", console.error);

                ws.on("open", function open() {
                    const serverInfo: ServerAction = {
                        s_type: "exchange_server_info",
                        world: serverRef.GetInfo(),
                    };

                    ws.send(JSON.stringify(serverInfo));
                });

                ws.on("message", function message(data) {
                    const parsed = JSON.parse(data.toString());

                    if ("s_type" in parsed) {
                        const _data = { ...parsed } as ServerAction;

                        switch (_data.s_type) {
                            case "exchange_server_info_response":
                                serverRef.worlds[_data.world.id] = {
                                    world: _data.world,
                                    ws: ws,
                                };

                                // console.log(serverRef.worlds);
                                break;

                            default:
                                console.error("ERROR: not matched any");
                                break;
                        }
                    }
                });
            })();
        });
    }

    AddWorldInfo(world: World, ws: WebSocket) {
        this.worlds[world.id] = {
            world,
            ws,
        };

        // console.log(this.worlds);
    }

    GetInfo(): World {
        return {
            address: this.address,
            id: this.id,
            northwest: this.northwest,
            southeast: this.southeast,
        };
    }

    CheckIfCloseToAnyWorld(player: Player): World[] {
        let worlds = Object.values(this.worlds).map((w) => w.world);

        worlds = worlds.filter((world) => {
            const distance = pointToWorld(player.transform.position, world);

            return distance !== -1 && distance < 5;
        });

        worlds.push(this.GetInfo());

        return worlds;
    }

    CheckIfPlayerInWorld(player: Player) {
        return isInWorld(player.transform.position, this.GetInfo());
    }
}

export { WorldInstance };
