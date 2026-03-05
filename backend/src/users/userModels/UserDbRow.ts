export interface UserDbRow {
	id: number;
	userName: string;
	displayName: string;
	password: string;
	email: string;
	avatar?: string;
	elo: number;
	is2faEnabled: boolean;
}
