import { Player } from "./player.type";
import { Direction2D, Position2D, Rotation3D } from "./transform.type";

export interface PlayerAction {
    playerId: string;
    type: "fire" | "fire_response" | "move";
}

export interface FireAction extends PlayerAction {
    type: "fire";
    firePosition: Position2D;
    fireDirection: Direction2D;
}

export interface FireActionResponse extends PlayerAction {
    type: "fire_response";
    didHit: true;
    hitPlayer?: Player;
    hitPosition?: Position2D;
}

export interface MoveAction extends PlayerAction {
    type: "move";
    position?: Position2D;
    rotation?: Rotation3D;
}

export interface JoinWorld {
    g_type: "player_join";
    player: Player;
}

export interface ValidatePlayerState {
    g_type: "player_validate";
    playerId: Player["id"];
    MD5: string;
}

export interface ValidatePlayerStateResponse {
    g_type: "player_validate_response";
    playerId: Player["id"];
    valid: boolean;
}

export interface PlayerStateUpdate {
    g_type: "player_state_update";
    player: Player;
}

export type GameAction = JoinWorld | ValidatePlayerState | ValidatePlayerState | PlayerStateUpdate;
