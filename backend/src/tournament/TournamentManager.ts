import * as sqlite3 from 'sqlite3';
import { JoinTournamentBody } from './tournamentModels/JoinTournamentBody';
import { CreateTournamentBody } from './tournamentModels/CreateTournamentBody';
import { Tournament } from './tournamentModels/Tournament';
import { TournamentParticipant } from './tournamentModels/TournamentParticipant';
import { TournamentMatches } from './tournamentModels/TournamentMatches';
import { TournamentMatchResult } from './tournamentModels/TournamentMatchResult';
import { generateGameId } from '../pong/PongMmUtils';
import { tournamentNotificationManager } from './TournamentNotificationManager';

export class tournamentManager {
  private db: sqlite3.Database;

  constructor(db: sqlite3.Database) {
    this.db = db;
  }

  async getAvailableTournamentsFromDb(db: sqlite3.Database): Promise<Tournament[]> {
    return new Promise((resolve, reject) => {
      db.all("SELECT * FROM tournament ORDER BY id DESC", [], (err: any, rows: any[]) => {
        if (err) return reject(err);
        resolve(rows as Tournament[]);
      });
    });
  }

  async getTournamentStatusFromDb(db: sqlite3.Database, tournamentId: number): Promise<Tournament | undefined> {
    return new Promise((resolve, reject) => {
      db.get("SELECT * FROM tournament WHERE id = ?", [tournamentId], (err: any, row: any) => {
        if (err) return reject(err);
        resolve(row as Tournament | undefined);
      });
    });
  }

  async getTournamentParticipantsFromDb(db: sqlite3.Database, tournamentId: number): Promise<TournamentParticipant[]> {
    return new Promise((resolve, reject) => {
      db.all(
        "SELECT id as participantId, user_id as userId, displayname, guest FROM tournament_participant WHERE tournament_id = ?",
        [tournamentId],
        (err: any, rows: any[]) => {
          if (err) return reject(err);
          const mapped = (rows || []).map((r: any) => ({
            displayname: r.displayname,
            userId: r.userId !== undefined && r.userId !== null ? Number(r.userId) : null,
            guest: Boolean(r.guest),
            participantId: Number(r.participantId)
          })) as any as TournamentParticipant[];
          resolve(mapped);
        }
      );
    });
  }

  async getTournamentMatchesFromDb(db: sqlite3.Database, tournamentId: number): Promise<TournamentMatches[]> {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT
          tm.id as id,
          tm.tournament_id as tournamentId,
          tm.round as round,
          tm.id as matchNumber,
          tm.player1_id as player1Id,
          COALESCE(u1.displayName, tm.player1_name) as player1DisplayName,
          tm.player2_id as player2Id,
          COALESCE(u2.displayName, tm.player2_name) as player2DisplayName,
          tm.winner_id as winnerId,
          tm.player1_score as player1Score,
          tm.player2_score as player2Score,
          tm.status as status,
          tm.game_id as gameId,
          tm.player1_participant_id as player1ParticipantId,
          tm.player2_participant_id as player2ParticipantId
        FROM tournament_match tm
        LEFT JOIN user u1 ON tm.player1_id = u1.id
        LEFT JOIN user u2 ON tm.player2_id = u2.id
        WHERE tm.tournament_id = ?
        ORDER BY tm.round ASC, tm.id ASC`,
        [tournamentId],
        (err: any, rows: any[]) => {
          if (err) return reject(err);
          resolve(rows as any as TournamentMatches[]);
        }
      );
    });
  }

  async getTournamentMatchResultFromDb(db: sqlite3.Database, tournamentId: number, matchId: number): Promise<TournamentMatchResult | undefined> {
    return new Promise((resolve, reject) => {
      db.get(
        "SELECT player1_id, player2_id, player1_score, player2_score, winner_id, round FROM tournament_match WHERE tournament_id = ? AND id = ?",
        [tournamentId, matchId],
        (err: any, row: any) => {
          if (err) return reject(err);
          resolve(row as TournamentMatchResult | undefined);
        }
      );
    });
  }

  async createTournamentFromDb(db: sqlite3.Database, body: CreateTournamentBody): Promise<any> {
    const { name, start_time, creator_id } = body;
    return new Promise((resolve, reject) => {
      db.get("SELECT * FROM tournament WHERE creator_id = ? AND  status  IN ('pending', 'started')", [creator_id], (err: any, row: any) => {
        if (err) return reject(err);
        if (row) return reject(new Error("You already have an active tournament."));
        db.run(
          "INSERT INTO tournament (name, start_time, status, creator_id) VALUES (?, ?, ?, ?)",
          [name, start_time, 'pending', creator_id],
          function (this: any, err: any) {
            if (err) return reject(err);
            resolve({ id: this.lastID, name, start_time, status: 'pending', creator_id });
          }
        );
      });
    });
  }

  async joinTournamentFromDb(db: sqlite3.Database, tournamentId: number, body: JoinTournamentBody): Promise<any> {
    const { userId, displayname, guest } = body;
    return new Promise((resolve, reject) => {
      db.get("SELECT id FROM tournament WHERE id = ?", [tournamentId], (err: any, tournament: any) => {
        if (err) return reject(err);
        if (!tournament) return reject(new Error("Tournament does not exist"));
        const guestFlag = guest ? 1 : 0;
        const guestToken = guest ? generateGuestToken() : null;
        db.run(
          "INSERT INTO tournament_participant (tournament_id, user_id, displayname, guest, guest_token) VALUES (?, ?, ?, ?, ?)",
          [tournamentId, userId ?? null, displayname, guestFlag, guestToken],
          function (this: any, err: any) {
            if (err) return reject(err);
            resolve({ success: true, participantId: this.lastID, guestToken });
          }
        );
      });
    });
  }

  async leaveTournamentFromDb(db: sqlite3.Database, tournamentId: number, body: { userId?: number, displayname?: string }): Promise<any> {
    return new Promise((resolve, reject) => {
      let query = "DELETE FROM tournament_participant WHERE tournament_id = ";
      query += "?";
      const params: any[] = [tournamentId];

      if (body.userId) {
        query += " AND user_id = ?";
        params.push(body.userId);
      } else if (body.displayname) {
        query += " AND displayname = ?";
        params.push(body.displayname);
      } else {
        return reject(new Error("User identification required"));
      }

      db.run(query, params, function (this: any, err: any) {
        if (err) return reject(err);
        if (this.changes === 0) return resolve({ success: false, message: "No participant found or tournament does not exist"});
        resolve({ success: true });
      });
    });
  }

  randomizePlayers<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  async startTournamentFromDb(db: sqlite3.Database, tournamentId: number, body: { creatorId: number }): Promise<any> {
    const tournament = await new Promise<Tournament | undefined>((resolve, reject) => {
      db.get("SELECT * FROM tournament WHERE id = ? AND creator_id = ?", [tournamentId, body.creatorId], (err: any, row: any) => {
        if (err) return reject(err);
        resolve(row as Tournament | undefined);
      });
    });
    if (!tournament) throw new Error("Tournament not found or unauthorized");

    const participants = await this.getTournamentParticipantsFromDb(db, tournamentId) as any as Array<{ participantId: number, displayname: string, userId: number | null, guest?: boolean }>;
    if (participants.length < 2) throw new Error("Not enough players to start the tournament");

    const randomized = this.randomizePlayers(participants);

    const runAsync = (sql: string, params: any[]) => new Promise<void>((resolve, reject) => {
      db.run(sql, params, (err: any) => {
        if (err) return reject(err);
        resolve();
      });
    });

    for (let i = 0; i < randomized.length; i += 2) {
      const gameId = generateGameId();
      if (i + 1 < randomized.length) {
        await runAsync(
          "INSERT INTO tournament_match (tournament_id, player1_id, player2_id, player1_participant_id, player2_participant_id, player1_name, player2_name, round, game_id) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)",
          [
            tournamentId,
            randomized[i].userId ?? null,
            randomized[i + 1].userId ?? null,
            randomized[i].participantId,
            randomized[i + 1].participantId,
            randomized[i].displayname,
            randomized[i + 1].displayname,
            gameId
          ]
        );
      } else {
        await runAsync(
          "INSERT INTO tournament_match (tournament_id, player1_id, player2_id, player1_participant_id, player2_participant_id, player1_name, player2_name, round, winner_id, winner_participant_id, game_id) VALUES (?, ?, NULL, ?, NULL, ?, NULL, 1, ?, ?, ?)",
          [
            tournamentId,
            randomized[i].userId ?? null,
            randomized[i].participantId,
            randomized[i].displayname,
            randomized[i].userId ?? null,
            randomized[i].participantId,
            gameId
          ]
        );
      }
    }

    return new Promise((resolve, reject) => {
      db.run("UPDATE tournament SET status = 'started' WHERE id = ?", [tournamentId], function (this: any, err: any) {
        if (err) return reject(err);
        tournamentNotificationManager.notifyTournamentStart(tournamentId.toString());
        resolve({ success: true });
      });
    });
  }

  async finishTournamentFromDb(db: sqlite3.Database, tournamentId: number, creatorId?: number): Promise<any> {
    return new Promise((resolve, reject) => {
      db.get("SELECT * FROM tournament WHERE id = ?", [tournamentId], (err: any, tournament: any) => {
        if (err) return reject(err);
        if (!tournament) return reject(new Error("Tournament not found"));

        const t = tournament as Tournament;

        if (creatorId) {
          if (t.creator_id !== creatorId) return reject(new Error("Unauthorized: Only the creator can cancel the tournament"));
          if (t.status === 'finished') return reject(new Error("Tournament already finished, cannot be cancelled"));

          db.run("UPDATE tournament SET status = 'cancelled' WHERE id = ?", [tournamentId], function (this: any, err: any) {
            if (err) return reject(err);
            resolve({ success: true, status: 'cancelled' });
          });
          return;
        }

        db.all("SELECT * FROM tournament_match WHERE tournament_id = ? AND (winner_id IS NULL AND winner_participant_id IS NULL)", [tournamentId], (err: any, matches: any[]) => {
          if (err) return reject(err);
          if (matches.length > 0) return resolve({ success: false, message: "Tournament not finished yet" });

          db.run("UPDATE tournament SET status = 'finished' WHERE id = ?", [tournamentId], function (this: any, err: any) {
            if (err) return reject(err);
            resolve({ success: true, status: 'finished' });
          });
        });
      });
    });
  }

  async checkRoundComplete(db: sqlite3.Database, tournamentId: number, round: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      db.get(
        "SELECT COUNT(*) as incomplete FROM tournament_match WHERE tournament_id = ? AND round = ? AND (winner_id IS NULL AND winner_participant_id IS NULL)",
        [tournamentId, round],
        (err, row: any) => {
          if (err) return reject(err);
          resolve(row.incomplete === 0);
        }
      );
    });
  }

  async generateNextRound(db: sqlite3.Database, tournamentId: number, currentRound: number): Promise<any> {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT
          winner_id,
          winner_participant_id,
          COALESCE(u.displayName, tp.displayname) as winner_name
        FROM tournament_match tm
        LEFT JOIN user u ON tm.winner_id = u.id
        LEFT JOIN tournament_participant tp ON tm.winner_participant_id = tp.id
        WHERE tm.tournament_id = ? AND tm.round = ? AND (tm.winner_id IS NOT NULL OR tm.winner_participant_id IS NOT NULL)`,
        [tournamentId, currentRound],
        (err, winners: any[]) => {
          if (err) return reject(err);

          if (winners.length <= 1) {
            return resolve({ tournamentComplete: true, winner: winners[0]?.winner_id || null, winnerParticipantId: winners[0]?.winner_participant_id || null, winnerName: winners[0]?.winner_name || 'Winner' });
          }

          const shuffledWinners = this.randomizePlayers(winners.map(w => ({ userId: w.winner_id ?? null, participantId: w.winner_participant_id ?? null, name: w.winner_name })));

          for (let i = 0; i < shuffledWinners.length; i += 2) {
            const gameId = generateGameId();
            if (i + 1 < shuffledWinners.length) {
              db.run(
                "INSERT INTO tournament_match (tournament_id, player1_id, player2_id, player1_participant_id, player2_participant_id, player1_name, player2_name, round, game_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                  tournamentId,
                  shuffledWinners[i].userId,
                  shuffledWinners[i + 1].userId,
                  shuffledWinners[i].participantId,
                  shuffledWinners[i + 1].participantId,
                  shuffledWinners[i].name,
                  shuffledWinners[i + 1].name,
                  currentRound + 1,
                  gameId
                ]
              );
            } else {
              db.run(
                "INSERT INTO tournament_match (tournament_id, player1_id, player2_id, player1_participant_id, player2_participant_id, player1_name, player2_name, round, winner_id, winner_participant_id, game_id) VALUES (?, ?, NULL, ?, NULL, ?, NULL, ?, ?, ?, ?)",
                [
                  tournamentId,
                  shuffledWinners[i].userId,
                  shuffledWinners[i].participantId,
                  shuffledWinners[i].name,
                  currentRound + 1,
                  shuffledWinners[i].userId,
                  shuffledWinners[i].participantId,
                  gameId
                ]
              );
            }
          }
          resolve({ tournamentComplete: false, nextRound: currentRound + 1 });
        }
      );
    });
  }

  async getMatchGameIdFromDb(db: sqlite3.Database, tournamentId: number, matchId: number): Promise<any> {
    return new Promise((resolve, reject) => {
      db.get(
        "SELECT game_id FROM tournament_match WHERE tournament_id = ? AND id = ?",
        [tournamentId, matchId],
        (err: any, row: any) => {
          if (err) return reject(err);
          if (!row) return reject(new Error("Match not found"));
          resolve({ game_id: row.game_id });
        }
      );
    });
  }

  async updateMatchResult(db: sqlite3.Database, matchId: number, winnerId: number, player1Score: number, player2Score: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const isGuestWinner = typeof winnerId === 'number' && winnerId < 0;
      const winnerParticipantId = isGuestWinner ? -winnerId : null;
      const winnerUserId = !isGuestWinner ? winnerId : null;

      db.run(
        "UPDATE tournament_match SET winner_id = COALESCE(?, winner_id), winner_participant_id = COALESCE(?, winner_participant_id), player1_score = ?, player2_score = ? WHERE id = ?",
        [winnerUserId, winnerParticipantId, player1Score, player2Score, matchId],
        async (err: any) => {
          if (err) return reject(err);
          db.get(
            "SELECT tournament_id, round FROM tournament_match WHERE id = ?",
            [matchId],
            async (err: any, match: any) => {
              if (err) return reject(err);

              const roundComplete = await this.checkRoundComplete(db, match.tournament_id, match.round);
              if (roundComplete) {
                const nextRoundResult = await this.generateNextRound(db, match.tournament_id, match.round);
                if (nextRoundResult.tournamentComplete) {
                  if (nextRoundResult.winner) {
                    db.run(
                      "UPDATE tournament SET status = 'finished', winner_id = ?, winner_displayname = (SELECT displayName FROM user WHERE id = ?) WHERE id = ?",
                      [nextRoundResult.winner, nextRoundResult.winner, match.tournament_id],
                      (err: any) => {
                        if (err) return reject(err);
                        tournamentNotificationManager.notifyTournamentComplete(
                          match.tournament_id.toString(),
                          nextRoundResult.winner,
                          nextRoundResult.winnerName || 'Winner'
                        );
                        resolve({ success: true, tournamentComplete: true, winner: nextRoundResult.winner });
                      }
                    );
                  } else {
                    db.run(
                      "UPDATE tournament SET status = 'finished', winner_id = NULL, winner_displayname = ? WHERE id = ?",
                      [nextRoundResult.winnerName || 'Winner', match.tournament_id],
                      (err: any) => {
                        if (err) return reject(err);
                        tournamentNotificationManager.notifyTournamentComplete(
                          match.tournament_id.toString(),
                          0,
                          nextRoundResult.winnerName || 'Winner'
                        );
                        resolve({ success: true, tournamentComplete: true });
                      }
                    );
                  }
                } else {
                  tournamentNotificationManager.notifyRoundComplete(
                    match.tournament_id.toString(),
                    nextRoundResult.nextRound
                  );
                  await this.notifyPlayersOfNextMatches(db, match.tournament_id, nextRoundResult.nextRound);
                  resolve({ success: true, roundComplete: true, nextRound: nextRoundResult.nextRound });
                }
              } else {
                resolve({ success: true, roundComplete: false });
              }
            }
          );
        }
      );
    });
  }

  async notifyPlayersOfNextMatches(db: sqlite3.Database, tournamentId: number, round: number) {
    return new Promise((resolve, reject) => {
      db.all(
        "SELECT tm.id as matchId, tm.game_id, tm.player1_id, tm.player2_id, u1.displayName as player1Name, u2.displayName as player2Name FROM tournament_match tm LEFT JOIN user u1 ON tm.player1_id = u1.id LEFT JOIN user u2 ON tm.player2_id = u2.id WHERE tm.tournament_id = ? AND tm.round = ? AND (tm.winner_id IS NULL AND tm.winner_participant_id IS NULL)",
        [tournamentId, round],
        (err: any, matches: any[]) => {
          if (err) return reject(err);
          for (const match of matches) {
            if (match.player1_id && match.player2_id) {
              tournamentNotificationManager.notifyNextMatch(
                tournamentId.toString(),
                match.player1_id,
                match.matchId,
                match.game_id,
                match.player2Name || "Unknown"
              );
              tournamentNotificationManager.notifyNextMatch(
                tournamentId.toString(),
                match.player2_id,
                match.matchId,
                match.game_id,
                match.player1Name || "Unknown"
              );
            }
          }
          resolve(matches);
        }
      );
    });
  }
}

function generateGuestToken(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}
