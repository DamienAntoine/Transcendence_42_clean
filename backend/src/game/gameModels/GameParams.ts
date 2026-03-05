export interface GameParams {
	id: number;
	player1Id: number;
	player2Id: number;
	player1Score: number;
	player2Score: number;
	status: 'waiting' | 'playing' | 'finished';
	winnerId: number;
}
