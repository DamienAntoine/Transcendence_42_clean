

import { apiClient, ApiClientError } from './ApiClient';
import { userService } from './UserService';
import { WebSocketManager } from './WebSocketManager';
import { getToken } from '@/utils/storage';
import type {
  Tournament,
  TournamentParticipant,
  TournamentMatch,
  TournamentMatchResult,
  TournamentStatus,
  CreateTournamentBody,
  JoinTournamentBody,
  LeaveTournamentBody,
  SubmitMatchResultBody,
  TournamentWSMessage,
} from '@/types';


export class TournamentService {
  private tournamentWsConnections: Map<number, WebSocketManager<TournamentWSMessage>> = new Map();


  async getTournamentList(): Promise<Tournament[]> {
    try {
      const rows = await apiClient.get<any[]>('/tournament/list');
      const tournaments = rows.map(this.normalizeTournamentRow);


      const missingCreators = tournaments.filter(
        (t) => (!t.creatorDisplayName || t.creatorDisplayName === 'Unknown') && t.creatorId > 0
      );
      const uniqueCreatorIds = Array.from(new Set(missingCreators.map((t) => t.creatorId)));
      if (uniqueCreatorIds.length > 0) {
        const idToName = new Map<number, string>();
        await Promise.all(
          uniqueCreatorIds.map(async (id) => {
            try {
              const user = await userService.getUserById(id);
              idToName.set(id, user.displayName);
            } catch (_) {

            }
          })
        );

        tournaments.forEach((t) => {
          const name = idToName.get(t.creatorId);
          if (name) t.creatorDisplayName = name;
        });
      }


      const needsParticipants = tournaments.filter(
        (t) => (t.currentParticipants ?? 0) === 0 && t.status !== 'finished'
      );
      if (needsParticipants.length > 0) {
        await Promise.all(
          needsParticipants.map(async (t) => {
            try {
              const list = await this.getTournamentParticipants(t.id);
              t.currentParticipants = list.length;
            } catch (_) {

            }
          })
        );
      }

      return tournaments;
    } catch (error) {
      if (error instanceof ApiClientError && error.statusCode === 404) {

        return [];
      }
      throw new Error('Failed to fetch tournament list');
    }
  }


  async getTournamentStatus(tournamentId: number): Promise<TournamentStatus> {
    try {
      const row = await apiClient.get<any>(`/tournament/${tournamentId}/status`);
      const tournament = this.normalizeTournamentRow(row);

      return { tournament, participants: [], currentMatches: [] } as TournamentStatus;
    } catch (error) {
      throw new Error(`Failed to fetch tournament ${tournamentId} status`);
    }
  }


  async getTournamentParticipants(tournamentId: number): Promise<TournamentParticipant[]> {
    try {
      const rows = await apiClient.get<any[]>(`/tournament/${tournamentId}/participants`);
      return rows.map(this.normalizeParticipantRow);
    } catch (error) {
      if (error instanceof ApiClientError && error.statusCode === 404) {

        return [];
      }
      throw new Error(`Failed to fetch participants for tournament ${tournamentId}`);
    }
  }


  async getTournamentMatches(tournamentId: number): Promise<TournamentMatch[]> {
    try {
      const rows = await apiClient.get<any[]>(`/tournament/${tournamentId}/matches`);
      return rows.map(this.normalizeMatchRow);
    } catch (error) {
      if (error instanceof ApiClientError && error.statusCode === 404) {

        return [];
      }
      throw new Error(`Failed to fetch matches for tournament ${tournamentId}`);
    }
  }


  async getMatchResult(tournamentId: number, matchId: number): Promise<TournamentMatchResult> {
    try {
      return await apiClient.get<TournamentMatchResult>(
        `/tournament/${tournamentId}/match/${matchId}/result`
      );
    } catch (error) {
      throw new Error(`Failed to fetch result for match ${matchId}`);
    }
  }


  async submitMatchResult(
    tournamentId: number,
    matchId: number,
    result: SubmitMatchResultBody
  ): Promise<{ success: boolean }> {
    try {
      return await apiClient.put<{ success: boolean }>(
        `/tournament/${tournamentId}/match/${matchId}/result`,
        result
      );
    } catch (error) {
      throw new Error(`Failed to submit result for match ${matchId}`);
    }
  }


  async getMatchGameId(tournamentId: number, matchId: number): Promise<{ gameId: string }> {
    try {
      return await apiClient.get<{ gameId: string }>(
        `/tournament/${tournamentId}/match/${matchId}/gameId`
      );
    } catch (error) {
      throw new Error(`Failed to fetch gameId for match ${matchId}`);
    }
  }


  async createTournament(data: CreateTournamentBody): Promise<Tournament> {
    try {
      return await apiClient.post<Tournament>('/tournament/create', data);
    } catch (error) {

      if (error instanceof Error) {
        throw new Error(error.message || 'Failed to create tournament');
      }
      throw new Error('Failed to create tournament');
    }
  }


  async joinTournament(tournamentId: number, displayname: string, guest?: boolean): Promise<{ success: boolean }> {
    try {
      const body: JoinTournamentBody = { displayname, guest: guest ?? !getToken() } as any;
      return await apiClient.post<{ success: boolean }>(`/tournament/${tournamentId}/join`, body);
    } catch (error) {
      throw new Error(`Failed to join tournament ${tournamentId}`);
    }
  }


  async leaveTournament(tournamentId: number, data: LeaveTournamentBody): Promise<{ success: boolean }> {
    try {
      return await apiClient.post<{ success: boolean }>(`/tournament/${tournamentId}/leave`, data);
    } catch (error) {
      throw new Error(`Failed to leave tournament ${tournamentId}`);
    }
  }


  async startTournament(tournamentId: number): Promise<{ success: boolean }> {
    try {
      return await apiClient.post<{ success: boolean }>(`/tournament/${tournamentId}/start`);
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }
      throw new Error(`Failed to start tournament ${tournamentId}`);
    }
  }


  async finishTournament(tournamentId: number): Promise<{ success: boolean }> {
    try {
      return await apiClient.post<{ success: boolean }>(`/tournament/${tournamentId}/finish`);
    } catch (error) {
      throw new Error(`Failed to finish tournament ${tournamentId}`);
    }
  }


  connectToTournament(tournamentId: number): WebSocketManager<TournamentWSMessage> {
    const token = getToken();
    if (!token) {
      throw new Error('No authentication token available');
    }


    const existing = this.tournamentWsConnections.get(tournamentId);
    if (existing?.isConnected()) {
      return existing;
    }


  const wsUrl = `/tournament/ws/${tournamentId}?token=${token}`;
    const tournamentWs = new WebSocketManager<TournamentWSMessage>(wsUrl, {
      reconnect: true,
      debug: true,
    });

    this.tournamentWsConnections.set(tournamentId, tournamentWs);
    tournamentWs.connect();
    return tournamentWs;
  }


  disconnectFromTournament(tournamentId: number): void {
    const tournamentWs = this.tournamentWsConnections.get(tournamentId);
    if (tournamentWs) {
      tournamentWs.disconnect();
      this.tournamentWsConnections.delete(tournamentId);
    }
  }


  getTournamentWebSocket(tournamentId: number): WebSocketManager<TournamentWSMessage> | undefined {
    return this.tournamentWsConnections.get(tournamentId);
  }


  cleanup(): void {
    this.tournamentWsConnections.forEach((ws) => ws.disconnect());
    this.tournamentWsConnections.clear();
  }


  private normalizeTournamentRow = (row: any): Tournament => {
    const statusMap: Record<string, 'waiting' | 'in_progress' | 'finished'> = {
      pending: 'waiting',
      started: 'in_progress',
      finished: 'finished',
      cancelled: 'finished',
    };
    const status = statusMap[row?.status] ?? (row?.status as any) ?? 'waiting';
    const creatorId: number = Number(row?.creator_id ?? row?.creatorId ?? 0);
    const creatorDisplayName: string =
      row?.creator_displayname ?? row?.creatorDisplayName ?? row?.creator_name ?? 'Unknown';
    const maxParticipants: number = Number(row?.max_participants ?? row?.maxParticipants ?? 0);
    const currentParticipants: number = Number(
      row?.current_participants ?? row?.participant_count ?? row?.currentParticipants ?? 0
    );
    const currentRound: number = Number(row?.current_round ?? row?.currentRound ?? 0);
    const totalRounds: number = Number(row?.total_rounds ?? row?.totalRounds ?? 0);
    const createdAt: string = row?.created_at ?? row?.start_time ?? new Date().toISOString();
    const startedAt: string | undefined =
      status === 'in_progress' ? row?.started_at ?? row?.start_time ?? undefined : undefined;
    const finishedAt: string | undefined =
      status === 'finished' ? row?.finished_at ?? row?.finishedAt ?? undefined : undefined;
    const winnerIdVal = Number(row?.winner_id ?? row?.winnerId ?? 0);
    const winnerId = Number.isFinite(winnerIdVal) && winnerIdVal > 0 ? winnerIdVal : undefined;
    const winnerDisplayName: string | undefined =
      row?.winner_displayname ?? row?.winnerDisplayName ?? undefined;
    return {
      id: Number(row?.id ?? 0),
      name: row?.name ?? 'Tournament',
      creatorId,
      creatorDisplayName,
      status,
      maxParticipants,
      currentParticipants,
      currentRound,
      totalRounds,
      createdAt,
      startedAt,
      finishedAt,
      winnerId,
      winnerDisplayName,
    } as Tournament;
  };


  private normalizeParticipantRow = (row: any): TournamentParticipant => {
    const displayName = row?.displayName ?? row?.displayname ?? 'Guest';
    return {
      userId: Number(row?.user_id ?? row?.userId ?? 0),
      displayName,
      tournamentId: Number(row?.tournament_id ?? 0),
      seed: Number(row?.seed ?? 0),
      eliminated: Boolean(row?.eliminated ?? false),
      joinedAt: row?.joined_at ?? new Date().toISOString(),
    } as TournamentParticipant;
  };


  private normalizeMatchRow = (row: any): TournamentMatch => {
    const id = Number(row?.id ?? row?.match_id ?? 0);
    const tournamentId = Number(row?.tournament_id ?? row?.tournamentId ?? 0);
    const round = Number(row?.round ?? 0);
    const matchNumber = Number(row?.matchNumber ?? row?.id ?? 0);

    const player1IdVal = row?.player1Id ?? row?.player1_id;
    const player2IdVal = row?.player2Id ?? row?.player2_id;

    const player1Id = Number.isFinite(Number(player1IdVal)) && Number(player1IdVal) > 0 ? Number(player1IdVal) : undefined;
    const player2Id = Number.isFinite(Number(player2IdVal)) && Number(player2IdVal) > 0 ? Number(player2IdVal) : undefined;

    const player1DisplayName = row?.player1DisplayName ?? row?.player1_name ?? 'TBD';
    const player2DisplayName = row?.player2DisplayName ?? row?.player2_name ?? 'TBD';

    const winnerIdVal = row?.winnerId ?? row?.winner_id;
    const winnerId = Number.isFinite(Number(winnerIdVal)) && Number(winnerIdVal) > 0 ? Number(winnerIdVal) : undefined;

    const p1ScoreRaw = row?.player1Score ?? row?.player1_score;
    const p2ScoreRaw = row?.player2Score ?? row?.player2_score;
    const player1Score = Number.isFinite(Number(p1ScoreRaw)) ? Number(p1ScoreRaw) : undefined;
    const player2Score = Number.isFinite(Number(p2ScoreRaw)) ? Number(p2ScoreRaw) : undefined;


    const rawStatus: string = (row?.status ?? '').toString().toLowerCase();
    let status: TournamentMatch['status'];
    if (rawStatus === 'in_progress' || rawStatus === 'started' || rawStatus === 'running') {
      status = 'in_progress';
    } else if (rawStatus === 'finished' || rawStatus === 'complete' || rawStatus === 'completed' || rawStatus === 'cancelled') {
      status = 'finished';
    } else {
      status = 'pending';
    }


    const hasScores = typeof player1Score === 'number' && typeof player2Score === 'number';
    if (winnerId || hasScores) {
      status = 'finished';
    }

    const gameId: string | undefined = row?.gameId ?? row?.game_id ?? undefined;

    return {
      id,
      tournamentId,
      round,
      matchNumber,
      player1Id,
      player1DisplayName,
      player2Id,
      player2DisplayName,
      winnerId,
      player1Score,
      player2Score,
      status,
      gameId,
      scheduledAt: row?.scheduledAt ?? row?.scheduled_at,
      startedAt: row?.startedAt ?? row?.started_at,
      finishedAt: row?.finishedAt ?? row?.finished_at,
    } as TournamentMatch;
  };
}


export const tournamentService = new TournamentService();
