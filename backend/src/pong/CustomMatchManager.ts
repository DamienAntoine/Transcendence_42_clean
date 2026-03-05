import { CustomMatchInvitation, CustomMatchSettings } from './PongTypes';
import { v4 as uuidv4 } from 'uuid';

export class CustomMatchManager {
	private invitations: Map<string, CustomMatchInvitation> = new Map();
	private userInvitations: Map<number, string[]> = new Map(); 
	private hostInvitations: Map<number, string[]> = new Map(); 

	createInvitation(
		hostId: number,
		hostName: string,
		guestId: number,
		settings: CustomMatchSettings
	): CustomMatchInvitation {
		const invitation: CustomMatchInvitation = {
			invitationId: uuidv4(),
			hostId,
			hostName,
			guestId,
			settings,
			status: 'pending',
			createdAt: Date.now(),
		};

		this.invitations.set(invitation.invitationId, invitation);

		
		if (!this.userInvitations.has(guestId)) {
			this.userInvitations.set(guestId, []);
		}
		this.userInvitations.get(guestId)!.push(invitation.invitationId);

		
		if (!this.hostInvitations.has(hostId)) {
			this.hostInvitations.set(hostId, []);
		}
		this.hostInvitations.get(hostId)!.push(invitation.invitationId);

		console.log(`✅ Invitation created: ${invitation.invitationId} from ${hostId} to ${guestId}`);
		console.log(`📋 User ${guestId} now has invitations:`, this.userInvitations.get(guestId));
		console.log(`📤 Host ${hostId} sent invitations:`, this.hostInvitations.get(hostId));

		
		setTimeout(() => {
			const inv = this.invitations.get(invitation.invitationId);
			if (inv && inv.status === 'pending') {
				inv.status = 'expired';
				console.log(`⏰ Invitation ${invitation.invitationId} expired`);
			}
		}, 120000);

		return invitation;
	}

	acceptInvitation(invitationId: string): CustomMatchInvitation | null {
		const invitation = this.invitations.get(invitationId);
		if (!invitation || invitation.status !== 'pending') {
			return null;
		}

		invitation.status = 'accepted';
		return invitation;
	}

	rejectInvitation(invitationId: string): boolean {
		const invitation = this.invitations.get(invitationId);
		if (!invitation || invitation.status !== 'pending') {
			return false;
		}

		invitation.status = 'rejected';
		return true;
	}

	getInvitation(invitationId: string): CustomMatchInvitation | undefined {
		return this.invitations.get(invitationId);
	}

	getUserInvitations(userId: number): CustomMatchInvitation[] {
		const invitationIds = this.userInvitations.get(userId) || [];
		console.log(`🔍 Getting invitations for user ${userId}:`, invitationIds);

		const invitations = invitationIds
			.map((id) => this.invitations.get(id))
			.filter((inv) => inv && inv.status === 'pending') as CustomMatchInvitation[];

		console.log(`📬 Returning ${invitations.length} pending invitations for user ${userId}`);
		return invitations;
	}

	
	getHostAcceptedInvitations(hostId: number): CustomMatchInvitation[] {
		const invitationIds = this.hostInvitations.get(hostId) || [];
		console.log(`🔍 Getting host invitations for user ${hostId}:`, invitationIds);

		const invitations = invitationIds
			.map((id) => this.invitations.get(id))
			.filter((inv) => inv && inv.status === 'accepted') as CustomMatchInvitation[];

		console.log(`✅ Returning ${invitations.length} accepted invitations for host ${hostId}`);
		return invitations;
	}

	removeInvitation(invitationId: string): void {
		const invitation = this.invitations.get(invitationId);
		if (invitation) {
			
			const userInvs = this.userInvitations.get(invitation.guestId);
			if (userInvs) {
				const index = userInvs.indexOf(invitationId);
				if (index > -1) {
					userInvs.splice(index, 1);
				}
			}
		}
		this.invitations.delete(invitationId);
	}
}
