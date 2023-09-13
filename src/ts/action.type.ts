import { Player } from "./player.type";
import { Direction2D, Position2D, Rotation3D } from "./transform.type";
import { World } from "./world.type";

export interface BasePlayerAction {
    playerId: string;
}

export interface FireAction extends BasePlayerAction {
    type: "fire";
    firePosition: Position2D;
    fireDirection: Direction2D;
}

export interface FireActionResponse extends BasePlayerAction {
    type: "fire_response";
    didHit: true;
    hitPlayer?: Player;
    hitPosition?: Position2D;
}

export interface MoveAction extends BasePlayerAction, Partial<Pick<Player, "transform" | "turretRotation">> {
    type: "move";
}
export type PlayerAction = FireAction | FireActionResponse | MoveAction;

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

export interface CloseWorldsUpdate {
    g_type: "close_worlds_update";
    worlds: World[];
}

export type GameAction =
    | JoinWorld
    | ValidatePlayerState
    | ValidatePlayerState
    | PlayerStateUpdate
    | CloseWorldsUpdate;

export interface ExchangeServerInfo {
    s_type: "exchange_server_info";
    world: World;
}

export interface ExchangeServerInfoResponse {
    s_type: "exchange_server_info_response";
    world: World;
}

export type ServerAction = ExchangeServerInfo | ExchangeServerInfoResponse;

export type Action = GameAction | PlayerAction | ServerAction;
