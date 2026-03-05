-to compile everything, just type "docker-compose up --build"

-keep chat websocket open for online / offline status to be accurate
-use routes /chat/friends/list and /chat/friends/status for friendslist and status
-direct messages work even when sending messages to offline users
-use JWT


-/user/:id/gamehistory to display match history in user profiles
-/user/:id to get user infos to display user profiles
-display default image if avatar is NULL

-when users login : use /user/login route. It will return require2fa: true if 2fa is enabled for this user.
	if 2fa is enabled, it will automatically send the user a one time code by email,
	send a form to the user to send the one time code and send it to /user/login2fa

-for game invites through chat, send a websocket message containing :
	type: "INVITE_PONG"
	to: peer id
	gameoptions
	(see wsChatRoutes.ts)
Websocket sends the message to the other user
then display accept / refuse button,
use /pong/generateGameId to create match id
use match id to create the game with /ws/pong/:gameid
