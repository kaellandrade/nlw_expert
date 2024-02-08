import { z } from 'zod';
import { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma';

/**
 * Cadastra uma nova enquete
 * @param app
 */
export async function getPoll(app: FastifyInstance) {
	app.get('/polls/:pollID', async (request, reply) => {
		const getPollParams = z.object({
			pollID: z.string(),
		});

		const { pollID } = getPollParams.parse(request.params);

		const poll = await prisma.poll.findFirst({
			where: {
				id: pollID,
			},
			include: {
				options: {
					select: {
						id: true,
						title: true,
					},
				},
			},
		});

		return reply.send({ poll });
	});
}
