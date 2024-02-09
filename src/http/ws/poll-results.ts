import { z } from 'zod';
import { FastifyInstance } from 'fastify';
import { voting } from '../../utils/volting-pub-sub';

export async function pollResults(app: FastifyInstance) {
	app.get(
		'/polls/:pollId/results',
		{ websocket: true },
		(connection, request) => {
			connection.socket.on('message', () => {
				const getPollParams = z.object({
					pollId: z.string(),
				});

				const { pollId } = getPollParams.parse(request.params);

				// Inscrever apenas nas mensagens publicadas no canal com o ID da enquete (pollID)
				voting.subscribe(pollId, (message) => {
					connection.socket.send(JSON.stringify(message));
				});
			});
		}
	);
}
