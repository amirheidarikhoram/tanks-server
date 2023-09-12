import {
    FireAction,
    FireActionResponse,
    GameAction,
    MoveAction,
    PlayerAction,
    PlayerStateUpdate,
    Position2D,
} from "src/ts";
import { Player } from "src/ts/player.type";
import { ActionError } from "./error.lib";
import { v4 as uuid4 } from "uuid";
import { WebSocket } from "ws";

class World {
    players: {
        [key: Player["id"]]: {
            player: Player;
            ws: WebSocket;
        };
    } = {};

    public broadcastHandler: (message: string) => void;

    constructor(
        private northwest: Position2D,
        private southeast: Position2D,
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
        console.log(this.players[action.playerId]);

        this.players[action.playerId].ws.send(JSON.stringify(response));
    }

    AddPlayer(player: Player, ws: WebSocket) {
        this.players[player.id] = {
            player,
            ws,
        };

        console.log("Added Player with id " + player.id);
    }

    UpdatePlayerTransform(action: MoveAction) {
        const player = this.players[action.playerId].player;

        if (!player) {
            return ActionError("Player not found");
        }

        if (action.position) {
            player.transform.position = {
                ...player.transform.position,
                ...action.position,
            };
        }

        if (action.rotation) {
            player.transform.rotation = {
                ...player.transform.rotation,
                ...action.rotation,
            };
        }

        this.Broadcast({
            player: player,
            g_type: "player_state_update",
        } as PlayerStateUpdate);
    }

    FireRequest(action: FireAction) {
        console.log("Fire Action", action);

        // mathematically check if it hits any

        const hits = false;

        if (hits) {
            const message: FireActionResponse = {
                type: "fire_response",
                didHit: true,
                playerId: action.playerId,
                hitPlayer: {} as Player, // TODO: the player
                hitPosition: [0, 0], // TODO: the hit position
            };

            this.SendActionCreator(action, message);
        } else {
            // asl neighbors
        }
    }

    ConnectToWorlds(worlds: []) {}
}

export { World };
