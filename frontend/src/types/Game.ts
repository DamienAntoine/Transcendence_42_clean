


export interface GameHistory {
  id: number;
  player1Id: number;
  player1DisplayName: string;
  player2Id: number;
  player2DisplayName: string;
  player1Score: number;
  player2Score: number;
  winnerId: number;
  startedAt: string;
  finishedAt: string;
  duration?: number;
}


export interface CreateGameBody {
  player1Id: number;
  player2Id: number;
}


export interface GameParams {
  winCondition: number;
  fieldWidth: number;
  fieldHeight: number;
  paddleHeight: number;
  paddleWidth: number;
  customField: boolean;
}


export interface GameIdResponse {
  gameId: string;
}
