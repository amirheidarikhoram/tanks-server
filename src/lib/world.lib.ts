import {
    Action,
    CloseWorldsUpdate,
    DieAction,
    FireAction,
    FireActionPropagate,
    FireActionPropagateResponse,
    FireActionResponse,
    GameAction,
    HitAction,
    IntroduceServer,
    JoinWorld,
    MoveAction,
    PlayerAction,
    PlayerDisconnect,
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

    localPropagatedFireActions: {
        [key: string]: {
            action: FireAction;
        };
    } = {};
    propagatedFireActionsDictionary: {
        [key: string]: {
            from: World["address"];
        };
    } = {};

    public broadcastHandler: (message: string) => void;

    constructor(
        private northwest: Position2D,
        private southeast: Position2D,
        private address: string,
        private id = uuid4()
    ) {}

    Broadcast(action: GameAction) {
        this.broadcastHandler(
            JSON.stringify({
                ...action,
                serverId: this.id,
            })
        );
    }

    SendActionCreator(action: PlayerAction, response: GameAction | PlayerAction) {
        if (this.players[action.playerId]?.ws) {
            this.players[action.playerId].ws.send(JSON.stringify(response));
        } else {
            delete this.players[action.playerId];
        }
    }

    AddPlayer(player: Player, ws: WebSocket) {
        if (this.players[player.id]) {
            console.log("We already have that player");
            return;
        }

        const _player: Player = {
            ...player,
            // TODO: implement a solution to set initial position of new players, those are starting to play
            // transform: {
            //     ...player.transform,
            //     position: [
            //         (this.northwest[0] + this.southeast[0]) / 2,
            //         (this.northwest[1] + this.southeast[1]) / 2,
            //     ],
            // },
            hp: 100,
            lastFireTS: 0,
        };

        this.BroadcastToPlayers({
            g_type: "player_join",
            player: _player,
        } satisfies JoinWorld);

        this.players[player.id] = {
            player: _player,
            ws,
            candidateWorlds: [],
        };

        this.players[player.id].ws.on("close", () => {
            if (this.players[player.id]) {
                delete this.players[player.id];
                this.BroadcastToPlayers({
                    g_type: "player_disconnect",
                    playerId: player.id,
                } as PlayerDisconnect);
            }
        });

        ws.send(
            JSON.stringify({
                s_type: "introduce_server",
                world: this.GetInfo(),
                players: Object.values(this.players)
                    .map((p) => p.player)
                    .filter((p) => p.id !== _player.id),
            } as IntroduceServer)
        );

        // ws.send(
        //     JSON.stringify({
        //         g_type: "player_state_update",
        //         player: _player,
        //     } as PlayerStateUpdate)
        // );
    }

    HandlePlayerMove(action: MoveAction) {
        const player = this.players[action.playerId]?.player;

        if (!player) {
            return ActionError("Player not found");
        }

        if (
            action.transform.position &&
            Array.isArray(action.transform.position) &&
            action.transform.position.length === 2
        ) {
            player.transform.position = action.transform.position;
        }

        if (
            action.transform.rotation &&
            Array.isArray(action.transform.rotation) &&
            action.transform.rotation.length === 4
        ) {
            player.transform.rotation = action.transform.rotation;
        }

        if (
            action.turretRotation &&
            Array.isArray(action.turretRotation) &&
            action.turretRotation.length === 4
        ) {
            player.turretRotation = action.turretRotation;
        }

        this.players[action.playerId].player = player;

        this.BroadcastToPlayers(
            {
                player: player,
                g_type: "player_state_update",
            } as PlayerStateUpdate,
            ({ player: _p }) => _p.id !== player.id
        );

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

    LocalFireRequest(action: FireAction): FireActionResponse | null {
        const hitPointPlayer = bulletHitsPlayers(
            action.firePosition,
            action.fireDirection,
            Object.values(this.players).map((p) => p.player)
        );

        if (hitPointPlayer) {
            const fireResponse: FireActionResponse = {
                type: "fire_response",
                didHit: true,
                playerId: action.playerId,
                hitPlayer: hitPointPlayer.player as Player,
                hitPosition: hitPointPlayer.point,
            };

            this.BroadcastToPlayers(fireResponse);

            const player = hitPointPlayer.player;
            
            player.hp -= 40;
            if (player.hp < 0) {
                const dieAction: DieAction = {
                    g_type: "die",
                    playerId: player.id,
                };

                this.BroadcastToPlayers(dieAction);
                this.BroadcastToWorlds(dieAction);

                this.players[player.id]?.ws.close();

                delete this.players[player.id];
            }

            return fireResponse;
        }

        return null;
    }

    FireRequest(action: FireAction) {
        this.BroadcastToPlayers(action, ({ player }) => player.id !== action.playerId);

        const fireResponse = this.LocalFireRequest(action);

        if (fireResponse) {
            this.SendActionCreator(action, fireResponse);
        } else {
            const propagateAction: FireActionPropagate = {
                propagationId: uuid4(),
                s_type: "fire_propagate",
                action,
                worldId: this.GetInfo().id,
            };

            this.localPropagatedFireActions[propagateAction.propagationId] = {
                action: action,
            };

            this.BroadcastToWorlds(propagateAction);
        }
    }

    HandleFirePropagate(action: FireActionPropagate) {
        if (this.propagatedFireActionsDictionary[action.propagationId]) {
            return;
        }

        const fireResponse = this.LocalFireRequest(action.action);

        if (fireResponse) {
            const firePropagateResponse: FireActionPropagateResponse = {
                actionReponse: fireResponse,
                propagationId: action.propagationId,
                s_type: "fire_propagate_response",
                worldId: this.id,
            };

            this.worlds[action.worldId]?.ws.send(JSON.stringify(firePropagateResponse));
        } else {
            this.propagatedFireActionsDictionary[action.propagationId] = {
                from: action.worldId,
            };

            const newAction: FireActionPropagate = {
                ...action,
                worldId: this.id,
            };

            this.BroadcastToWorlds(newAction);
        }
    }

    HandleFirePropagateResponse(action: FireActionPropagateResponse) {
        // check if it is local
        if (this.localPropagatedFireActions[action.propagationId]) {
            const playerObject = this.players[action.actionReponse.playerId];

            if (playerObject) {
                playerObject.ws.send(JSON.stringify(action.actionReponse));
            }
        } else {
            // check if we are sending the response to the correct server
            if (this.propagatedFireActionsDictionary[action.propagationId]) {
                // now we know to whom we must send the response
                const targetWorldId =
                    this.propagatedFireActionsDictionary[action.propagationId].from;

                // check if are connected to the world
                const worldObject = this.worlds[targetWorldId];

                if (worldObject) {
                    worldObject.ws.send(JSON.stringify(action));
                }
            }
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
                    const _data = JSON.parse(data.toString()) as Action;

                    if ("s_type" in _data) {
                        switch (_data.s_type) {
                            case "exchange_server_info_response":
                                serverRef.worlds[_data.world.id] = {
                                    world: _data.world,
                                    ws: ws,
                                };
                                break;

                            case "fire_propagate":
                                serverRef.HandleFirePropagate(_data);
                                break;

                            case "fire_propagate_response":
                                serverRef.HandleFirePropagateResponse(_data);
                                break;

                            default:
                                console.error("ERROR: not matched any");
                                break;
                        }
                    } else if ("g_type" in _data) {
                        switch (_data.g_type) {
                            case "die":
                                console.log("die action", _data);
                                serverRef.PlayerDiedInOtherWorld(_data.playerId);
                                break;

                            default:
                                console.error("ERROR: not matched any game action");
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

    BroadcastToWorlds(action: Action, predicate?: (w: (typeof this.worlds)[string]) => boolean) {
        let worldObjects = Object.values(this.worlds);

        if (predicate) {
            worldObjects = worldObjects.filter(predicate);
        }

        worldObjects.forEach(({ ws }) => {
            ws.send(JSON.stringify(action));
        });
    }

    BroadcastToPlayers(action: Action, predicate?: (w: (typeof this.players)[string]) => boolean) {
        let playerObjects = Object.values(this.players);

        if (predicate) {
            playerObjects = playerObjects.filter(predicate);
        }

        playerObjects.forEach(({ ws }) => {
            ws.send(JSON.stringify(action));
        });
    }

    PlayerDiedInOtherWorld(playerId: string) {
        this.BroadcastToPlayers({
            g_type: "die",
            playerId,
        } as DieAction);

        if (this.players[playerId]) {
            this.players[playerId].ws.close();
            delete this.players[playerId];
        }
    }
}

export { WorldInstance };
