import { z } from 'zod';
import { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';

/**
 * Realiza o parse dos dados do Radis para uma estrutura Map
 * @param optionsArray
 * @returns
 */
function parseRedisOptionsRank(optionsArray: string[]): Map<string, number> {
	const optionsMap = new Map<string, number>();
	for (let i: number = 0; i < optionsArray.length; i += 2) {
		optionsMap.set(optionsArray[i], Number(optionsArray[i + 1]));
	}

	return optionsMap;
}

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

		if (!poll) {
			return reply.status(404).send({ message: 'Poll not found' });
		}

		// Pegando todas as opções

		const result = await redis.zrange(pollID, 0, -1, 'WITHSCORES');
		const contagem = parseRedisOptionsRank(result);
		return reply.send({
			id: poll.id,
			title: poll.title,
			options: poll.options.map(({ id, title }) => {
				return {
					id,
					title,
					total: contagem.get(id) ?? 0,
				};
			}),
		});
	});
}
