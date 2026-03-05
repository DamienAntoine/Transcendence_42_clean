import { FastifyInstance } from 'fastify';
import { CustomMatchManager } from './CustomMatchManager';
import { CustomMatchSettings } from './PongTypes';
import { getUserIdFromRequest } from '../services/Auth';
import { UserManager } from '../users/services/UserManager';

export function registerCustomMatchRoutes(
	app: FastifyInstance,
	customMatchManager: CustomMatchManager,
	db: any
) {
	const userManager = new UserManager(db);

	
	app.post<{
		Body: { guestId: number; settings: CustomMatchSettings };
	}>('/pong/custom/invite', async (req, reply) => {
		const userId = getUserIdFromRequest(req);
		if (!userId) {
			console.log('❌ Unauthorized invitation attempt');
			return reply.status(401).send({ error: 'Unauthorized' });
		}

		const { guestId, settings } = req.body;

		console.log(`📨 Invitation request from user ${userId} to user ${guestId}`);
		console.log(`⚙️ Settings:`, settings);

		if (!guestId || !settings) {
			return reply.status(400).send({ error: 'Missing required fields' });
		}

		if (guestId === userId) {
			return reply.status(400).send({ error: 'Cannot invite yourself' });
		}

		
		let hostName = `User ${userId}`;
		try {
			const user = await userManager.getUserFromDb(db, userId);
			hostName = user.displayName;
			console.log(`👤 Host name: ${hostName}`);
		} catch (error) {
			console.error('Failed to get user from DB:', error);
		}

		const invitation = customMatchManager.createInvitation(
			userId,
			hostName,
			guestId,
			settings
		);

		console.log(`✅ Invitation created and sent:`, invitation);

		return reply.send({ invitation });
	});

	
	app.post<{
		Params: { invitationId: string };
	}>('/pong/custom/accept/:invitationId', async (req, reply) => {
		const userId = getUserIdFromRequest(req);
		if (!userId) {
			return reply.status(401).send({ error: 'Unauthorized' });
		}

		const { invitationId } = req.params;

		const invitation = customMatchManager.acceptInvitation(invitationId);
		if (!invitation) {
			return reply.status(404).send({ error: 'Invitation not found or expired' });
		}

		if (invitation.guestId !== userId) {
			return reply.status(403).send({ error: 'Not your invitation' });
		}

		
		const matchId = `custom-${invitationId}`;

		
		

		return reply.send({
			matchId,
			message: 'Match created',
			invitation,
		});
	});

	
	app.post<{
		Params: { invitationId: string };
	}>('/pong/custom/reject/:invitationId', async (req, reply) => {
		const userId = getUserIdFromRequest(req);
		if (!userId) {
			return reply.status(401).send({ error: 'Unauthorized' });
		}

		const { invitationId } = req.params;

		const invitation = customMatchManager.getInvitation(invitationId);
		if (!invitation) {
			return reply.status(404).send({ error: 'Invitation not found' });
		}

		if (invitation.guestId !== userId) {
			return reply.status(403).send({ error: 'Not your invitation' });
		}

		const success = customMatchManager.rejectInvitation(invitationId);
		if (!success) {
			return reply.status(400).send({ error: 'Could not reject invitation' });
		}

		return reply.send({ message: 'Invitation rejected' });
	});

	
	app.get('/pong/custom/invitations', async (req, reply) => {
		const userId = getUserIdFromRequest(req);
		if (!userId) {
			console.log('❌ Unauthorized invitations request');
			return reply.status(401).send({ error: 'Unauthorized' });
		}

		console.log(`📥 User ${userId} requesting invitations`);
		const invitations = customMatchManager.getUserInvitations(userId);
		console.log(`📤 Sending ${invitations.length} invitations to user ${userId}`);

		return reply.send({ invitations });
	});

	
	app.get('/pong/custom/invitations/accepted', async (req, reply) => {
		const userId = getUserIdFromRequest(req);
		if (!userId) {
			console.log('❌ Unauthorized accepted invitations request');
			return reply.status(401).send({ error: 'Unauthorized' });
		}

		console.log(`📥 Host ${userId} requesting accepted invitations`);
		const invitations = customMatchManager.getHostAcceptedInvitations(userId);
		console.log(`📤 Sending ${invitations.length} accepted invitations to host ${userId}`);

		return reply.send({ invitations });
	});
}
