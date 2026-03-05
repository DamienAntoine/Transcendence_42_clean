export class TournamentNotificationManager {
	private tournamentSubscriptions = new Map<string, Map<number, any>>();

	addUserToTournament(tournamentId: string, userId: number, socket: any) {
		if (!this.tournamentSubscriptions.has(tournamentId)) {
			this.tournamentSubscriptions.set(tournamentId, new Map());
		}
		this.tournamentSubscriptions.get(tournamentId)!.set(userId, socket);
	}

	removeUserFromTournament(tournamentId: string, userId: number) {
		const tournament = this.tournamentSubscriptions.get(tournamentId);
		if (tournament) {
			tournament.delete(userId);
			if (tournament.size === 0) {
				this.tournamentSubscriptions.delete(tournamentId);
			}
		}
	}

	notifyTournamentStart(tournamentId: string) {
		this.broadcastToTournament(tournamentId, {
			type: 'TOURNAMENT_STARTED',
			message: 'The tournament has started! Check your matches.',
			tournamentId
		});
	}

	notifyNextMatch(tournamentId: string, userId: number, matchId: number, gameId: string, opponentName: string) {
		const tournament = this.tournamentSubscriptions.get(tournamentId);
		if (tournament && tournament.has(userId)) {
			const socket = tournament.get(userId);
			socket.send(JSON.stringify({
				type: 'NEXT_MATCH_READY',
				message: `Your next match is ready! You will play against ${opponentName}`,
				tournamentId,
				matchId,
				gameId,
				opponentName
			}));
		}
	}

	notifyRoundComplete(tournamentId: string, nextRound: number) {
		this.broadcastToTournament(tournamentId, {
			type: 'ROUND_COMPLETE',
			message: `Round completed! Round ${nextRound} is starting.`,
			tournamentId,
			nextRound
		});
	}

	notifyTournamentComplete(tournamentId: string, winnerId: number, winnerName: string) {
		this.broadcastToTournament(tournamentId, {
			type: 'TOURNAMENT_COMPLETE',
			message: `Tournament finished! Winner: ${winnerName}`,
			tournamentId,
			winnerId,
			winnerName
		});
	}

	private broadcastToTournament(tournamentId: string, message: any) {
		const tournament = this.tournamentSubscriptions.get(tournamentId);
		if (tournament) {
			for (const socket of tournament.values()) {
				socket.send(JSON.stringify(message));
			}
		}
	}
}

export const tournamentNotificationManager = new TournamentNotificationManager();
