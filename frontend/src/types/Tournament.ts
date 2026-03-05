


export interface Tournament {
  id: number;
  name: string;
  creatorId: number;
  creatorDisplayName: string;
  status: 'waiting' | 'in_progress' | 'finished';
  maxParticipants: number;
  currentParticipants: number;
  currentRound: number;
  totalRounds: number;
  winnerId?: number;
  winnerDisplayName?: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
}


export interface TournamentParticipant {
  userId: number;
  displayName: string;
  tournamentId: number;
  seed: number;
  eliminated: boolean;
  joinedAt: string;
}


export interface TournamentMatch {
  id: number;
  tournamentId: number;
  round: number;
  matchNumber: number;
  player1Id?: number;
  player1DisplayName?: string;
  player2Id?: number;
  player2DisplayName?: string;
  winnerId?: number;
  player1Score?: number;
  player2Score?: number;
  status: 'pending' | 'in_progress' | 'finished';
  gameId?: string;
  scheduledAt?: string;
  startedAt?: string;
  finishedAt?: string;
}


export interface TournamentMatchResult {
  matchId: number;
  winnerId: number;
  player1Score: number;
  player2Score: number;
}


export interface CreateTournamentBody {
  name: string;
  start_time: string; 
}


export interface JoinTournamentBody {
  displayname: string;
  guest?: boolean;
}


export interface LeaveTournamentBody {
  userId?: number;
  displayname?: string;
}


export interface SubmitMatchResultBody {
  winnerId: number;
  player1Score: number;
  player2Score: number;
}


export interface TournamentStatus {
  tournament: Tournament;
  participants: TournamentParticipant[];
  currentMatches: TournamentMatch[];
}


export type TournamentWSMessage =
  | { type: 'TOURNAMENT_STARTED'; tournamentId: number }
  | { type: 'NEXT_MATCH_READY'; tournamentId: string; matchId: number; gameId: string; opponentName: string }
  | { type: 'MATCH_STARTED'; matchId: number; gameId: string }
  | { type: 'MATCH_FINISHED'; matchId: number; winnerId: number; winnerName: string }
  | { type: 'ROUND_COMPLETE'; round: number; nextRound: number }
  | { type: 'TOURNAMENT_COMPLETE'; winnerId: number; winnerName: string }
  | { type: 'PARTICIPANT_JOINED'; userId: number; displayName: string }
  | { type: 'PARTICIPANT_LEFT'; userId: number; displayName: string }
  | { type: 'ERROR'; message: string };
