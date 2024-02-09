import { z } from 'zod';
import { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import { voting } from '../../utils/volting-pub-sub';

/**
 * Cadastra uma nova enquete
 * @param app
 */
export async function voteOnPoll(app: FastifyInstance) {
	app.post('/polls/:pollId/votes', async (request, reply) => {
		const voteOnPollBody = z.object({
			pollOptionId: z.string().uuid(),
		});
		const voteOnPollParams = z.object({
			pollId: z.string().uuid(),
		});

		const { pollOptionId } = voteOnPollBody.parse(request.body);
		const { pollId } = voteOnPollParams.parse(request.params);

		let { sessionId } = request.cookies;

		if (sessionId) {
			const userPreviusVoteOnPoll = await prisma.vote.findUnique({
				where: {
					sessionId_pollId: {
						sessionId,
						pollId,
					},
				},
			});

			// Usuário está atualizando o voto.
			if (
				userPreviusVoteOnPoll &&
				userPreviusVoteOnPoll.pollOptionId !== pollOptionId
			) {
				await prisma.vote.delete({
					where: {
						id: userPreviusVoteOnPoll.id,
					},
				});
				// Decrese score
				await redis.zincrby(pollId, -1, userPreviusVoteOnPoll.pollOptionId);
				const votes = await redis.zincrby(pollId, 1, pollOptionId);

				voting.publish(pollId, {
					pollOptionId: userPreviusVoteOnPoll.pollOptionId,
					votes: Number(votes),
				});
			} else if (userPreviusVoteOnPoll) {
				return reply
					.status(400)
					.send({ messagem: 'You already voteded on this poll' });
			}
		}

		if (!sessionId) {
			sessionId = randomUUID();

			reply.setCookie('sessionId', sessionId, {
				path: '/',
				maxAge: 60 * 60 * 24 * 30, // 30 dias
				signed: true,
				httpOnly: true,
			});
		}

		await prisma.vote.create({
			data: {
				sessionId,
				pollId,
				pollOptionId,
			},
		});

		// Incrementing the ranking of an option within a poll by one
		const votes = await redis.zincrby(pollId, 1, pollOptionId);

		voting.publish(pollId, {
			pollOptionId,
			votes: Number(votes),
		});

		return reply.status(201).send();
	});
}
